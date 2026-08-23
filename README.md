# readline.fm Random Book

readline.fmで紹介した48冊のうち、LISTENにPART1が公開されている本だけをランダム表示する静的サイトです。

## 現在のデータ

- 収録本: 48冊
- 抽選対象: PART1 URLがある46冊
- 抽選対象外: PART1未公開の2冊
- RSS: <https://rss.listen.style/p/readlinefm/rss>

## プレビュー

同梱元フォルダの1つ上にある `readlinefm-random-book-preview.html` は、JSON・CSS・JavaScriptを内蔵した単体プレビューです。ファイルを直接ブラウザで開けます。

このフォルダのGitHub Pages版をローカル確認する場合は、HTTPサーバーで配信してください。

```sh
python3 -m http.server 8000
```

## GitHub Pages

1. このフォルダの中身をGitHubリポジトリのルートへ配置します。
2. GitHubの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `main` ブランチへpushすると公開されます。

毎日1回、デプロイ前にLISTEN RSSを確認し、公開済みPART1のURLを反映します。RSS上にPART1がない本は `books.json` には残りますが、抽選対象には入りません。

リポジトリはpublicで運用し、GitHub Pagesの公開アーティファクトにはCSS・JavaScript・JSONを埋め込んだ単体の `index.html` だけを含めます。
