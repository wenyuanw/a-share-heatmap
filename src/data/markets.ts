export type MarketScopeInfo = {
  /** URL slug, also used as the ?market= deep-link value. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  keywords: string[];
  highlights: string[];
};

/**
 * Landing page copy for each heatmap market scope. The `slug` must match the
 * `markets` keys used by the heatmap (see src/lib/i18n.ts) so that
 * /market/[slug] can deep-link into the tool with ?market=slug.
 */
export const marketScopes: MarketScopeInfo[] = [
  {
    slug: "hs300",
    name: "沪深 300",
    tagline: "A 股核心资产的风向标",
    description:
      "沪深 300 热力图收录沪深两市规模最大、流动性最好的 300 只龙头股，覆盖金融、消费、能源、医药等核心行业，是观察 A 股大盘权重走向最直接的一张图。",
    keywords: ["沪深300热力图", "沪深300云图", "沪深300行情", "A股权重股"],
    highlights: [
      "按流通市值绘制色块，工商银行、贵州茅台、宁德时代等权重股一览无余",
      "单只权重股异动对指数的影响一目了然，适合判断大盘当日强弱",
      "搭配近 5 日、近 20 日周期，观察核心资产的中期轮动",
    ],
  },
  {
    slug: "zza50",
    name: "中证 A50",
    tagline: "五十家行业龙头，中国版「漂亮 50」",
    description:
      "中证 A50 热力图聚焦 50 家各行业的龙头企业，全部是耳熟能详的超大盘核心资产。色块数量少、单块面积大，是快速查看龙头共识走势的极简视图。",
    keywords: ["中证A50热力图", "中证A50云图", "A50行情", "行业龙头股"],
    highlights: [
      "仅 50 个色块，打开即读，适合盘前快速过一遍龙头状态",
      "真实成分股权重绘制，龙头涨跌与指数的关系直观可见",
      "适合作为自选热力图的补充：先看龙头，再看自己的持仓",
    ],
  },
  {
    slug: "zza500",
    name: "中证 A500",
    tagline: "行业均衡的新一代宽基",
    description:
      "中证 A500 热力图按行业均衡覆盖 500 只市值较大的证券，兼顾规模与行业代表性。相比沪深 300，它更完整地呈现各行业的内部结构，是观察宽基行情的新视角。",
    keywords: ["中证A500热力图", "中证A500云图", "A500行情", "宽基指数"],
    highlights: [
      "500 个色块在行业间均衡分布，避免金融权重独大的失真",
      "适合对比沪深 300：同样一天，行业结构有何不同",
      "下钻单个一级行业，查看行业内部的分化与集中度",
    ],
  },
  {
    slug: "sse",
    name: "上证 A 股",
    tagline: "沪市全景，主板权重集中地",
    description:
      "上证 A 股热力图覆盖上海证券交易所全部 A 股。银行、能源、白酒等传统权重板块集中在沪市，这张图是观察大盘蓝筹与国企板块的主战场。",
    keywords: ["上证热力图", "沪市云图", "沪市A股行情", "大盘蓝筹"],
    highlights: [
      "银行、石油石化等权重板块的涨跌对沪指的影响清晰可见",
      "适合与深证 A 股热力图对照，观察沪深两市的强弱分化",
      "支持从全市场下钻到单个一级行业板块",
    ],
  },
  {
    slug: "szse",
    name: "深证 A 股",
    tagline: "深市全景，科技与制造的主场",
    description:
      "深证 A 股热力图覆盖深圳证券交易所全部 A 股。电子、电力设备、医药等成长板块权重更高，这张图更适合观察科技制造方向的市场情绪。",
    keywords: ["深证热力图", "深市云图", "深市A股行情", "科技股行情"],
    highlights: [
      "电子、新能源、医药等成长行业权重集中，成长股情绪一目了然",
      "与上证 A 股热力图对照，快速判断沪深风格切换",
      "宁德时代、比亚迪等权重股的异动直接反映在色块上",
    ],
  },
  {
    slug: "main",
    name: "A 股主板",
    tagline: "沪深主板，稳健权重的基本盘",
    description:
      "A 股主板热力图合并展示沪深两市主板股票，剔除创业板与科创板。主板市值大、波动相对温和，是观察市场基本盘和低估值板块的窗口。",
    keywords: ["A股主板热力图", "主板云图", "主板行情", "低估值板块"],
    highlights: [
      "剔除高波动板块，专注主板蓝筹与白马股的结构",
      "适合观察银行、白酒、家电等传统行业的轮动节奏",
      "波动相对温和，适合作为大盘情绪的基准视图",
    ],
  },
  {
    slug: "cyb",
    name: "创业板",
    tagline: "创新成长，高弹性高波动",
    description:
      "创业板热力图聚焦创业板全部股票，以新能源、医药、TMT 等创新成长企业为主。板块弹性大、波动高，色块的红绿变化往往比主板更激烈。",
    keywords: ["创业板热力图", "创业板云图", "创业板行情", "成长股"],
    highlights: [
      "宁德时代等权重股带动整个板块，异动一眼可见",
      "高弹性板块的涨跌幅度映射更鲜明，适合盯成长股情绪",
      "搭配涨跌幅区间筛选，快速定位当日异动标的",
    ],
  },
  {
    slug: "kcb",
    name: "科创板",
    tagline: "硬科技集中营",
    description:
      "科创板热力图展示科创板全部股票，半导体等硬科技行业权重高度集中。板块波动幅度最大，是观察科技自主主线情绪的最佳窗口。",
    keywords: ["科创板热力图", "科创板云图", "科创板行情", "半导体板块"],
    highlights: [
      "半导体产业链权重集中，芯片行情的风向标",
      "全市场波动最大的板块之一，色块颜色变化最具戏剧性",
      "适合搭配当日涨跌周期，捕捉科技主线的日内情绪",
    ],
  },
];

export function getMarketScope(slug: string): MarketScopeInfo | undefined {
  return marketScopes.find((scope) => scope.slug === slug);
}
