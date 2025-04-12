# test-laravel-include-vue

## 環境構築

### development

- vite
- nginx
- php
- mysql

### prpduction

- nginx
- php
- mysql

## プロジェクト作成ログ

- コンテナ起動まで

```
laravelプロジェクト作成&vue導入(Makefile参照)
```

- フロント構築

```
welcome.blade.phpをvueのエントリーポイントにする
- タイトルはjsで上書き想定
- metaタグでcsrfトークンを含めておく(axiosを使うなら不要だが一応)
- urlでの外部リソース読み込みはしない(やるなら自分で保持するように後で調整)
- viteディレクティブ必須(ついでにcssの方はtailwindを外してリセットcssにしておく)
- #appマウントとDOM内コンポーネントでrouter-viewコンポーネント(vue-routerを使わずに、app.componentで登録したコンポーネントをDOM内テンプレートで使用できる。また、#appに対して.vueを直接割り当てることもできる(さらにその中でRouterViewを使用してもよい))
app.jsでvueと紐付け
- 読み込んでるbootstrap.js内でx-csrf-token調整(axiosを使えばx-xsrf-tokenがcookie参照で自動でセットされ不要、fetchを用いるときなどはmetaタグなどに格納しつつ手動でリクエストヘッダーにセット)
- vueアプリケーション作成&ルーター&pinia登録&マウント
router.jsでページ定義
store/でpinia定義
その他ディレクトリ切り分け(components,composables,layouts,middleware,pages,store)
components配下はatoms,molecules,organisms
composables配下はcomponents(componentsのロジック),container(pagesのロジック),repositories(laravelアクセス),その他ロジック
(ディレクトリ切り分けちゃんとやるのはきつかったのでそのあたりはmail-to-lineのvue参照で)
vite.vonfig.jsでエイリアス指定
Exampleコンポーネントで簡易的にユーザーCRUD&認証
```

- laravel構築

```
同一ドメインなので、セッション認証を利用し、apiルートやsanctumやcors設定は不要
web.phpで簡易的にユーザーCRUD&認証例作成
```
