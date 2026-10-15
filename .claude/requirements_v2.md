# 七夕オンライン短冊アプリ 要件定義 v2(セキュリティ強化)

`.claude/requirements.md`(初版・6時間実装版)に対する追加変更点。MTGでの実利用を経て「サークル外に公開する」ことになったため、性善説・localStorage頼みだった部分をサーバー側(Firestore)で強制する形に変更する。

## 背景

初版では以下がすべてクライアント側(localStorage)だけの性善説ベースだった。

- 投稿上限(1ルーム5個)・いいね上限(1短冊3回)はlocalStorageでカウントしているだけで、ブラウザの開発者ツールから値を書き換えれば普通に突破できる
- `authorClientId`はクライアントが好きな値を送れる(`crypto.randomUUID()`をlocalStorageに保存しているだけ)ため、なりすまし・偽装がしやすい
- Firestoreのセキュリティルールが`allow read, write: if true`で全開放

## 確定した方針

- **管理者権限(削除・公開トグル)は現行通りURL判定のみでよい**(`/{roomId}/admin`を知っていれば誰でも操作可、を維持。uidロックはしない)
- **投稿上限・いいね上限はどちらもFirestore側でハード強制する**。さらに、この上限値(マジックナンバー)自体を**管理者が画面から編集できる**ようにする(ルームごとに可変)

## 全体方針

1. **Firebase Anonymous Authentication を導入**してログイン画面なしで各ブラウザに`request.auth.uid`という偽装不能なIDを持たせる。現在localStorageで自前生成していた`clientId`をこの`uid`に置き換える(`authorClientId`は`authorUid`にリネーム)
2. **いいね上限**は`rooms/{roomId}/tanzaku/{tanzakuId}/likedBy/{uid}`という1ドキュメント(`{count: number}`)で管理し、そのドキュメント自身のcreate/updateルールだけで「+1ずつ・room設定値まで」を完結して強制する(他ドキュメントに依存しないので堅牢)
3. **投稿上限**は`rooms/{roomId}/authorCounters/{uid}`という1ドキュメント(`{tanzakuCount: number}`)をトランザクションで短冊作成と同時にインクリメントし、短冊作成ルール側でこのカウンタの値を`get()`してチェックする
4. **上限値自体**を`rooms/{roomId}`ドキュメントに`maxTanzakuPerUser`/`maxLikesPerTanzaku`として保存し、管理者画面から編集可能にする。ルール側もこの値を`get()`して動的にチェックする

### 既知の限界(正直に共有しておきたい点)

投稿上限(3番)は、"短冊ドキュメントの作成"と"カウンタのインクリメント"という**2つの別ドキュメントへの書き込みが伴う**ため、Firestoreルールだけでは「カウンタを一切更新せずに短冊だけ作り続ける」という迂回を完全には塞ぎきれない(意図的に生のFirestore SDKを叩いてくる相手には強くない)。一方、いいね上限(2番)は1ドキュメント自身のルールだけで完結するので迂回されない。

これは「ブラウザの開発者ツールでlocalStorageの値を書き換える」という今回問題視した攻撃は完全に防げるレベル。それ以上(Firestore SDKを直接操作する本格的な迂回)まで塞ぐには、投稿上限も決定的なドキュメントID(`tanzaku/{uid}__{連番}`)にする等さらに設計を変える必要があり、実装コストが跳ね上がる。今回はこの限界を許容し、シンプルな方(カウンタ方式)で進める想定。

## 変更内容

### 1. Firebase Console(手動作業)
- Authentication → Sign-in method → 「匿名」を有効化

### 2. `firestore.rules`(全面書き換え)
- `rooms/{roomId}`: read全許可。createは`revealed==false`かつ`maxTanzakuPerUser`/`maxLikesPerTanzaku`が正の整数であることを検証。updateは`revealed`/`maxTanzakuPerUser`/`maxLikesPerTanzaku`のみ変更可(admin判定はせず、現行通り誰でも可)。deleteは現行通り`true`
- `rooms/{roomId}/tanzaku/{tanzakuId}`: createは`request.auth != null`かつ`authorUid == request.auth.uid`、各フィールドのバリデーション、加えて`get(.../authorCounters/$(request.auth.uid)).data.tanzakuCount <= get(room).data.maxTanzakuPerUser`をチェック。updateは`likeCount`のみ`+1`。deleteは現行通り`true`
- `rooms/{roomId}/tanzaku/{tanzakuId}/likedBy/{uid}`: `request.auth.uid == uid`必須。createは`count==1`のみ許可。updateは`count == 直前の値+1`かつ`count <= get(room).data.maxLikesPerTanzaku`。deleteは`false`
- `rooms/{roomId}/authorCounters/{uid}`: `request.auth.uid == uid`必須。createは`tanzakuCount==1`のみ。updateは`tanzakuCount == 直前の値+1`かつ`<= get(room).data.maxTanzakuPerUser`。deleteは`false`

### 3. `lib/types.ts`
- `RoomDoc`に`maxTanzakuPerUser: number`・`maxLikesPerTanzaku: number`を追加
- `TanzakuDoc.authorClientId` → `authorUid`にリネーム

### 4. `lib/constants.ts`
- `MAX_TANZAKU_PER_ROOM_PER_USER` → `DEFAULT_MAX_TANZAKU_PER_ROOM_PER_USER`、`MAX_LIKES_PER_TANZAKU_PER_USER` → `DEFAULT_MAX_LIKES_PER_TANZAKU_PER_USER`にリネーム(ルーム作成時の初期値としてのみ使用。以後の実効上限は各ルームドキュメントの値)

### 5. `lib/firebase/client.ts`
- `export const auth = getAuth(app);` を追加

### 6. `lib/auth.ts`(新規)
- `subscribeAuthUid(cb: (uid: string | null) => void): () => void`: `onAuthStateChanged`を購読し、未サインインなら`signInAnonymously(auth)`を呼ぶ。既存の`getClientId()`(localStorage)を置き換える

### 7. `lib/localStorage.ts`
- `getClientId`・`getLikeCount`・`incrementLikeCount`・`getCreatedCount`・`incrementCreatedCount`を削除(Firestore側が真実の情報源になるため不要に)
- `getHandle`/`setHandle`/`getShowHandle`/`setShowHandle`は変更なし(これらは表示名の話で、上限強制とは別軸)

### 8. `lib/rooms.ts`
- `createRoom()`: `maxTanzakuPerUser: DEFAULT_MAX_TANZAKU_PER_ROOM_PER_USER`、`maxLikesPerTanzaku: DEFAULT_MAX_LIKES_PER_TANZAKU_PER_USER`を書き込む
- `updateRoomLimits(roomId, { maxTanzakuPerUser？, maxLikesPerTanzaku？ }): Promise<void>` を新規追加(管理者の編集画面から呼ぶ)

### 9. `lib/tanzaku.ts`
- `createTanzaku`: `runTransaction`化。`authorCounters/{uid}`と`rooms/{roomId}`を読み、`tanzakuCount < maxTanzakuPerUser`なら`authorCounters`をインクリメントしつつ短冊を作成。上限到達時は分かりやすいエラーを投げる
- `likeTanzaku(roomId, tanzakuId, uid)`: `runTransaction`化。`likedBy/{uid}`と`rooms/{roomId}`を読み、`count < maxLikesPerTanzaku`なら`likedBy`をインクリメントしつつ`tanzaku.likeCount`を`increment(1)`。上限到達時はエラーを投げる
- `authorClientId` → `authorUid`のリネームに追従

### 10. `hooks/useRoomTanzaku.ts`
- 内部で`getClientId()`を呼んでいた箇所を、引数で受け取る`uid: string | null`に変更
- 戻り値に`room: RoomDoc | null`を追加(`revealed`だけでなく`maxTanzakuPerUser`/`maxLikesPerTanzaku`も画面側で使うため)

### 11. `components/RoomView.tsx`
- `clientId`のlocalStorage初期化を廃止し、`subscribeAuthUid`から得る`uid`(nullなら読み込み中)に置き換え
- 管理者向けに「投稿上限」「いいね上限」を編集する小さなフォーム(数値input+保存ボタン、`updateRoomLimits`を呼ぶ)を追加
- `TanzakuForm`/`TanzakuGrid`に`uid`・room設定値を配布

### 12. `components/TanzakuForm.tsx`
- 「残りN枚」の計算をlocalStorageの`createdCount`ではなく、既に取得済みの`tanzakuList`を`authorUid === uid`でフィルタした件数から算出(追加のFirestore読み取りを増やさない)
- `clientId` prop → `uid` propに置き換え

### 13. `components/TanzakuGrid.tsx` / `TanzakuCard.tsx`
- いいねの「あと何回押せるか」は、`likedBy`サブコレクションを1枚ごとに購読するとFirestore読み取りが嵩むため、**セッション内メモリ(Reactのstate、localStorageではない)**で「このセッションでクリックして成功した回数」を保持し、room設定の`maxLikesPerTanzaku`に達したらボタンを無効化する簡易UI制御にする。リロードでこのメモリはリセットされるが、実際の上限強制はサーバー側(トランザクション)が担うので、再読み込み後に上限を超えて押そうとした場合はトランザクションがエラーを返し、それを受けてボタンを無効化する

### 14. `.claude/requirements.md`
- データモデル・ローカルストレージ・Firestoreルール・実装上の決定事項のセクションを本変更に合わせて更新

## 検証方法
- Firebase Consoleで匿名認証を有効化 → `firestore.rules`をコンソールに反映
- `npm run dev`でルーム作成 → 6個目の短冊作成を試みて、5個目までは成功し6個目はエラーになることを確認(UIの「残り枚数」表示にも依存せず、実際にFirestoreへの書き込みが拒否されることを確認)
- 同一短冊への4回目のいいねが拒否されることを確認
- 管理者画面で上限値を編集(例: 投稿上限を2に変更)→ 3個目の投稿がその場で拒否されるようになることを確認
- 複数ブラウザコンテキストで、他人の`authorUid`を騙った直接書き込みを試すスクリプト(Node/Playwright)を書いて、ルールによって拒否されることを確認
- `npx tsc --noEmit` / `npm run lint` / `npm run build` を実行して確認
