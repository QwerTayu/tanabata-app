# 七夕オンライン短冊

情報サークルの MTG のアイスブレイク用に作った、七夕の短冊をオンラインで書いて笹に飾れる Web アプリです。ログインは不要で、ルームキーを共有すればその場の全員で短冊を書き、見せ合えます。

公開 URL: https://tanabata-app.miruomo.com/

## 主な機能

- **ルームの作成と参加**: トップページでハンドルネームを決め、ルームを作るか、6桁のルームキーを入力して参加します。ルームを作った人はそのまま管理者画面（`/{ルームキー}/admin`）に入ります。
- **縦書きの短冊**: 願い事（50文字まで）を書き、赤・黄・青から色を選んで飾ります。短冊は縦書きで表示され、1行に並んで横にスクロールします。並び順は「いいね順」と「新着順」を切り替えられます。
- **いいねで光る演出**: 短冊のハートを押すといいねでき、いいねが多い短冊ほど強く光ります。
- **管理者の公開トグル**: 管理者が「みんなに公開する」を押すまで、参加者には自分の短冊しか見えません。管理者は短冊の削除やルームの削除もできます。
- **QR コードでの共有**: 管理者画面の「共有する」から、ルームキーと参加用リンクの QR コードを表示できます。
- **投稿上限・いいね上限の変更**: 1人あたりの投稿数（初期値5個）と、1つの短冊へのいいね数（初期値3回）の上限を、ルームごとに管理者画面から変えられます。上限は Firestore のセキュリティルールで強制しています。

管理者画面は URL だけで判定しているので、ルームキーを知っていれば誰でも開けます。1日限りのアイスブレイク用なので、これは意図した仕様です。

## 技術スタック

- Next.js（App Router）/ TypeScript / Tailwind CSS
- Firebase Firestore（クライアント SDK のみ）
- Firebase Authentication（匿名認証のみ。ページを開くと自動でサインインします）
- Vercel

## ローカルでの起動

1. 依存パッケージを入れます。

   ```sh
   npm install
   ```

2. Firebase プロジェクトを用意し、Firebase Console で次の2つを設定します。
   - Authentication の「Sign-in method」で「匿名」を有効にする
   - Firestore Database を作成し、`firestore.rules` を反映する（下の「Firestore ルールのデプロイ」を参照）

3. `.env.example` をコピーして `.env.local` を作り、値を埋めます。

   ```sh
   cp .env.example .env.local
   ```

   `NEXT_PUBLIC_FIREBASE_*` には、Firebase Console の「プロジェクトの設定」にある Web アプリの設定値を入れます。`NEXT_PUBLIC_SITE_URL` は OGP 画像などの絶対 URL に使います（省略すると `http://localhost:3000`）。

4. 開発サーバーを起動し、http://localhost:3000 を開きます。

   ```sh
   npm run dev
   ```

そのほかのコマンド:

| コマンド | 内容 |
|---|---|
| `npm run build` | 本番ビルド（型チェックも含む） |
| `npm run lint` | ESLint を実行 |
| `npx tsc --noEmit` | 型チェックだけを実行 |

## Firestore ルールのテスト

```sh
npm run test:rules
```

Firestore エミュレータを起動し、`tests/` のテストを `firestore.rules` に対して実行します。本番の Firebase プロジェクトには接続しません。

Java と、Node.js 22.18 以上（23系なら23.6以上）が必要です。テストから `lib/tanzaku.ts` を型除去でそのまま読み込むためで、アプリ自体の起動にはこの版は要りません。

## Firestore ルールのデプロイ

```sh
npx firebase login   # 初回だけ
npm run deploy:rules
```

`firestore.rules` を、`.firebaserc` に書いたプロジェクトにデプロイします。ルールとアプリのデータの形は対応しているので、ルールを変えたときはアプリのデプロイと時間を空けずに反映してください。

## 詳しい仕様

データモデル、セキュリティルールの考え方、関数の形などの詳しい仕様は [`.claude/requirements.md`](.claude/requirements.md) にあります。投稿上限・いいね上限を Firestore で強制するようにした変更の経緯は [`.claude/requirements_v2.md`](.claude/requirements_v2.md) にまとめています。
