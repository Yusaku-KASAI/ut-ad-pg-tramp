import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import cesium from "vite-plugin-cesium";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    laravel({
      input: [
        "resources/css/app.css",
        "resources/css/reset.css",
        "resources/js/app.js",
      ],
      refresh: true,
    }),
    tailwindcss(),
    vue({
      template: {
        transformAssetUrls: {
          // Vueプラグインは、Single File Componentsで
          // 参照する場合、アセットのURLをLaravelのWebサーバを
          // 指すように書き換えます。
          // これを`null`に設定すると、Laravelプラグインは
          // アセットURLをViteサーバを指すように書き換えます。
          base: null,

          // Vueプラグインは、絶対URLを解析し、ディスク上のファイルへの
          // 絶対パスとして扱います。
          // これを`false`に設定すると、絶対URLはそのままになり、
          // 期待通りにpublicディレクトリの中で、アセットへ参照できます。
          includeAbsolute: false,
        },
      },
    }),
    cesium(),
    // cp -r node_modules/cesium/Build/Cesium public/cesium
    // これで開発環境とりあえず動かした
  ],
  define: {
    // この値とプラグインの default('/cesium') を合わせる
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
  server: {
    host: true,
  },
  resolve: {
    alias: {
      // DOM内テンプレートを使用する場合この指定が必要
      vue: "vue/dist/vue.esm-bundler.js",
      "@pages": fileURLToPath(new URL("./resources/js/pages", import.meta.url)),
    },
  },
});
