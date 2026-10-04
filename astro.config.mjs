import { defineConfig } from "astro/config";

export default defineConfig({
  // この検証サイトは全ページをビルド時に HTML 化します。
  // SSR を使わないため、Cloudflare アダプターは不要です。
  output: "static",
});
