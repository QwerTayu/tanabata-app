// firestore.rules のテスト。`npm run test:rules` で Firestore エミュレータを起動して実行する。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

// lib/tanzaku.ts をそのまま読み込み、Firebase の初期化(lib/firebase/client.ts)だけをテスト用の db に差し替える
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./firebase/client" && context.parentURL?.endsWith("/lib/tanzaku.ts")) {
      return nextResolve(new URL("./firebase-client-stub.mjs", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { setDb } = await import("./firebase-client-stub.mjs");
const { createTanzaku, LimitReachedError } = await import("../lib/tanzaku.ts");

const PROJECT_ID = "demo-tanabata";
const ROOM_ID = "123456";
const ALICE = "alice";
const BOB = "bob";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "rooms", ROOM_ID), {
      createdAt: serverTimestamp(),
      revealed: false,
      maxTanzakuPerUser: 2,
      maxLikesPerTanzaku: 2,
    });
  });
});

function dbAs(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function tanzakuData(uid) {
  return {
    wish: "テスト",
    handle: "",
    color: "red",
    authorUid: uid,
    likeCount: 0,
    createdAt: serverTimestamp(),
  };
}

// lib/tanzaku.ts の createTanzaku と同じ書き込み(カウンタ+1と短冊作成)を1回のバッチで行う。
// ルールの評価はバッチでもトランザクションでも同じ
function postBatch(db, uid, nextCount, tanzakuIds) {
  const batch = writeBatch(db);
  batch.set(doc(db, "rooms", ROOM_ID, "authorCounters", uid), { tanzakuCount: nextCount });
  for (const id of tanzakuIds) {
    batch.set(doc(db, "rooms", ROOM_ID, "tanzaku", id), tanzakuData(uid));
  }
  return batch.commit();
}

describe("短冊の作成", () => {
  test("カウンタ+1と `{uid}__{カウンタ値}` の短冊1件は作れる", async () => {
    const db = dbAs(ALICE);
    await assertSucceeds(postBatch(db, ALICE, 1, [`${ALICE}__1`]));
    await assertSucceeds(postBatch(db, ALICE, 2, [`${ALICE}__2`]));
  });

  test("上限を超える投稿は拒否される", async () => {
    const db = dbAs(ALICE);
    await assertSucceeds(postBatch(db, ALICE, 1, [`${ALICE}__1`]));
    await assertSucceeds(postBatch(db, ALICE, 2, [`${ALICE}__2`]));
    await assertFails(postBatch(db, ALICE, 3, [`${ALICE}__3`]));
  });

  test("1回のバッチでカウンタ+1と短冊2件を作ることはできない", async () => {
    const db = dbAs(ALICE);
    await assertFails(postBatch(db, ALICE, 1, [`${ALICE}__1`, `${ALICE}__2`]));
    await assertFails(
      postBatch(db, ALICE, 1, [`${ALICE}__1`, doc(collection(db, "rooms", ROOM_ID, "tanzaku")).id]),
    );
  });

  test("IDがカウンタ値と合わない短冊は作れない", async () => {
    const db = dbAs(ALICE);
    await assertFails(postBatch(db, ALICE, 1, [`${ALICE}__2`]));
    await assertFails(postBatch(db, ALICE, 1, [`${ALICE}__0`]));
    await assertFails(postBatch(db, ALICE, 1, [doc(collection(db, "rooms", ROOM_ID, "tanzaku")).id]));
  });

  test("他人のuidのIDでは作れない", async () => {
    await assertFails(postBatch(dbAs(ALICE), ALICE, 1, [`${BOB}__1`]));
  });

  test("カウンタを+1しない短冊単体の作成はできない", async () => {
    const db = dbAs(ALICE);
    await assertFails(setDoc(doc(db, "rooms", ROOM_ID, "tanzaku", `${ALICE}__1`), tanzakuData(ALICE)));
  });

  test("削除された短冊と同じIDで作り直すことはできない", async () => {
    const db = dbAs(ALICE);
    await assertSucceeds(postBatch(db, ALICE, 1, [`${ALICE}__1`]));
    await assertSucceeds(deleteDoc(doc(db, "rooms", ROOM_ID, "tanzaku", `${ALICE}__1`)));
    await assertFails(setDoc(doc(db, "rooms", ROOM_ID, "tanzaku", `${ALICE}__1`), tanzakuData(ALICE)));
    await assertFails(postBatch(db, ALICE, 2, [`${ALICE}__1`]));
    await assertSucceeds(postBatch(db, ALICE, 2, [`${ALICE}__2`]));
  });

  test("未ログインでは作れない", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "rooms", ROOM_ID, "tanzaku", "x__1"), tanzakuData("x")));
  });
});

describe("createTanzaku", () => {
  const input = { wish: "テスト", handle: "", color: "red", authorUid: ALICE };

  beforeEach(() => {
    setDb(dbAs(ALICE));
  });

  test("ルールを通り、`{uid}__{連番}` のIDを返す", async () => {
    assert.equal(await createTanzaku(ROOM_ID, input), `${ALICE}__1`);
    assert.equal(await createTanzaku(ROOM_ID, input), `${ALICE}__2`);
  });

  test("上限に達するとLimitReachedErrorを投げる", async () => {
    await createTanzaku(ROOM_ID, input);
    await createTanzaku(ROOM_ID, input);
    await assert.rejects(createTanzaku(ROOM_ID, input), LimitReachedError);
  });
});

// JS SDK は整数を必ず integerValue で送るので、double のカウンタは REST API で直接書き込む
describe("doubleのカウンタ", () => {
  // エミュレータは署名なしのIDトークンを受け付ける
  function mockIdToken(uid) {
    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    return `${encode({ alg: "none", typ: "JWT" })}.${encode({
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      aud: PROJECT_ID,
      sub: uid,
      user_id: uid,
      iat: now,
      exp: now + 3600,
      auth_time: now,
      firebase: { sign_in_provider: "anonymous", identities: {} },
    })}.`;
  }

  async function commitAs(uid, writes) {
    const base = `projects/${PROJECT_ID}/databases/(default)/documents`;
    const res = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/${base}:commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mockIdToken(uid)}` },
      body: JSON.stringify({
        writes: writes.map((w) => ({ ...w, update: { ...w.update, name: `${base}/${w.update.name}` } })),
      }),
    });
    return res.status;
  }

  test("カウンタをdoubleの1.0にして `{uid}__1.0` の短冊を作ることはできない", async () => {
    const status = await commitAs(ALICE, [
      {
        update: {
          name: `rooms/${ROOM_ID}/authorCounters/${ALICE}`,
          fields: { tanzakuCount: { doubleValue: 1 } },
        },
      },
      {
        update: {
          name: `rooms/${ROOM_ID}/tanzaku/${ALICE}__1.0`,
          fields: {
            wish: { stringValue: "テスト" },
            handle: { stringValue: "" },
            color: { stringValue: "red" },
            authorUid: { stringValue: ALICE },
            likeCount: { integerValue: "0" },
          },
        },
        updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }],
      },
    ]);
    assert.equal(status, 403);
  });
});

describe("いいね", () => {
  const TANZAKU_ID = `${ALICE}__1`;

  beforeEach(async () => {
    await postBatch(dbAs(ALICE), ALICE, 1, [TANZAKU_ID]);
  });

  function likeBatch(db, uid, nextCount) {
    const batch = writeBatch(db);
    batch.set(doc(db, "rooms", ROOM_ID, "tanzaku", TANZAKU_ID, "likedBy", uid), { count: nextCount });
    batch.update(doc(db, "rooms", ROOM_ID, "tanzaku", TANZAKU_ID), { likeCount: increment(1) });
    return batch.commit();
  }

  test("上限までいいねでき、超えると拒否される", async () => {
    const db = dbAs(BOB);
    await assertSucceeds(likeBatch(db, BOB, 1));
    await assertSucceeds(likeBatch(db, BOB, 2));
    await assertFails(likeBatch(db, BOB, 3));
  });

  test("likedByを+1しないlikeCountの更新はできない", async () => {
    const db = dbAs(BOB);
    const batch = writeBatch(db);
    batch.update(doc(db, "rooms", ROOM_ID, "tanzaku", TANZAKU_ID), { likeCount: increment(1) });
    await assertFails(batch.commit());
  });
});
