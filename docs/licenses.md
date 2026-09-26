# 使用しているフォント・アイコンのライセンス

`/licenses` ページ(ライセンス)に載せる内容のもとになる一覧です。画面自体はステップ3以降で作ります。

## フォント

| フォント | パッケージ | ライセンス |
|---|---|---|
| Zen Maru Gothic | `@fontsource/zen-maru-gothic` | SIL Open Font License, Version 1.1 |
| Zen Kaku Gothic New | `@fontsource/zen-kaku-gothic-new` | SIL Open Font License, Version 1.1 |

著作権表記(パッケージ内の`LICENSE`ファイルより):

> Copyright 2021 The Zen Maru Gothic Authors (https://github.com/googlefonts/zen-marugothic)
> Copyright 2021 The Zen Kaku Gothic New Authors (https://github.com/googlefonts/zen-kakugothicnew)

SIL Open Font License 1.1 の全文は各パッケージ(`node_modules/@fontsource/zen-maru-gothic/LICENSE`、`node_modules/@fontsource/zen-kaku-gothic-new/LICENSE`)、または https://scripts.sil.org/OFL を参照してください。

## アイコン

| アイコン | パッケージ | ライセンス |
|---|---|---|
| Lucide のアイコン全般(このサービスでは Settings) | `lucide-react` | ISC License(Copyright (c) 2026 Lucide Icons and Contributors) |
| Lucide のうち Feather Icons 由来のアイコン(このサービスでは ChevronLeft、ChevronRight、Plus) | `lucide-react` | MIT License(Copyright (c) 2013-present Cole Bemis) |
| ◯△×の状態記号(StatusIcon) | 自作(このリポジトリ内) | — |

Lucideは[Feather Icons](https://github.com/feathericons/feather)からフォークされたプロジェクトで、Feather由来のアイコン(一覧は`node_modules/lucide-react/LICENSE`に記載)にはMITライセンスの表記が別途付与されています。このサービスで使っているアイコンのうち、`chevron-left`・`chevron-right`・`plus`はFeather由来(MIT)、`settings`はLucide独自(ISC)です。

## ライセンスページに載せる内容

- 上記の表(フォント2種・アイコンの出典)
- 各ライセンスの全文へのリンク、または全文そのもの
- 「本サービスは上記フォント・アイコンを利用しています」という一文
