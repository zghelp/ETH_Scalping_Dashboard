# 🚀 ETH Scalping Strategy Dashboard

> 🧠 永续合约量化交易信号系统（基于 Gate.io API + Next.js）

本项目是一个部署在 Vercel 的 ETH 永续合约策略看板，支持实时读取行情并根据 EMA、RSI 和鲸鱼动向等指标生成打分，判断当前是否适合开仓（做多/做空/观望），用于辅助手动或未来自动化交易。

---

## ✨ 功能特点

- ✅ 实时访问 ETH/USDT 永续合约行情（来自 Gate.io）
- ✅ 策略评分系统（基于 EMA5/EMA20, RSI14, 近支撑位等）
- ✅ 模拟鲸鱼行为信号（辅助情绪判断）
- ✅ Web 页面展示评分、建议方向、止盈止损区间
- ✅ 手机适配，方便交易者随时查看
- ✅ 完整支持部署在 [Vercel](https://vercel.com)

---

## 🔧 技术栈

- **前端**：Next.js 14, TypeScript, Tailwind CSS
- **后端策略逻辑**：API 路由 `/api/signal`
- **数据源**：Gate.io REST API（只读 Key）
- **部署平台**：Vercel（支持 Serverless + 环境变量保护）

---

## 🗂️ 目录结构

eth-scalping-dashboard/ 
├── pages/ # 页面与API逻辑 
│ ├── index.tsx # 主界面：展示策略建议 
│ └── api/ 
│ └── signal.ts # 核心API：打分与建议生成 
├── lib/ # 指标与打分逻辑 
│ ├── gateio.ts 
│ ├── indicators.ts 
│ └── score.ts 
├── components/ # UI组件 
│ └── SignalCard.tsx 
├── types/ # 类型定义 
│ └── signal.ts 
├── .env.local.example # 环境变量示例


## 🧪 环境变量配置

请在 `.env.local` 或 Vercel 的「Environment Variables」中设置以下内容：

```env
GATE_READ_API_KEY=your_read_only_key
GATE_READ_API_SECRET=your_read_only_secret

🧭 部署方法（Vercel）
Fork 本仓库或下载源码

登录 vercel.com，导入项目

设置环境变量（见上）

点击部署，1分钟内上线 🎉

✅ TODO（后续计划）
 持仓读取模块（Gate.io 账户状态）

 一键下单按钮（仅开放给私密部署用户）

 历史打分记录与胜率追踪

 Telegram / 微信提醒推送

📄 License
MIT License. Feel free to use and expand under open-source spirit.
