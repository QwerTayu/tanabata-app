# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Gitに関する重要なルール

**コミットは必ずユーザーに許可を求めてから実行すること。** ユーザーが差分を目で確認して許可を出すまで、`git commit` を勝手に実行してはいけない。これは毎回のことで、一度許可されたからといって次回以降は省略できない。

## よく使うコマンド

- `npm run dev` — 開発サーバー起動
- `npm run build` — 本番ビルド(型チェックも含む)
- `npm run lint` — ESLint実行
- `npx tsc --noEmit` — 型チェックのみ実行

## プロジェクトの状態

Next.jsアプリとして実装済み(scaffold + Firebase連携 + 全画面のロジック)。

- `.claude/requirements.md` — このアプリの正式な要件定義書。仕様変更時は必ずここも一緒に更新すること。データモデル・セキュリティルール・関数シグネチャ・ルーティング方針・定数などの「正」はここにある。
- `doc/参加者画面イメージ.png` — 参加者画面のデザイン参考画像。

## このアプリについて

対面の勉強会/MTGのアイスブレイク用に、七夕の短冊をオンラインで作成・閲覧できる、認証なし・1日限りのWebアプリ。参加者は6桁のルームキーで「ルーム」に入り、短冊を投稿して共有ボードに飾る。管理者(ルーム作成者、または`/admin`のURLを知っている人なら誰でも)はモデレーション(削除・公開トグル・ルーム削除)ができる。詳細な仕様は `.claude/requirements.md` を参照。以下は、ゼロから再検討すると誤りやすい「アーキテクチャ上の決定事項」の要約のみ。

## アーキテクチャ上の重要な決定事項(requirements.mdを確認せずに蒸し返さないこと)

- **技術スタック**: Next.js (App Router, TypeScript, Tailwind) + Firebase Firestore(クライアントSDKのみ) + Vercel。`firebase-admin`・API Route・認証機能は一切使用しない。
- **ロール判定はURLのみで、サーバー側の強制はない**: `/{roomId}` = 参加者画面、`/{roomId}/admin` = 管理者画面。ルームキーを知っていれば誰でも管理者画面に到達できる。これは意図的な仕様(トレードオフとして明記済み)であり、認証を追加して「直す」対象ではない。
- **Firestoreセキュリティルールは全開放**(`allow read, write: if true`、`firestore.rules`参照)。`write`は`create`/`update`/`delete`をすべて含む。バリデーション(文字数上限など)は全てクライアント側のみで行う。
- **read数節約のための「公開トグル」**: ルームには `revealed: boolean` フラグがある。管理者がこれをONにするまで、参加者のFirestoreリスナーは `where('authorClientId', '==', myClientId)` で自分の短冊のみに絞られる(全件購読ではない)。これはSpark(無料)プランのread消費を抑えるための工夫であり、プライバシー機能ではない。管理者は `revealed` の状態に関わらず常に全件閲覧できる。
- **`where`と`orderBy`を異なるフィールドで組み合わせない**: Firestoreの複合インデックス要求を避けるため、`subscribeTanzaku`(`lib/tanzaku.ts`)は絞り込みのみFirestoreに投げ、`createdAt`順の並び替えはクライアント側の配列ソートで行う。
- **各種上限は全てソフト制限・クライアント側・localStorage管理**であり、Firestoreルールやサーバーでは強制しない: 1ブラウザ・1ルームにつき短冊は最大5個、1ブラウザ・1短冊につきいいねは最大10回。ブラウザ初回アクセス時に生成する`clientId`(UUID)をlocalStorageに保存し、作成した短冊の`authorClientId`フィールドとしても使う。
- **拡大プレビュー(モーダル)は無し**: いいねはカード上に常設されたハートアイコンから直接行う。
- **短冊の色(赤/黄/青)は投稿時に本人が選択**し、ドキュメントごとに保存する(`color`フィールド)。カードの背景は`public/card_{color}.png`の画像(自動サイクルではない)。
- **短冊のテキストは縦書き表示**(`writing-mode: vertical-rl`)。入力フォーム自体は通常の横書きのまま。
- **レイアウトは1行の横スクロール**(折り返しグリッドではない)。`TanzakuCard`には`content-visibility: auto`を指定し、画面外カードの描画コストを抑えている。

実装時は、`.claude/requirements.md` にすでに定義されている型定義・定数・関数シグネチャ(`lib/types.ts`, `lib/constants.ts`, `lib/rooms.ts`, `lib/tanzaku.ts`, `lib/localStorage.ts`, `useRoomTanzaku`)に従うこと。新たに別の形を考案しない。
