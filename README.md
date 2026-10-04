# Cloudflare Astro Dummy

GitHub への push を起点に、Astro の静的サイトを Cloudflare Workers へ自動デプロイする流れを安全に試すためのダミープロジェクトです。本番用のデータや秘密情報は含みません。

## 構成

- Astro は全ページをビルド時に静的 HTML 化します。
- ビルド成果物は `dist/` に出力されます。
- Wrangler は `dist/` を Workers Assets として配信します。
- Previewサイトを作成するブランチは `staging` だけです。それ以外の非本番ブランチではデプロイ処理をスキップします。
- 初回の本番公開が承認されるまで、`main` ブランチのデプロイ処理は意図的に無効化しています。
- Previewを作成できるよう、`wrangler.jsonc` に `previews` ブロックを用意しています。
- SSR や API は使わないため、`@astrojs/cloudflare` と Worker の `main` エントリーは不要です。
- 存在しない URL では `src/pages/404.astro` から生成したカスタム 404 ページを返します。

## 必要なもの

- Node.js 22.12.0 以上の偶数バージョン（このプロジェクトでは Node.js 24 を想定）
- npm
- GitHub リポジトリと接続済みの Cloudflare Worker

## ローカルで Astro を確認

```powershell
npm install
npm run dev
```

表示されたローカル URL をブラウザーで開きます。終了は `Ctrl+C` です。

## Workers と同じ配信方法でローカル確認

```powershell
npm run preview
```

このコマンドは Astro をビルドしてから Wrangler のローカルサーバーを起動します。`/missing-page/` を開くとカスタム 404 も確認できます。

## GitHub への push で自動デプロイ

Cloudflare ダッシュボードで、接続済み Worker の **Settings > Builds** を開き、次の値に設定します。ビルドをデプロイ用スクリプトに含めているため、Cloudflare 側の Build command は空欄にします。

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Build command | 未設定（空欄） |
| Deploy command | `npm run cf:deploy` |
| Preview command | `npm run cf:preview` |
| Root directory | 未指定（リポジトリ直下。入力必須の場合は `/`） |
| Build output directory | 設定不要（`wrangler.jsonc` の `assets.directory` を使用） |

リポジトリ直下の `.nvmrc` により、Workers Builds でも Node.js 24 が自動選択されます。

### 現在の本番デプロイ状態: 無効

`main`へのpushでCloudflare Workers Buildsは起動しますが、現在の`cf:deploy`はメッセージを出して正常終了するだけです。AstroのビルドやCloudflareへのアップロードは行いません。

既存の本番デプロイがある場合、その内容は削除されず公開されたままです。この設定は、新しい内容への更新だけを停止します。

初回の本番公開が承認されたら、`package.json`の`cf:deploy`を次のように変更して`main`へpushします。

```json
"cf:deploy": "npm run build && wrangler deploy"
```

この変更を含むpushで初回の本番デプロイが実行されます。それ以降は`cf:deploy`を戻さず、`main`へpushするたびに自動デプロイされます。

ローカルで `wrangler login` や `wrangler deploy` を実行する必要はありません。Workers Builds の認証には、Git 連携時に Cloudflare が用意した API トークンが使われます。

### Previewブランチの扱い

Cloudflareの **Settings > Builds > Branch control** ではPreview buildsを有効にしておきます。非本番ブランチへのpushでCloudflareのビルド処理自体は起動しますが、`cf:preview`が`WORKERS_CI_BRANCH`を確認します。

- `staging`: Astroをビルドし、`wrangler preview`でPreviewサイトを作成・更新します。
- `feature/test2`など、それ以外のブランチ: スキップ理由をログに出して正常終了します。Previewサイトは作成しません。
- `main`: Production branchとして`cf:deploy`が実行されるため、Preview判定の対象外です。

`wrangler preview` は現在Open Betaのため、実行時に警告が表示されます。これは失敗を示す警告ではなく、Preview URLが作成されれば正常です。

## 自動デプロイを試す手順

1. 開発内容を`staging`へ反映してpushする。
2. Cloudflareが作成した`staging`のPreview URLを開発者間で確認する。
3. 公開が承認されたら、`package.json`の`cf:deploy`を有効なコマンドへ変更する。
4. 承認済みの内容と`cf:deploy`の変更を`main`へ反映してpushする。
5. 初回公開後は`cf:deploy`を変更せず、以後は`main`へのpushで自動デプロイする。

## `wrangler.jsonc` の要点

| 設定 | 役割 |
| --- | --- |
| `name` | 既存の Cloudflare Worker 名（`test-repository`） |
| `compatibility_date` | Workers ランタイムの互換動作を固定する日付 |
| `assets.directory` | アップロードする Astro のビルド成果物 |
| `assets.not_found_handling` | 未知の URL に `404.html` を返す設定 |
| `preview_urls` | バージョンごとのプレビュー URL を有効化 |
| `previews` | `wrangler preview` に必要な Preview 用設定。現時点では個別の変数やリソースがないため空オブジェクト |

`name` は接続済み Worker に合わせて元の `test-repository` を維持しています。Cloudflare ダッシュボード上の Worker 名が異なる場合だけ、同じ名前に変更してください。

このプロジェクトでは環境変数、KV、D1、R2、独自ドメインはまだ設定していません。必要になった機能だけを後から `wrangler.jsonc` に追加できます。

## 主なファイル

```text
.
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ layouts/BaseLayout.astro
│  └─ pages/
│     ├─ index.astro
│     ├─ about.astro
│     └─ 404.astro
├─ scripts/
│  ├─ cloudflare-deploy-disabled.mjs
│  └─ cloudflare-preview.mjs
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
└─ wrangler.jsonc
```

## 補足: SSR が必要になった場合

ページごとにサーバー処理を行う場合は静的構成のままでは対応できません。その段階で `@astrojs/cloudflare` を追加し、Astro を `output: "server"` に変更して、生成される Worker エントリーを `wrangler.jsonc` の `main` に指定します。今回の静的サイト検証には不要です。
