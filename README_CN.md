<h1 align="center">QuantDinger Frontend</h1>
<p align="center">
  <strong>QuantDinger Vue.js 前端源码</strong><br/>
  <strong>AI 原生量化研究、策略、交易与运营工作台的 Web 界面层</strong>
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> ·
  <a href="./README_CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="https://github.com/brokermr810/QuantDinger"><img src="https://img.shields.io/badge/Main_Repo-QuantDinger-blue?logo=github" alt="Main Repo" /></a>
  <img src="https://img.shields.io/badge/Vue-2.x-4FC08D?logo=vue.js" alt="Vue 2" />
  <img src="https://img.shields.io/badge/UI-Ant_Design_Vue-1890ff?logo=ant-design" alt="Ant Design Vue" />
  <img src="https://img.shields.io/badge/Charts-KLineCharts%20%2B%20ECharts-ff6600" alt="Charts" />
  <img src="https://img.shields.io/badge/i18n-10_Languages-green" alt="i18n" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Source_Available-orange" alt="License" /></a>
</p>

<p align="center">
  <a href="https://ai.quantdinger.com">在线演示</a> ·
  <a href="https://github.com/brokermr810/QuantDinger">主仓库</a> ·
  <a href="#部署">部署</a> ·
  <a href="#开发环境">开发</a> ·
  <a href="https://t.me/worldinbroker">Telegram</a> ·
  <a href="#license">许可证</a>
</p>

---

## 概览

本仓库是 QuantDinger 的 Vue.js 前端源码仓库，承载产品的 Web 界面层，负责连接后端能力与用户交互，包括 AI 分析、图表研究、策略开发、回测、交易执行、计费和用户管理等前端工作流。

如果你要查找 Docker Compose 一键部署、后端 API、完整产品说明或正式部署文档，请优先查看主仓库：

- [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger)

## 这个前端仓库提供什么

### 1. 研究与分析工作台

- AI 分析页面，用于结构化市场研究与交易判断支持
- 面向加密货币、股票、外汇等场景的多视图研究界面
- 与后端 Fast Analysis、历史分析、资产研究能力联动
- Polymarket 预测市场分析相关前端界面

### 2. 指标与策略编写体验

- 浏览器内完成 Python 指标与策略编辑
- 自然语言辅助生成代码的产品流程
- 集成专业 K 线图，方便信号检查与策略验证
- 支持趋势线、覆盖物等图表交互工具

### 3. 回测与复盘界面

- 回测中心界面，用于发起、查看和复盘回测结果
- 收益曲线、交易记录、结果摘要和配置回顾
- 与后端策略持久化模型对齐的策略级回测工作流
- 支持研究迭代与策略改进的前端交互链路

### 4. 交易与组合运营

- 交易助手页面，覆盖策略生命周期管理
- 快速交易面板，支持从信号场景直接进入下单流程
- 组合监控页面和虚拟持仓管理
- 交易所账户绑定与执行相关组件

### 5. 平台与商业化界面

- 会员、积分、计费、支付相关页面
- 用户资料、系统设置、管理员视图与 OAuth 流程
- 指标社区与市场化相关页面
- 响应式布局、主题切换与多语言支持

## 部署

**生产环境不需要 Node.js。** 本仓库每次打 `v*` 标签都会向 GHCR 推送多架构 nginx 镜像。大多数用户通过 [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger) 的 Docker Compose 自动拉取该镜像。

| 项目 | 说明 |
|------|------|
| 官方前端镜像 | `ghcr.io/brokermr810/quantdinger-frontend` |
| 常用标签 | `latest`、semver（`4.0.1`）、`{major}.{minor}`（`4.0`） |

可用标签见 [QuantDinger Releases](https://github.com/brokermr810/QuantDinger/releases) 与 [QuantDinger-Vue Releases](https://github.com/brokermr810/QuantDinger-Vue/releases)。

### 方式一 — 主仓库整栈部署（推荐）

最快路径：后端 + 前端 + Postgres + Redis，前端自动从 GHCR 拉取：

```bash
curl -fsSL https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.sh | bash
# 打开 http://localhost:8888，并使用安装器配置的管理员账号登录
```

或克隆主仓库后执行 `docker compose pull && docker compose up -d`。`frontend` 服务使用 `ghcr.io/brokermr810/quantdinger-frontend`，**无需**本地 Vue 源码目录。

文档：[主仓库 README — 两分钟试用](https://github.com/brokermr810/QuantDinger#try-in-2-minutes)

### 方式二 — 仅 GHCR 两文件部署（无需 git clone）

使用主仓库 [`docker-compose.ghcr.yml`](https://github.com/brokermr810/QuantDinger/blob/main/docker-compose.ghcr.yml)：

```bash
curl -O https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/brokermr810/QuantDinger/main/backend_api_python/env.example
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

### 方式三 — 单独拉取并运行前端镜像

适用于后端已在别处运行（Railway、裸机、另一套 Compose）的场景：

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:latest

docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/brokermr810/quantdinger-frontend:latest
```

| 变量 | 说明 |
|------|------|
| `BACKEND_URL` | nginx 转发 `/api/` 时的后端地址。Compose 默认：`http://backend:5000`。Docker Desktop 下若 API 跑在宿主机，用 `http://host.docker.internal:5000`。 |

固定版本而非 `latest`：

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:4.0.1
```

### 固定标签与更新镜像（Compose）

在**主仓库根目录**创建或编辑 `.env`：

```ini
# 前后端锁定同一版本
IMAGE_TAG=4.0.1

# 或仅覆盖前端（后端仍用 IMAGE_TAG / latest）
# FRONTEND_TAG=4.0.1
# BACKEND_TAG=4.0.1
```

标签解析优先级（高者生效）：**`FRONTEND_TAG` → `IMAGE_TAG` → `latest`**。

**更新整栈（含前端）**：

```bash
cd QuantDinger   # 主仓库根目录
docker compose pull
docker compose up -d
```

**仅更新前端**（后端保持运行）：

```bash
docker compose pull frontend
docker compose up -d --no-deps frontend
```

修改 `.env` 中的 `IMAGE_TAG` 或 `FRONTEND_TAG` 后，同样需要 `pull` 再 `up -d`，Compose 才会用新标签重建容器。

**查看当前运行的镜像标签**：

```bash
docker inspect quantdinger-frontend --format '{{.Config.Image}}'
```

### 方式四 — 从本仓库源码构建

| 目标 | 命令 |
|------|------|
| 本地 nginx 镜像 | `docker build -t quantdinger-frontend:local .` 后 `docker run …`（见下） |
| 纯静态 `dist/` | `pnpm run build`，或使用 Release 附带的 **`dist.tar.gz`** |
| 主仓库内联调 | 将本仓克隆到 `./QuantDinger-Vue/` 后 `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build` |

本地 Docker 构建（与 CI 相同 Dockerfile）：

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8080:80 -e BACKEND_URL=http://host.docker.internal:5000 quantdinger-frontend:local
```

构建产物同步到主仓库（不重建镜像）：

```bash
pnpm run build
rm -rf ../frontend/dist/*
cp -r dist/* ../frontend/dist/
docker compose up -d --no-deps frontend
```

```powershell
# PowerShell
pnpm run build
Remove-Item ..\frontend\dist\* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path dist\* -Destination ..\frontend\dist\ -Recurse -Force
docker compose up -d --no-deps frontend
```

### 拉取排错

| 现象 | 处理 |
|------|------|
| `denied` / manifest unknown | 确认 [Releases](https://github.com/brokermr810/QuantDinger/releases) 中存在该 tag；可试 `latest` 或已发布的 semver。 |
| 拉取很慢（国内 / VPN） | 主仓库 `.env` 设 `IMAGE_PREFIX=docker.m.daocloud.io/library/` 加速 Postgres/Redis；GHCR 请在 **Docker Desktop → Proxies** 配置代理。 |
| 私有 fork 镜像 | 先 `docker login ghcr.io`，再在 `.env` 设置 `FRONTEND_IMAGE=ghcr.io/<你的org>/quantdinger-frontend`。 |

---

## 开发环境

### 前置要求

| 要求 | 版本 |
|------|------|
| Node.js | 建议 **18 LTS**（最低 16.13+，需支持 [corepack](https://nodejs.org/api/corepack.html)） |
| pnpm | **10.x** — 版本由 `package.json` 的 `packageManager` 锁定；通过 `corepack enable` 安装 |
| Git | 必需 — 生产构建会从本地仓库写入提交与精确 release tag 信息 |
| Backend | QuantDinger 后端可访问，默认 `http://localhost:5000`（见下文） |

请使用 **`pnpm install`** 并保留仓库中的 **`pnpm-lock.yaml`**。不要提交 `package-lock.json`；仅用 npm 安装可能与 CI/Docker 解析出不同的依赖树。

### 安装与启动

建议使用 **Git 克隆**，这样生产构建可以准确写入 release tag 与 commit 信息。无 `.git` 的源码 ZIP 仍可构建，但会回退到 package/env 版本信息：

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install
pnpm run serve
```

若在主仓库目录内开发（例如 `QuantDinger-Vue-src/`），在本目录下执行相同命令即可。

### 先启动后端

执行 `pnpm run serve` 前，请确保后端在 **5000** 端口可访问。常见方式：

- [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger)：`docker compose up -d`（整栈）或仅启动后端相关服务
- 按主仓库 `backend_api_python/README.md` 本地运行 Python API

### 访问地址

| 方式 | 地址 |
|------|------|
| `pnpm run serve`（本源码目录） | `http://localhost:8000` |
| 主仓库 Docker（GHCR 前端镜像） | `http://localhost:8888` |

登录信息取决于后端配置。安装器会要求配置管理员密码；`123456` 只是不安全的本地兜底值，不建议用于共享或生产环境。

### API 代理

本地开发时，`/api/*` 请求会通过 `vite.config.js` 代理到后端。

- 代理配置文件：`vite.config.js`
- 默认目标地址：`http://localhost:5000`

如果后端运行在其他地址或端口，请在本地环境设置 `VITE_DEV_PROXY_TARGET`，或相应调整代理配置。

### 生产构建（源码）

```bash
pnpm run build
```

构建产物输出到 `dist/`。[QuantDinger-Vue Releases](https://github.com/brokermr810/QuantDinger-Vue/releases) 也可能附带 **`dist.tar.gz`**，便于无 Docker 的静态部署。

---

## 功能模块分布

### 分析与研究页面

- `src/views/ai-analysis/`
- `src/views/ai-asset-analysis/`
- `src/views/dashboard/`
- `src/views/indicator-analysis/`

### 策略、IDE 与回测

- `src/views/indicator-ide/`
- `src/views/backtest-center/`
- `src/views/trading-assistant/`
- `src/views/trading-bot/`

### 执行与组合

- `src/components/QuickTradePanel/`
- `src/views/portfolio/`
- `src/components/ExchangeAccountModal/`

### 计费、社区与用户系统

- `src/views/billing/`
- `src/views/indicator-community/`
- `src/views/settings/`
- `src/views/profile/`
- `src/views/user/`

## 项目结构

```text
QuantDinger-Vue/
├── public/                    # 静态资源与 HTML 壳
├── deploy/                    # Docker / 生产环境 nginx 模板
├── src/
│   ├── api/                   # API 请求模块
│   ├── assets/                # 图片、图标、样式
│   ├── components/            # 通用组件
│   ├── config/                # 应用与路由配置
│   ├── core/                  # 启动、认证、全局初始化
│   ├── layouts/               # 页面布局
│   ├── locales/               # 国际化资源
│   ├── router/                # Vue Router 配置
│   ├── store/                 # Vuex 状态管理
│   ├── utils/                 # 工具、请求拦截器、加密辅助
│   └── views/                 # 页面级模块
├── vite.config.js             # Vite 构建、版本注入与开发代理
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml             # 依赖锁定文件，需与 package.json 一并提交
├── Dockerfile
└── LICENSE
```

## 技术栈

| 层级 | 技术 |
|------|------|
| Framework | Vue 2.x、Vue Router、Vuex |
| UI | Ant Design Vue |
| Charts | KLineCharts、ECharts |
| Editor | CodeMirror 5 |
| Networking | Axios + interceptors |
| i18n | vue-i18n |
| Build | Vite 5、pnpm |
| Styling | Less + scoped CSS |

## 国际化

当前前端通过 `src/locales/lang/` 支持 11 种语言：

| 语言 | 文件 | 语言 | 文件 |
|------|------|------|------|
| English | `en-US.js` | 简体中文 | `zh-CN.js` |
| 繁體中文 | `zh-TW.js` | 日本語 | `ja-JP.js` |
| 한국어 | `ko-KR.js` | Deutsch | `de-DE.js` |
| Français | `fr-FR.js` | ไทย | `th-TH.js` |
| Tiếng Việt | `vi-VN.js` | العربية | `ar-SA.js` |
| Русский | `ru-RU.js` |  |  |

如需新增语言，可参考现有格式新增文件，并在 `src/locales/index.js` 中注册。

## 截图与产品文档

本仓库聚焦前端源码开发。若需查看完整产品截图、视觉导览和正式文档，请参考：

- [主仓库 README](https://github.com/brokermr810/QuantDinger)
- [主仓库 docs](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## 贡献

欢迎贡献。

推荐流程：

1. Fork 本仓库。
2. 创建功能分支，例如 `feature/my-change`。
3. 使用清晰的提交信息完成开发。
4. 推送分支。
5. 发起 Pull Request。

也建议同时参考主仓库的贡献说明：

- [Contributing Guide](https://github.com/brokermr810/QuantDinger/blob/main/CONTRIBUTING.md)

## 社区与支持

| 渠道 | 链接 |
|------|------|
| Telegram | [t.me/worldinbroker](https://t.me/worldinbroker) |
| GitHub Issues | [问题反馈 / 功能建议](https://github.com/brokermr810/QuantDinger/issues) |
| Email | [brokermr810@gmail.com](mailto:brokermr810@gmail.com) |

## License

本仓库采用 **QuantDinger Frontend Source-Available License v1.0**。完整条款见 [`LICENSE`](./LICENSE)。

许可证摘要如下：

- 非商业用途可免费使用。
- 符合条件的非营利机构用途可在许可证定义范围内免费使用。
- 商业用途必须另行获得 QuantDinger 的商业授权。
- 品牌、商标、署名与水印相关内容，未经事先书面许可，不得移除、修改或误导性展示。

| 使用类型 | 成本 | 范围 |
|----------|------|------|
| 非商业用途 | 免费 | 个人学习、研究、教学、内部评估、实验及其他非商业目的 |
| 合格非营利机构用途 | 免费 | 适用于符合条件的非营利组织、认证教育机构和政府资助公共研究机构的使命相关使用 |
| 商业用途 | 需要授权 | 任何涉及商业利益、变现、收费服务或商业产品/服务集成的使用 |

商业授权联系：

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [brokermr810@gmail.com](mailto:brokermr810@gmail.com)

## 法律声明与合规提示

- 本前端及相关 QuantDinger 软件、衍生版本仅可用于合法用途。
- 任何个人或组织不得将本软件用于任何违法、欺诈、滥用、误导、市场操纵、违反制裁、洗钱或其他被法律法规禁止的活动。
- 任何基于 QuantDinger 的商业部署、运营、再分发、转售或服务化提供，均必须遵守使用地所属国家或地区适用的法律法规、许可要求、制裁规则、税务规则、数据保护规则以及相关市场或平台规则。
- 用户应自行判断其使用行为在所属司法辖区是否合法，并自行承担取得审批、备案、披露、牌照或专业法律/税务/合规意见的责任。
- QuantDinger 及其版权方、贡献者、许可方、维护者和相关开源参与方，不提供任何法律、税务、投资、合规或监管意见。
- 在适用法律允许的最大范围内，上述各方对任何因使用或误用本软件而导致的违法使用、监管违规、交易损失、服务中断、执法措施或其他后果，不承担责任。

## 致谢

本前端构建于成熟的开源生态之上：

- [Vue.js](https://vuejs.org/)
- [Ant Design Vue](https://antdv.com/)
- [KLineCharts](https://github.com/klinecharts/KLineChart)
- [ECharts](https://echarts.apache.org/)
- [CodeMirror](https://codemirror.net/)
- [Axios](https://axios-http.com/)
- [vue-i18n](https://kazupon.github.io/vue-i18n/)
- [ant-design-vue-pro](https://github.com/vueComponent/ant-design-vue-pro)

<p align="center">
  如果 QuantDinger 对你有帮助，欢迎给项目点一个 Star。
</p>
