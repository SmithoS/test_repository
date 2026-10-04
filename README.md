# Cloudflare Astro Dummy

GitHub への push を起点に、Astro の静的サイトを Cloudflare Workers へ自動デプロイする流れを安全に試すためのダミープロジェクトです。本番用のデータや秘密情報は含みません。

## 構成

- Astro は全ページをビルド時に静的 HTML 化します。
- ビルド成果物は `dist/` に出力されます。
- Wrangler は `dist/` を Workers Assets として配信します。
- `main` ブランチへの push を Cloudflare Workers Builds が検知し、自動でビルド・デプロイします。
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

Cloudflare ダッシュボードで、接続済み Worker の **Settings > Builds** を開き、次の値になっていることを確認します。

| 項目 | 値 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | 未指定（リポジトリ直下。入力必須の場合は `/`） |
| Build output directory | 設定不要（`wrangler.jsonc` の `assets.directory` を使用） |

リポジトリ直下の `.nvmrc` により、Workers Builds でも Node.js 24 が自動選択されます。

設定後の本番デプロイは次の流れになります。

1. 変更を `main` ブランチへ push する。
2. Cloudflare Workers Builds が push を検知する。
3. Cloudflare が依存関係をインストールし、`npm run build` を実行する。
4. `npx wrangler deploy` が `dist/` を既存の Worker へデプロイする。
5. Cloudflare ダッシュボードの **Builds** で成否とログを確認する。

ローカルで `wrangler login` や `wrangler deploy` を実行する必要はありません。Workers Builds の認証には、Git 連携時に Cloudflare が用意した API トークンが使われます。

### feature ブランチの扱い

このリポジトリの本番ブランチは `main` です。`feature/test2` などの別ブランチを push しても、本番 Worker は更新されません。

別ブランチでも動作確認したい場合は、Cloudflare の **Settings > Builds > Branch control** で Preview builds を有効にし、Preview command を `npx wrangler preview` にします。これにより、本番へ反映せずブランチ用 Preview URL で確認できます。

## 自動デプロイを試す手順

1. この変更をコミットする。
2. 最初は `feature/test2` を push し、Preview builds を有効にしている場合は Preview URL を確認する。
3. 問題がなければ `main` にマージして push する。
4. Cloudflare の **Builds** が成功し、Worker の `workers.dev` URLでページが更新されたことを確認する。

## `wrangler.jsonc` の要点

| 設定 | 役割 |
| --- | --- |
| `name` | 既存の Cloudflare Worker 名（`test-repository`） |
| `compatibility_date` | Workers ランタイムの互換動作を固定する日付 |
| `assets.directory` | アップロードする Astro のビルド成果物 |
| `assets.not_found_handling` | 未知の URL に `404.html` を返す設定 |
| `preview_urls` | バージョンごとのプレビュー URL を有効化 |

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
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
└─ wrangler.jsonc
```

## 補足: SSR が必要になった場合

ページごとにサーバー処理を行う場合は静的構成のままでは対応できません。その段階で `@astrojs/cloudflare` を追加し、Astro を `output: "server"` に変更して、生成される Worker エントリーを `wrangler.jsonc` の `main` に指定します。今回の静的サイト検証には不要です。
