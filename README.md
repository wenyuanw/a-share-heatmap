# A 股市场热力图

用一张可交互的市场云图观察 A 股全市场涨跌、板块轮动和权重分布。适合做成独立站点、个人看盘工具，或作为财经数据产品里的市场概览模块。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_GITHUB_USERNAME/a-share-heatmap)

![A 股市场热力图预览](./public/preview.png)

## 功能亮点

- **全市场云图**：按行业和流通市值权重绘制 A 股矩形树图，越大的色块代表越高的市场权重。
- **涨跌一眼可见**：红绿配色映射个股涨跌幅，底部图例帮助快速判断行情强弱。
- **多市场范围**：支持 A 股全图、上证 A 股、深证 A 股、沪深 300、中证 A500、创业板、科创板。
- **多周期表现**：支持当日、近 5 日、近 20 日、今年以来等涨跌区间切换。
- **交互式看盘**：支持滚轮缩放、拖拽平移、悬浮查看个股详情、双击跳转雪球。
- **市场概览面板**：展示上涨、平盘、下跌家数，以及成交额和相对昨日的量能变化。
- **截图分享**：一键生成热力图快照，支持下载、复制图片和系统分享。
- **部署友好**：基于 Next.js API Routes 获取行情快照，短缓存适合 Vercel Serverless 环境。

## 适合场景

- 做一个公开的 A 股热力图网站
- 给个人投资仪表盘增加市场概览页
- 学习 Canvas 绘制大规模矩形树图
- 作为财经可视化项目的基础模板

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看页面。

## 一键部署

将项目推送到 GitHub 后，把上方 Vercel 按钮中的 `YOUR_GITHUB_USERNAME` 替换成你的 GitHub 用户名或组织名，即可通过 Vercel 克隆并部署。

也可以在 Vercel 控制台导入仓库。项目无需配置环境变量。

## 常用命令

```bash
pnpm dev        # 本地开发
pnpm build      # 生产构建
pnpm start      # 启动生产服务
pnpm lint       # ESLint 检查
pnpm typecheck  # TypeScript 类型检查
```

## 数据说明

项目会优先请求公开行情快照，并在服务端做秒级缓存，减少页面刷新时的接口压力。当远端数据不可用时，会自动使用 `src/lib/data` 中的内置样本快照，确保页面仍可正常打开。

## 技术栈

- Next.js App Router
- React
- Canvas 2D
- Tailwind CSS
- Vercel Serverless Functions

## License

MIT
