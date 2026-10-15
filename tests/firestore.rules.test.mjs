// firestore.rules のテスト。`npm run test:rules` で Firestore エミュレータを起動して実行する。
import { readFileSync } from "node:fs";
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

const ROOM_ID = "123456";
const ALICE = "alice";
const BOB = "bob";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-tanabata",
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
