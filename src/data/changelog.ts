export type ChangelogTag = "feat" | "improve" | "fix";

export type ChangelogEntry = {
  /** Date in YYYY-MM-DD, used for sorting and display. */
  date: string;
  tag: ChangelogTag;
  title: string;
  items: string[];
};

export const changelogTagMeta: Record<ChangelogTag, { label: string }> = {
  feat: { label: "新增" },
  improve: { label: "优化" },
  fix: { label: "修复" },
};

/**
 * Site changelog, newest first.
 *
 * To add an entry: prepend an object here and the page picks it up
 * automatically. Keep `date` in YYYY-MM-DD format.
 */
export const changelog: ChangelogEntry[] = [
  {
    date: "2026-11-02",
    tag: "feat",
    title: "站点门面升级：教程、市场矩阵与部署指南",
    items: [
      "新增 /guide 使用教程、/self-host 自部署指南与 /embed 嵌入指南",
      "新增 /market 市场热力图矩阵：沪深 300、中证 A50、中证 A500、上证、深证、主板、创业板、科创板落地页",
      "热力图支持 ?market= 与 ?period= 深度链接参数，可直达指定市场与涨跌周期",
    ],
  },
  {
    date: "2026-10-22",
    tag: "feat",
    title: "支持者致谢与赞赏体验打磨",
    items: [
      "项目设置和 README 新增支持者致谢名单",
      "修复桌面端赞赏码卡片整体悬停触发与悬浮定位问题",
      "优化赞赏码图片加载与缓存",
    ],
  },
  {
    date: "2026-10-16",
    tag: "feat",
    title: "品牌与站点升级：dapan.app",
    items: [
      "全新在线预览域名 dapan.app",
      "顶栏新增 logo，底栏与设置抽屉新增微信赞赏码入口",
      "配置 GitHub Sponsors 与赞赏码 funding",
      "压缩 Open Graph 分享图至 1200×630",
    ],
  },
  {
    date: "2026-09-27",
    tag: "improve",
    title: "行情可靠性与绘制性能",
    items: [
      "接入腾讯行情作为备用源，修复多周期数据不可用",
      "修复周期涨跌数据缺失时的热力图展示",
      "优化热力图加载与绘制性能",
    ],
  },
  {
    date: "2026-09-14",
    tag: "improve",
    title: "渐进式数据加载",
    items: [
      "数据分批渐进加载，热力图更早出图、逐步补全",
      "优化渐进加载的绘制性能",
    ],
  },
  {
    date: "2026-09-10",
    tag: "feat",
    title: "热力图边框设置",
    items: [
      "新增边框显示开关，可在设置中切换",
      "支持 URL 参数 ?borders=on / ?borders=off 直接控制",
    ],
  },
  {
    date: "2026-08-28",
    tag: "feat",
    title: "WebMCP 实验支持",
    items: [
      "新增 11 个浏览器 AI 可调用的工具：读取市场状态、切换视图与筛选、查询个股与板块排行、管理自选股、自定义热力图配色等",
      "优化 PC 端筛选弹窗与移动端筛选面板",
      "新增数据刷新提示与错误处理界面",
      "优化热力图缩放体验与可缩放倍数",
    ],
  },
  {
    date: "2026-08-27",
    tag: "feat",
    title: "自选股管理增强",
    items: ["自选股支持快捷增删", "新增自定义行情刷新频率", "支持自选股 JSON 导入导出"],
  },
  {
    date: "2026-08-24",
    tag: "feat",
    title: "板块缩略图模式",
    items: [
      "新增板块缩略图模式，筛选与桌面底栏可快速切换",
      "标题栏涨跌统计改为可配置设置项",
    ],
  },
  {
    date: "2026-08-21",
    tag: "feat",
    title: "截图 AI 识股",
    items: [
      "浏览器直连视觉模型，从榜单截图识别股票并批量加入自选，配置入口在独立弹层中",
    ],
  },
  {
    date: "2026-08-20",
    tag: "feat",
    title: "自选热力图上线",
    items: [
      "新增用户自选热力图，按名称或代码添加并在设置中管理",
      "新增侧栏收起展开",
      "重构筛选面板：支持涨跌幅区间筛选与可选悬停打开",
    ],
  },
  {
    date: "2026-08-14",
    tag: "feat",
    title: "更多市场范围",
    items: ["新增 A 股主板市场范围", "一级板块支持同时多选"],
  },
  {
    date: "2026-07-22",
    tag: "feat",
    title: "个性化与效率",
    items: [
      "自定义热力图配色主题，内置可删除的趣味配色",
      "常用操作支持可配置快捷键，并可在设置中重映射",
      "设置「项目」页改版，补充作者邮箱与广告位入口",
      "优化底栏与亮色模式",
    ],
  },
  {
    date: "2026-07-17",
    tag: "improve",
    title: "个股与板块交互优化",
    items: [
      "个股弹窗支持多维排序与 sparkline 走势列表",
      "支持单击板块标题聚焦与面包屑返回",
      "修复周/月/年周期仍显示当日涨跌的问题",
    ],
  },
];
