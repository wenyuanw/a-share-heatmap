export type BoardScopeInfo = {
  /** URL slug, also used as the ?sector= deep-link value into the heatmap. */
  slug: string;
  /** Sector display name — must match `sectorName` in market-heatmap-subboards.json. */
  name: string;
  tagline: string;
  description: string;
  keywords: string[];
  highlights: string[];
};

/**
 * Landing page copy for first-level industry boards. `name` is matched
 * verbatim against the treemap board names (from subboards.json), and the
 * `slug` becomes the ?sector= deep-link value; see src/data/boards.test.ts
 * for the guard that keeps the two in sync.
 */
export const boardScopes: BoardScopeInfo[] = [
  {
    slug: "bank",
    name: "银行",
    tagline: "A 股权重基石，利率与信用的风向标",
    description:
      "银行板块热力图汇集 A 股全部上市银行，国有大行与股份制银行占据大色块，是沪深两市最重要的权重基石。板块整体涨跌与利率环境、信贷数据和市场对经济周期的预期高度相关。",
    keywords: ["银行板块热力图", "银行板块行情", "银行股涨跌", "大金融板块"],
    highlights: [
      "国有大行色块大且波动小，是观察大盘「压舱石」情绪的基准",
      "板块整体走强往往伴随利率下行或经济预期修复，单独走弱则需留意防御情绪升温",
      "配合「近 20 日」周期，观察银行与成长板块之间的跷跷板效应",
    ],
  },
  {
    slug: "electronics",
    name: "电子",
    tagline: "半导体与消费电子的景气晴雨表",
    description:
      "电子板块热力图覆盖半导体、消费电子、元件、光学光电子等子行业，是 A 股市值最大的行业之一。板块内部子行业多、龙头集中，芯片产业链与消费电子的景气变化会直接体现在色块颜色上。",
    keywords: ["电子板块热力图", "半导体板块行情", "芯片板块涨跌", "消费电子板块"],
    highlights: [
      "半导体与芯片设计子板块弹性最大，产业周期与国产化主线的影响一眼可见",
      "消费电子龙头的异动常与新品周期和出货预期联动",
      "用涨跌幅区间筛选聚焦当日异动，快速判断是板块性行情还是个股行为",
    ],
  },
  {
    slug: "pharma",
    name: "医药生物",
    tagline: "长坡厚雪赛道，政策与创新的博弈场",
    description:
      "医药生物板块热力图覆盖化学制药、生物制品、医疗器械、中药等子行业，成分股数量多、市值跨度大。板块表现受集采政策、创新药进展与医疗设备更新等多重因素驱动，内部结构分化明显。",
    keywords: ["医药板块热力图", "医药板块行情", "创新药板块涨跌", "医疗器械板块"],
    highlights: [
      "化学制药与生物制品的创新药主线，龙头色块的位置变化反映资金共识",
      "医疗器械与医疗服务的估值修复节奏，在「今年以来」周期里看得更清楚",
      "中药等防御型子行业在市场避险时往往相对抗跌",
    ],
  },
  {
    slug: "food-beverage",
    name: "食品饮料",
    tagline: "白酒与消费核心资产的集中营",
    description:
      "食品饮料板块热力图以白酒为绝对权重核心，贵州茅台等大色块主导板块走向，啤酒、乳品、调味品与休闲食品构成第二梯队。作为典型的消费核心资产板块，它与外资偏好和消费预期高度联动。",
    keywords: ["食品饮料板块热力图", "白酒板块行情", "消费板块涨跌", "茅台宁德色块"],
    highlights: [
      "白酒龙头的色块变化基本决定板块整体表现，是观察「核心资产」情绪的窗口",
      "大众品子行业的相对强弱，反映消费复苏的结构与节奏",
      "市场风格转向防御时，食品饮料常与高股息板块同步走强",
    ],
  },
  {
    slug: "power-equipment",
    name: "电力设备",
    tagline: "新能源产业链的景气晴雨表",
    description:
      "电力设备板块热力图覆盖光伏、风电、锂电与电网设备等新能源产业链，宁德时代等龙头色块巨大。板块高弹性、高波动，产业政策、排产数据与技术路线变化都会迅速反映在色块颜色上。",
    keywords: ["电力设备板块热力图", "新能源板块行情", "锂电光伏板块涨跌", "宁德时代色块"],
    highlights: [
      "锂电、光伏、风电三条产业链的相对强弱，就是新能源内部的结构轮动",
      "龙头股异动对板块整体影响显著，适合结合个股详情观察",
      "高波动特征下，配合涨跌幅区间筛选能快速定位当日异动环节",
    ],
  },
  {
    slug: "computer",
    name: "计算机",
    tagline: "AI 与信创浪潮的主战场",
    description:
      "计算机板块热力图覆盖软件开发、计算机设备、IT 服务等方向，是 AI 应用、信创与数字经济主题的核心阵地。板块以中小市值公司为主，题材驱动特征明显，波动幅度大。",
    keywords: ["计算机板块热力图", "AI 板块行情", "信创板块涨跌", "软件板块热力图"],
    highlights: [
      "AI 应用、算力与信创三条主线的情绪切换，在板块内部色块上直观可见",
      "小市值高弹性特征明显，适合搭配当日周期捕捉主题行情",
      "板块整体走强往往代表市场风险偏好回升",
    ],
  },
  {
    slug: "auto",
    name: "汽车",
    tagline: "电动化与智能化浪潮的核心赛道",
    description:
      "汽车板块热力图覆盖整车、汽车零部件与汽车服务，新能源整车龙头色块显著。板块同时受销量数据、智能化进展与出海逻辑驱动，零部件公司的客户结构带来持续的分化行情。",
    keywords: ["汽车板块热力图", "汽车板块行情", "新能源车板块涨跌", "汽车零部件板块"],
    highlights: [
      "新能源整车与传统整车、零部件之间的强弱切换反映产业竞争格局变化",
      "零部件子行业数量多，跟随大客户的行情分化明显，适合下钻观察",
      "出海与智能化主题的阶段性发酵，可在「近 20 日」周期里清晰追踪",
    ],
  },
  {
    slug: "non-bank-financial",
    name: "非银金融",
    tagline: "市场风险偏好的放大器：券商与保险",
    description:
      "非银金融板块热力图覆盖证券、保险与多元金融，是市场风险偏好最直接的放大器。券商股色块在行情启动期往往集体走强，保险股则与长端利率和权益市场表现高度相关。",
    keywords: ["非银金融板块热力图", "券商板块行情", "保险板块涨跌", "大金融板块"],
    highlights: [
      "券商股的集体异动常被视为行情信号，色块整齐泛红值得重点关注",
      "保险股走势兼具金融防御与权益弹性双重属性",
      "与银行同属大金融，对照观察可判断资金在大金融内部的取舍",
    ],
  },
];

export function getBoardScope(slug: string): BoardScopeInfo | undefined {
  return boardScopes.find((board) => board.slug === slug);
}

/** Maps a ?sector= slug to the treemap board name; unknown slugs return undefined. */
export function getBoardNameBySlug(slug: string): string | undefined {
  return getBoardScope(slug)?.name;
}
