# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクトの状態

このリポジトリには**まだアプリケーションコードが存在しません**。現状あるのは仕様とデザイン参考資料のみです。

- `.claude/requirements.md` — このアプリの正式な要件定義書。実装前に必ず読むこと。データモデル・セキュリティルール・関数シグネチャ・ルーティング方針・定数など、実装が従うべき内容が定義されている。
- `doc/参加者画面イメージ.png` — 参加者画面のレイアウト参考画像(ランダム散らし配置ではなく、カードを整列させるグリッドスタイル)。

`package.json` やNext.jsのscaffold自体がまだ存在しないため、build/lint/testコマンドは現時点で何もない。要件定義書に沿ってプロジェクトを立ち上げた後、Next.jsの標準コマンド(`dev`/`build`/`lint`等)が使えるようになったら、このセクションを更新すること。

## このアプリについて

対面の勉強会/MTGのアイスブレイク用に、七夕の短冊をオンラインで作成・閲覧できる、認証なし・1日限りのWebアプリ。参加者は6桁のルームキーで「ルーム」に入り、短冊を投稿して共有ボードに飾る。管理者(ルーム作成者、または`/admin`のURLを知っている人なら誰でも)はモデレーション(削除・公開トグル)ができる。詳細な仕様は `.claude/requirements.md` を参照。以下は、ゼロから再検討すると誤りやすい「アーキテクチャ上の決定事項」の要約のみ。

## アーキテクチャ上の重要な決定事項(requirements.mdを確認せずに蒸し返さないこと)

- **技術スタック**: Next.js (App Router, TypeScript, Tailwind) + Firebase Firestore(クライアントSDKのみ) + Vercel。`firebase-admin`・API Route・認証機能は一切使用しない。
- **ロール判定はURLのみで、サーバー側の強制はない**: `/{roomId}` = 参加者画面、`/{roomId}/admin` = 管理者画面。ルームキーを知っていれば誰でも管理者画面に到達できる。これは意図的な仕様(トレードオフとして明記済み)であり、認証を追加して「直す」対象ではない。
- **Firestoreセキュリティルールは全開放**(`allow read, write: if true`)。`rooms` と `rooms/{roomId}/tanzaku` の両方が対象。バリデーション(文字数上限など)は全てクライアント側のみで行う。6時間という実装リミットの中でルールのデバッグに時間を溶かさないための意図的な判断。
- **read数節約のための「公開トグル」**: ルームには `revealed: boolean` フラグがある。管理者がこれをONにするまで、参加者のFirestoreリスナーは `where('authorClientId', '==', myClientId)` で自分の短冊のみに絞られる(全件購読ではない)。これはSpark(無料)プランのread消費を抑えるための工夫であり、プライバシー機能ではない。管理者は `revealed` の状態に関わらず常に全件閲覧できる。
- **各種上限は全てソフト制限・クライアント側・localStorage管理**であり、Firestoreルールやサーバーでは強制しない: 1ブラウザ・1ルームにつき短冊は最大5個、1ブラウザ・1短冊につきいいねは最大10回。ブラウザ初回アクセス時に生成する`clientId`(UUID)をlocalStorageに保存し、作成した短冊の`authorClientId`フィールドとしても使う。
- **拡大プレビュー(モーダル)は無し**: いいねはカード上に常設されたハートアイコンから直接行う。
- **短冊の色(赤/黄/青)は投稿時に本人が選択**し、ドキュメントごとに保存する(`color`フィールド)。自動サイクルや計算による色分けではない。
- **短冊のテキストは縦書き表示**(`writing-mode: vertical-rl`)。入力フォーム自体は通常の横書きのまま。

実装時は、`.claude/requirements.md` にすでに定義されている具体的な型定義・定数・関数シグネチャ(`lib/types.ts`, `lib/constants.ts`, `lib/rooms.ts`, `lib/tanzaku.ts`, `lib/localStorage.ts`, `useRoomTanzaku`)に従うこと。新たに別の形を考案しない。
