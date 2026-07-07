# 七夕オンライン短冊アプリ 要件定義

## 背景・目的
情報サークルのMTGアイスブレイク用に、七夕当日にオンラインで短冊を書いて笹に飾れるWebアプリを作る。
参考: note記事(formrun+Canvaによる手作業の社内七夕企画) https://note.com/sales_wsff/n/n8ded5427462c
画面デザイン参考: `doc/参加者画面イメージ.png`(短冊カードを1行に並べて横スクロールするスタイル)。実アセットとして `public/background.png`(ページ背景)・`public/card_r.png` / `card_y.png` / `card_b.png`(色ごとの短冊カード背景画像)を使用する
実装リミットは当日6時間のため、認証なし・Firestoreルール全開放・無料枠運用のシンプル構成を優先する。

## 技術スタック
- Next.js (App Router, TypeScript, Tailwind CSS)
- Firebase Firestore (DB。Client SDKのみ使用。**無料枠(Sparkプラン)のまま運用**)
- Vercel (ホスティング)
- ※firebase-admin SDK・API Route・トークン認証などは使用しない(意図的にシンプル化)

## ユーザーフロー / ルーティング
- `/` : ルームキー(英数字6桁)入力欄 + 「ルーム作成」ボタン
  - キー入力→参加: 入力値の `rooms/{roomId}` の存在確認後、`/{roomId}` へ遷移(存在しなければエラー表示)
  - ルーム作成: クライアントでランダムな6桁roomKeyを生成し(紛らわしい文字 0/O, 1/I/L 等は除外)、`rooms/{roomKey}` を `revealed: false` で作成 → 作成者はそのまま `/{roomKey}/admin` へ遷移
- `/{roomId}` : 参加者画面(短冊カードグリッド閲覧・いいね・短冊投稿)
  - `revealed` が `false` の間は、自分(`authorClientId`が一致するもの)が作成した短冊のみ表示。「他の人の短冊は管理者が公開するまでお待ちください」等のメッセージを表示
  - `revealed` が `true` になった瞬間、自動的に全員分の短冊表示に切り替わる(リアルタイム反映)
- `/{roomId}/admin` : 管理者画面(参加者画面の全機能 + 短冊削除・ルーム削除・共有ボタン・公開トグル)
  - 管理者は `revealed` の状態に関わらず常に全短冊を閲覧できる(モデレーション用途)
  - 参加者画面と管理者画面はロールをURLのみで判定する(サーバー側の強制なし。ルームIDを知っていれば誰でも管理者画面に到達できる点は仕様として許容する)
  - 存在しない `roomId` へのアクセスは「ルームが見つかりません」+トップへのリンクを表示

## 機能要件

### 参加者共通(`/{roomId}` と `/{roomId}/admin` の両方)
- 画面下部固定の入力バーから短冊を投稿できる(入力欄は通常の横書きでよい)
  - 「願い事」: 必須、1〜50文字
  - 「ハンドルネーム」: 任意、〜20文字、空欄可(表示時は「名無しさん」)。一度入力した値はlocalStorageに保存し、次回以降の入力欄に自動で埋める(複数枚書く想定のため)
  - 1人(1ブラウザ)につき、1ルームあたり最大5個まで短冊を作成できる。上限に達したら投稿フォームを無効化し、「このルームでの投稿上限(5個)に達しました」等を表示する。localStorageのカウントによるソフト制限(いいね上限と同様、性善説ベース)
  - 「短冊の色」: 赤・黄・青の3色から1つを選択する(必須、初期選択はいずれか1色)。選んだ色がそのままカードの背景色になる。直近選んだ色はlocalStorageに保存し、次回の初期選択値にする(ハンドルネームと同様、複数枚書く想定のため)
- 投稿された短冊は即座に(Firestore onSnapshotのリアルタイム購読で)画面上のカードグリッドに反映される
  - ただし参加者画面では、管理者が「みんなに公開する」を押すまでは自分が作成した短冊のみ表示され、他人の短冊は見えない(read数節約のため)
  - 公開後は他人の短冊も含め全件閲覧可能になる
- 短冊カードには「願い事」「ハンドルネーム」「♡アイコン + いいね数」を常設表示(拡大プレビューは無し)
- ♡アイコンをクリックするとその場でいいねが+1される
  - 同一ブラウザ・同一短冊につき最大10回まで(localStorageでカウント、10回に達したらアイコンを無効化)。性善説ベースのソフト制限でよい
- いいね数が多いほど短冊カードが光る演出(box-shadow等によるglow。段階的に強くする)
- 参加者は短冊を削除できない(削除ボタン自体が表示されない)
- 画面上部などに簡単なルール表示(例: 「50文字以内で書いてね」「他の人の短冊に10回までいいねできるよ」「他の人が嫌な気持ちになる願い事は書かないでね」)

### 管理者(`/{roomId}/admin`)のみの追加機能
- 「みんなに公開する」トグルボタン: `rooms/{roomId}.revealed` を `true`/`false` に切り替える(再度非公開に戻すことも可能)
- 各短冊カードに削除ボタンが表示され、押すとその短冊が削除される(`deleteDoc`)
- 「ルームを削除」ボタン: 確認ダイアログの後、そのルームの短冊を全件削除(バッチ削除。最大200件程度なのでFirestoreの1バッチ500件制限内で収まる)→ ルームドキュメント自体を削除 → `/` へリダイレクト
- 「共有」ボタン: 参加者用リンク `https://<host>/{roomId}` をクリップボードにコピーする(トースト等で「コピーしました」を表示)

## データモデル(Firestore)
- `rooms/{roomId}` : `{ createdAt: Timestamp, revealed: boolean }` (`roomId` = 6桁のルームキーそのもの。`revealed`は作成時`false`)
- `rooms/{roomId}/tanzaku/{tanzakuId}` :
  - `wish: string`(1〜50文字)
  - `handle: string`(0〜20文字、空文字許容)
  - `color: 'red' | 'yellow' | 'blue'`(投稿時にユーザーが選択。カード背景画像 `card_{color}.png` の出し分けに使用)
  - `likeCount: number`(作成時0)
  - `authorClientId: string`(投稿ブラウザのクライアントID。非公開時の「自分の短冊のみ表示」フィルタに使用)
  - `createdAt: Timestamp`(`serverTimestamp()`)

## Firestoreセキュリティルール
複雑なルールは組まず、read/write(create/update/delete含む)を全面許可する。
```
match /databases/{database}/documents {
  match /rooms/{roomId} {
    allow read, write: if true;
    match /tanzaku/{tanzakuId} {
      allow read, write: if true;
    }
  }
}
```
バリデーション(文字数上限など)はクライアント側(フォーム送信前)でのみ行う。「非公開時は自分の短冊しか見えない」もクライアントのクエリ条件(`where('authorClientId','==',myClientId)`)による制御であり、ルール上は誰でも全件readできる点に注意(ブラウザの開発者ツール等で直接Firestoreを叩けば非公開中でも他人の短冊を読めてしまう。1日限りのアイスブレイク用途として許容する)。

**既知のトレードオフ**: ルームIDさえ分かれば誰でも `/{roomId}/admin` に到達でき、公開トグルや削除も操作できてしまう(サーバー側の強制なし)。

## 運用上の注意(Firestore無料枠について)
- **無料枠(Sparkプラン)のまま運用する前提**で設計する
- Sparkプランの目安: 1日あたり読み取り5万・書き込み2万・削除2万(要Firebase Console確認)
- リアルタイムリスナーは「1件の書き込みが、接続中の全クライアント分の読み取りとしてもカウントされる」構造のため、全員が全短冊を見られる状態で書き込みが発生すると読み取りが跳ねやすい
- **対策**: 「みんなに公開する」までは参加者は自分の短冊しか購読しないため、短冊作成フェーズ(最大200件の書き込みが集中する時間帯)の読み取り数を大きく抑えられる。公開後は全員が全短冊を購読するため、公開後にいいね連打が集中すると読み取り数が増える(公開は当日イベントの一瞬なので許容範囲と想定)
- それでも当日の総アクセス量が読めない場合は、公開のタイミングを会の終盤に寄せる・いいねの多さより「見る楽しさ」を優先する等の運用上の工夫で吸収する想定

## いいね/glow演出の仕様
- `getGlowStyle(likeCount: number): React.CSSProperties` という関数に閉じ込める。likeCountは1ブラウザにつき上限10だが、複数人からのいいねが積み重なるため合計値は10を大きく超えうる(最大30人×10=300が理論上限)。閾値は以下を初期値とし、当日の見た目調整で変更可能:

| likeCount | 見た目 |
|---|---|
| 0 | glowなし |
| 1〜4 | `box-shadow: 0 0 8px 2px rgba(255,215,0,0.5);` |
| 5〜14 | `box-shadow: 0 0 16px 4px rgba(255,215,0,0.7);` |
| 15〜29 | `box-shadow: 0 0 24px 8px rgba(255,200,0,0.85);` + 軽いpulseアニメーション |
| 30〜 | `box-shadow: 0 0 36px 12px rgba(255,180,0,1);` + 強めのpulseアニメーション |

## 画面デザイン方針(`doc/参加者画面イメージ.png` 参照)
- ランダム散らし配置ではなく、短冊カードを**1行に並べて横スクロール**表示する(折り返しはしない。`display: flex; overflow-x: auto; overflow-y: hidden;` の1行コンテナ)
- カードの背景は自動サイクルの色ではなく、**投稿時にユーザーが選んだ色(赤/黄/青)に対応する `card_{color}.png` 画像**を背景画像として使う(下記「画像アセット」参照)。3ファイルとも210×574px(縦横比約1:2.73)で統一されているため、カードのアスペクト比はこの比率で固定する
- 背景全体には `public/background.png`(700×490px、星空+笹のイラスト)を `background-size: cover; background-attachment: fixed;` でページ背景として敷く
- 画面上部や余白に簡単なルール説明・タイトルを配置
- 画面下部に固定の投稿入力バー(ハンドルネーム欄+願い事欄+色選択+送信ボタン)を配置
- 非公開時の参加者画面では、自分の短冊のみの横スクロール行 + 「他の人の短冊は公開までお待ちください」的な案内を表示
- 各短冊カード: 願い事テキスト(縦書き)、ハンドルネーム(空なら「名無しさん」)、♡アイコン+いいね数、glow演出、(管理者画面のみ)削除ボタン
- 短冊カード内の願い事テキストは**縦書き**で表示する(CSS `writing-mode: vertical-rl`、必要に応じて`text-orientation`を調整)。入力フォーム自体は横書きのままでよい(表示のみ縦書き変換)
- カード画像は上部に紐を通す穴の絵、下部に星の飾りの絵が既に描き込まれているため、テキストやアイコンはその間の余白部分(目安: 上18%・下22%を避けた中央帯)に配置する

## 画像アセット(`public/`)
| ファイル | サイズ | 用途 |
|---|---|---|
| `background.png` | 700×490px | ページ全体の背景(星空+笹のイラスト) |
| `card_r.png` | 210×574px | `color: 'red'` の短冊カード背景 |
| `card_y.png` | 210×574px | `color: 'yellow'` の短冊カード背景 |
| `card_b.png` | 210×574px | `color: 'blue'` の短冊カード背景 |

**パフォーマンスについて**: `card_{color}.png` は3種類しか実体がないため、200枚のカードが同じファイルを`background-image`として参照しても、ブラウザは各ファイルを1回しかダウンロード/デコードしない(URLが同じ画像はキャッシュ共有される)。したがって画像化によって読み込みが重くなることはない。
「画面に見えていないカードの描画负荷を遅らせたい」という要望には、CSSの `content-visibility: auto`(+ `contain-intrinsic-size` でおおよそのカードサイズを指定)を各`TanzakuCard`に指定する方式で対応する。ビューポート外のカードはブラウザがレイアウト・ペイントを自動的にスキップするため、JS側で仮想スクロールライブラリを導入する必要がない(6時間の実装リミットに合う簡易策)。

## ローカルストレージ(ブラウザごとの状態管理)
- `tanabata:clientId` : ブラウザ初回アクセス時に生成する一意なID(`crypto.randomUUID()`など)。短冊作成時に `authorClientId` としてFirestoreに保存し、非公開時の「自分の短冊のみ表示」クエリのキーにも使う
- `tanabata:handle` : 直近入力したハンドルネーム(次回フォームの初期値として使用)
- `tanabata:color` : 直近選択した短冊の色(`red`/`yellow`/`blue`。次回フォームの初期選択値として使用)
- `tanabata:{roomId}:likes` : `{ [tanzakuId]: number }` 形式。そのルームで自分がいいねした短冊ごとの回数(上限10のソフト制限に使用)
- `tanabata:{roomId}:createdCount` : number。そのルームで自分(このブラウザ)が作成した短冊数(上限5のソフト制限に使用)。管理者が短冊を削除しても減算しない簡易実装(削除後に投稿枠が復活しない点は許容する)

## コンポーネント構成の方針
- `app/page.tsx` : ルームキー入力 + ルーム作成
- `app/[roomId]/page.tsx` : 参加者画面
- `app/[roomId]/admin/page.tsx` : 管理者画面
- 参加者画面・管理者画面は `TanzakuGrid` / `TanzakuCard` / `TanzakuForm` を共通利用し、`isAdmin` propで削除ボタン・ルーム削除・共有ボタン・公開トグルの表示有無のみ出し分ける
- `TanzakuGrid` は横スクロールコンテナ(`overflow-x: auto`)の中に `TanzakuCard` を1行(`flex`)で並べるだけのシンプルな実装でよい(折り返し・座標計算は不要)。各`TanzakuCard`に`content-visibility: auto`を指定し、画面外カードの描画コストを抑える
- `lib/firebase/client.ts` : Firebase Client SDK初期化(`NEXT_PUBLIC_FIREBASE_*` 環境変数)
- `useRoomTanzaku(roomId, isAdmin)` フック:
  - `rooms/{roomId}` を `onSnapshot` で購読して `revealed` を取得
  - `isAdmin` が true、または `revealed` が true の場合: 全件 `onSnapshot`(orderBy createdAt)
  - それ以外(非公開中の参加者): `where('authorClientId','==', myClientId)` で絞った `onSnapshot`
  - `revealed` の値が変化したタイミングで購読クエリを切り替える(前のリスナーをunsubscribeして再購読)

## 型定義

```ts
// lib/types.ts
import type { Timestamp } from "firebase/firestore";

export interface RoomDoc {
  createdAt: Timestamp;
  revealed: boolean;
}

export type TanzakuColor = "red" | "yellow" | "blue";

export interface TanzakuDoc {
  wish: string;
  handle: string; // 空文字許容
  color: TanzakuColor;
  likeCount: number;
  authorClientId: string;
  createdAt: Timestamp;
}

// Firestoreドキュメントにidを合成したクライアント側の表示用型
export interface Tanzaku extends TanzakuDoc {
  id: string;
}
```

## 定数

```ts
// lib/constants.ts
export const WISH_MAX_LENGTH = 50;
export const HANDLE_MAX_LENGTH = 20;
export const MAX_TANZAKU_PER_ROOM_PER_USER = 5;
export const MAX_LIKES_PER_TANZAKU_PER_USER = 10;
export const ROOM_KEY_LENGTH = 6;
// 0/O, 1/I/L など紛らわしい文字を除外した文字セット
export const ROOM_KEY_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_KEY_CREATE_MAX_RETRIES = 5;

// 色の定数: imageSrcが実際のカード背景画像、bgは画像読み込み前/失敗時のフォールバック色
export const TANZAKU_COLORS: Record<TanzakuColor, { label: string; imageSrc: string; bg: string }> = {
  red: { label: "赤", imageSrc: "/card_r.png", bg: "#FFB3B3" },
  yellow: { label: "黄", imageSrc: "/card_y.png", bg: "#FFEC99" },
  blue: { label: "青", imageSrc: "/card_b.png", bg: "#A5D8FF" },
};
// カード画像のアスペクト比(210:574)。TanzakuCardのCSS `aspect-ratio` に使用
export const CARD_ASPECT_RATIO = "210 / 574";
```

## データアクセス層(関数シグネチャ)
firebase-admin/API Routeを使わないため、これらは全てクライアントサイドから直接Firestore SDKを呼ぶ薄いラッパー関数として実装する(Firebase JS SDK v10+ モジュラーAPI: `firebase/firestore` の `doc`, `collection`, `addDoc`, `getDoc`, `getDocs`, `onSnapshot`, `query`, `where`, `orderBy`, `updateDoc`, `deleteDoc`, `writeBatch`, `increment`, `serverTimestamp` を使用)。

```ts
// lib/rooms.ts
function generateRoomKey(): string; // ROOM_KEY_CHARSからROOM_KEY_LENGTH文字をランダム生成
async function createRoom(): Promise<string>; // 生成→存在チェック→衝突ならROOM_KEY_CREATE_MAX_RETRIESまでリトライ→roomIdを返す。失敗時は例外
async function getRoom(roomId: string): Promise<RoomDoc | null>;
function subscribeRoom(roomId: string, cb: (room: RoomDoc | null) => void): () => void; // unsubscribe関数を返す
async function setRevealed(roomId: string, revealed: boolean): Promise<void>;
async function deleteRoomCascade(roomId: string): Promise<void>; // tanzakuサブコレクション全件+roomドキュメントをwriteBatchで削除

// lib/tanzaku.ts
async function createTanzaku(roomId: string, input: { wish: string; handle: string; color: TanzakuColor; authorClientId: string }): Promise<string>; // 新規ドキュメントIDを返す
function subscribeTanzaku(roomId: string, opts: { authorClientId?: string }, cb: (list: Tanzaku[]) => void): () => void; // authorClientId指定時はwhereで絞り込み、未指定なら全件
async function likeTanzaku(roomId: string, tanzakuId: string): Promise<void>; // likeCountをincrement(1)
async function deleteTanzaku(roomId: string, tanzakuId: string): Promise<void>;
```

```ts
// lib/localStorage.ts
function getClientId(): string; // tanabata:clientId を取得、無ければcrypto.randomUUID()で生成して保存
function getHandle(): string;
function setHandle(handle: string): void;
function getLastColor(): TanzakuColor; // 未設定時のデフォルトは "red" 等
function setLastColor(color: TanzakuColor): void;
function getCreatedCount(roomId: string): number;
function incrementCreatedCount(roomId: string): void; // createTanzaku成功後にのみ呼ぶ
function getLikeCount(roomId: string, tanzakuId: string): number;
function incrementLikeCount(roomId: string, tanzakuId: string): void; // likeTanzaku成功後にのみ呼ぶ
```

```ts
// hooks/useRoomTanzaku.ts
function useRoomTanzaku(roomId: string, isAdmin: boolean): {
  tanzakuList: Tanzaku[];
  revealed: boolean;
  loading: boolean;
  error: string | null;
};
```

## Next.jsルーティング実装方針(paramsの扱い)
- `app/[roomId]/page.tsx` と `app/[roomId]/admin/page.tsx` は **クライアントコンポーネント(`'use client'`)** とし、`next/navigation` の `useParams<{ roomId: string }>()` で `roomId` を取得する
- Next.js 15以降ではサーバーコンポーネントの `params` が `Promise` になる仕様変更があるが、本アプリは Firestore のリアルタイム購読・localStorage参照が必須でどのみち中身はクライアントコンポーネントになるため、素直に `useParams` を使う方が単純で詰まりにくい(サーバーコンポーネントで一度 `await params` してからクライアントコンポーネントに渡す、という二段構えは不要)
- `app/page.tsx` はルーム作成・参加の操作のみなのでクライアントコンポーネントで完結させ、`useRouter().push()` で遷移する

## 実装上の細かい決定事項(実装中に迷わないためのメモ)
- ルームキーは大文字小文字を区別しない: 入力値は常に `.toUpperCase()` してから検索・遷移に使う(生成時も大文字のみ生成)
- 「願い事」の入力欄は単一行の `<input type="text">`(`textarea`ではない)。改行は考慮不要で、縦書き表示時の折り返しはCSSの`writing-mode: vertical-rl`が自動で処理する
- 投稿フォームはFirestoreへの書き込みが完了するまで送信ボタンを`disabled`にし、二重送信(連打による重複作成)を防ぐ
- `createdCount`(投稿数)・`likes`(いいね数)のlocalStorageカウントは、**Firestoreへの書き込みが成功した後にのみ**インクリメントする(失敗時に枠を消費しない)
- 短冊一覧は `orderBy('createdAt', 'asc')`(古い順)で表示し、新規投稿は末尾に追加される(既存カードの並びがガタつかない)
- 個別短冊の削除(管理者)は確認ダイアログなしで即時実行してよい。ルーム全体の削除のみ確認ダイアログを挟む(取り返しがつかないため)
- `deleteRoomCascade` は `writeBatch` 1回(上限500件)で完結する前提(想定最大200短冊+ルームドキュメント1件=201件のため)。それ以上の規模のルームは非対応(スコープ外、想定30人には十分)
- 願い事の内容に対する自動検閲(NGワードフィルタ等)は行わない。管理者が目視で気づいた短冊を手動削除する運用とする
- `TanzakuCard` の背景画像は `background-image: url(...)` + `background-size: cover` で指定し、カード自体は `aspect-ratio: 210 / 574` で固定する(画像と完全に同じ比率なのでcoverでも欠けない)。`next/image`の`fill`は必須ではないが、使う場合はコンテナの位置指定(`position: relative`)を忘れない
- `subscribeTanzaku` は Firestore側で `where('authorClientId','==',...).orderBy('createdAt')` のような**フィールドが異なるwhere+orderByの組み合わせ**を使わない(複合インデックスの作成が必要になり、実行時に「index を作ってください」エラーで詰まりやすいため)。絞り込みは `where` のみをFirestoreに投げ、並び替え(`createdAt`昇順)は取得後にクライアント側の配列ソートで行う

## 環境変数
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```
通常のFirebase Web設定値のみ(Firebaseコンソールの「プロジェクトの設定」からコピー)。firebase-admin/サービスアカウントは使用しないため非公開env変数は不要。Vercelの環境変数に登録する。

## スコープ外(今回はやらないこと)
- ユーザー認証・ログイン機能
- 管理者操作のサーバー側強制(URL判定のみで許容する)
- 短冊の編集(削除のみ、内容修正は不可)
- 拡大プレビュー(モーダル)
- いいねの完全な不正防止(localStorageクリアで回避可能な点は許容)
- モバイル最適化以上のレスポンシブ細部調整、多言語対応

## 実装ステップの目安(合計6時間想定)
1. Firebaseプロジェクト作成・Firestore有効化(無料枠のまま)・Vercelプロジェクト作成: 20分
2. Next.js scaffold (App Router, TS, Tailwind): 15分
3. Firebase client lib実装 + 全開放ルールのデプロイ: 10〜15分
4. `/` : ルーム作成・参加フロー: 30分
5. 短冊投稿フォーム + `useRoomTanzaku`フック(公開/非公開でのクエリ切り替え含む): 60分
6. 参加者画面のカードグリッドUI(画像に寄せた見た目・色サイクル・glow・ハートいいね): 60〜90分(デザイン調整で一番時間がかかりやすい)
7. 管理者画面(削除ボタン・ルーム削除・共有ボタン・公開トグル): 40〜50分
8. エッジケース対応(存在しないルーム、文字数超過、空欄ハンドル): 20分
9. Vercelデプロイ・環境変数設定・複数ブラウザでの実機確認(公開トグルの切り替わりも確認): 20〜30分
10. バッファ: 20〜30分

## 未確定・後で決めること
- glowの色/閾値の微調整
- カード画像内の「余白帯(テキストを置ける範囲)」の正確なpadding値(見た目を見ながら微調整)
- ルール文の最終的な文言(画像はサンプルなので当日の内容に合わせて調整)
- 「公開」のタイミングをMTG内のどの瞬間にするか(進行との兼ね合いは当日の運用で決める)

## メモ
画像のDL元
- https://www.illust-pocket.com/illust/6704
- https://illust-ryokka.jp/scenery/event-scenery/tanabata-2/
