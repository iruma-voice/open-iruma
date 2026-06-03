import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    // 記事を読み終えた市民が次のアクションに移れるよう、最新記事や他イシューへの回遊動線を追加
    Component.RecentNotes({
      title: "他の地域課題・議事録を見る",
      limit: 3,
      linkToMore: "02_地域課題と議論_Issues_Debates/" as any,
    }),
  ],
  footer: Component.Footer({
    links: {
      "いるまオープン議会": "https://iruma-voice.github.io/open-iruma/",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    // Component.ContentMeta(), // 公共データベースの性質上、読了時間などは非表示を維持
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    // 複雑なグローバルグラフは排除しつつ、当該イシューに関係する議員やタグのみを繋ぐ「ローカルグラフ」として最適化
    Component.DesktopOnly(
      Component.Graph({
        localGraph: {
          drag: true,
          zoom: true,
          depth: 1, // 1ホップ（直接リンク）のみに限定して認知負荷を最小化
          scale: 1.1,
          repulsion: 4,
        },
        globalGraph: {}, // グローバル側は空オブジェクトを渡して無効化
      }),
    ),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(), 
    Component.ArticleTitle(), 
    Component.ContentMeta()
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    // デスクトップ表示（3カラム）の際、右側が空欄だと中央のリストが右に引き伸ばされて1行の文字数が長くなりすぎる（可読性低下）のを防ぐ防壁
    Component.DesktopOnly(Component.Backlinks()),
  ],
}