<h1 align="center">QuantDinger 桌面端前端</h1>

<p align="center">
  <strong>QuantDinger AI Trading OS 的桌面 Web 工作台。</strong><br/>
  在一个浏览器应用中完成行情研究、策略编写与校验、回测、虚拟或实盘运行以及平台管理。
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> |
  <a href="./README_CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="https://github.com/OpenByteInc/QuantDinger"><img src="https://img.shields.io/badge/Main_Repo-QuantDinger-blue?logo=github" alt="主仓库" /></a>
  <img src="https://img.shields.io/badge/Vue-2.7-4FC08D?logo=vue.js" alt="Vue 2.7" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite 5" />
  <img src="https://img.shields.io/badge/UI-Ant_Design_Vue-1890ff?logo=ant-design" alt="Ant Design Vue" />
  <img src="https://img.shields.io/badge/License-Source_Available-orange" alt="源码可用许可" />
</p>

---

## 仓库范围

本仓库包含 [QuantDinger](https://github.com/OpenByteInc/QuantDinger) 的 Vue 桌面端前端源码。QuantDinger 是 **Open Byte Inc** 的产品。本仓库只负责浏览器客户端；后端 API、Worker、数据库、Docker Compose、迁移和运维文档位于主仓库。

安装或运行完整系统时，请使用：

- [QuantDinger 主仓库](https://github.com/OpenByteInc/QuantDinger)
- [部署与运维文档](https://github.com/OpenByteInc/QuantDinger/tree/main/docs)

前端需要配套版本的 QuantDinger 后端。单独运行本仓库只能提供 UI 外壳和本地 Mock 能力；行情研究、策略、计费和交易等工作流需要后端 API。

## 当前产品能力

### 研究与市场上下文

- AI 资产研究、市场上下文、事件雷达、自选列表、专业报告与报告分享页
- 使用 ECharts 和 KLineCharts 展示行情、情绪、技术面与基本面数据
- 可复用的股票和加密货币标的池
- 多语言、亮色/暗色主题和桌面端响应式布局

### 策略与指标开发

- 基于 Strategy API V2 契约的 CTA 与组合策略工作台
- 指标编辑器、指标市场、因子库、模板、参数表单和代码校验
- 带源码级会话记忆的 AI 策略协作
- 对局部需求生成精确代码修改，校验通过后自动应用，并高亮发生变化的代码行
- 明确区分问答、有效代码候选和生成/校验错误
- 源码版本、恢复、发布前检查和一键转入回测

### 回测与研究

- CTA 与组合回测，包含历史记录、净值、回撤、交易记录和图表复盘
- 时点化因子研究，包含 IC、分层组合、因子相关性、换手和费用分析
- 策略进化：异步任务、自定义参数区间、按 K 线数量滚动验证、盲测、稳健性评分、蒙特卡洛分析和按策略隔离的研究历史
- 离开页面后，策略进化任务继续在后端运行

### 交易运行

- 统一管理模拟、仅信号和实盘策略
- 仅通知模式虚拟账户：模拟委托、成交、持仓、手续费、盈亏和净值，不向券商或交易所提交订单
- 实盘持仓、订单、成交记录、策略日志、AI 决策记录、网格挂单和复盘报告
- 券商账户、凭证、环境和账户健康状态管理
- 带状态反馈的暂停、停止和平仓控制

### 平台管理

- 登录、个人资料安全、计费、积分、通知和用户管理
- Agent Token 与 AI 技能管理
- 数据提供商、研究源、品牌和运行配置等系统设置

## 架构概览

```text
浏览器
  └── Vue 2.7 单页应用
        ├── /api/* ── Vite 代理（开发环境）── QuantDinger 后端
        ├── /api/* ── Nginx 代理（容器环境）── QuantDinger 后端
        ├── CodeMirror 策略与指标编辑器
        ├── ECharts 与 KLineCharts 图表
        └── Pyodide Worker，执行受支持的浏览器端 Python 任务
```

应用使用 Hash 模式的 Vue Router。生产容器通过 Nginx 提供静态文件，并把 `/api/` 转发到 `BACKEND_URL`，使浏览器接口请求保持同源。

## 生产部署

大多数用户应从主仓库部署完整系统。使用已发布镜像时，服务器不需要安装 Node.js，也不需要检出本前端仓库。

### 安装完整系统

Linux 或 macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.ps1 | iex
```

桌面端默认地址：

```text
http://localhost:8888
```

可以在主仓库的环境配置中通过 `FRONTEND_PORT` 修改端口。

### 使用已发布的 Compose 文件

```bash
curl -O https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/backend_api_python/env.example
# 对外开放前，请检查并修改 backend.env。
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

前端镜像：

```text
ghcr.io/openbyteinc/quantdinger-frontend
```

正式发布会生成完整语义化版本标签、主次版本别名以及 `latest`。使用 `IMAGE_TAG` 固定整套系统版本；只需要单独指定前端版本时，使用 `FRONTEND_TAG`。

### 单独运行前端容器

只应在已经有兼容后端时使用：

```bash
docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/openbyteinc/quantdinger-frontend:latest
```

容器启动时读取 `BACKEND_URL`，并用它配置 Nginx 的 `/api/` 代理。完整 Compose 中通常保持为 `http://backend:5000`。

### 镜像什么时候发布

向本仓库 `main` 分支推送提交只会更新源码，**不会自动发布新的 GHCR 镜像**。以下情况才会运行多架构镜像发布流程：

- 推送符合 `v*` 的正式版本标签；或
- 在 GitHub Actions 中手动运行 **Publish frontend image to GHCR**。

正式版本标签会发布语义化版本别名和 `latest`；手动运行只发布短 SHA 标签。如果云端在源码推送后仍显示旧页面，应先确认云平台是直接从 Git 构建，还是一直拉取旧的 Docker 标签。

## 本地开发

### 环境要求

| 工具 | 要求 |
|------|------|
| Node.js | Node 18 或更高版本，推荐 Node 22 LTS |
| pnpm | 通过 Corepack 使用 pnpm 10.x；准确版本已固定在 `package.json` |
| 后端 | 默认通过 `http://127.0.0.1:5000` 访问 QuantDinger API，也可以修改代理目标 |

请使用 `pnpm` 和仓库中的 `pnpm-lock.yaml`。`package-lock.json` 已被有意忽略。

### 安装并启动

```bash
git clone https://github.com/OpenByteInc/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

浏览器打开 <http://localhost:8000>。启动前请先运行后端，可以使用主仓库 Docker Compose，也可以直接运行本地 Python 服务。

`pnpm run serve` 与上述 Vite 开发服务器命令等价。

### 开发环境 API 代理

浏览器发出的 `/api/*` 请求由 `vite.config.js` 转发。默认目标：

```text
http://127.0.0.1:5000
```

使用其他后端时可以覆盖：

Linux 或 macOS：

```bash
VITE_DEV_PROXY_TARGET=http://127.0.0.1:5000 pnpm run dev
```

Windows PowerShell：

```powershell
$env:VITE_DEV_PROXY_TARGET = 'http://127.0.0.1:5000'
pnpm run dev
```

开发者工具中出现 `http://localhost:8000/api/...` 属于正常现象。浏览器先请求 Vite，再由 Vite 转发到真正的后端。

### 环境变量

| 变量 | 用途 | 常见开发值 |
|------|------|------------|
| `VITE_DEV_PROXY_TARGET` | Vite 的 `/api` 与 WebSocket 代理目标 | `http://127.0.0.1:5000` |
| `VITE_ENABLE_MOCK` | 是否启用 `src/mock/services` | `false` |
| `VITE_API_BASE_URL` | 浏览器 API 基础路径 | `/api` |
| `VITE_PYTHON_API_BASE_URL` | 部分兼容模块可使用的 Python API 地址 | `http://127.0.0.1:5000` |
| `VITE_PYODIDE_CDN_BASE` | 自定义 Pyodide CDN 地址 | 留空使用默认值 |
| `VITE_PYODIDE_LOCAL_BASE` | 自托管 Pyodide 资源地址 | 留空 |
| `VITE_PYODIDE_PREFER_CDN` | 同时存在两种资源时优先使用 CDN | 留空或 `true` |
| `VITE_APP_VERSION` | 写入构建产物的明确版本号 | 通常自动推导 |

不要把交易所凭证、服务商密钥或私有 API Key 写入 Vite 环境变量。所有以 `VITE_` 开头的值都会编译进浏览器资源。

## 构建与预览

```bash
pnpm run build
pnpm run preview
```

`pnpm run build` 把生产资源写入 `dist/`。`pnpm run preview` 在 <http://localhost:8001> 提供预览，并对 `/api` 使用相同的开发代理目标。

从源码构建完整本地镜像：

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  quantdinger-frontend:local
```

如果已经生成 `dist/`，并希望跳过 Node Builder 镜像：

```bash
pnpm run build
docker build -f Dockerfile.prebuilt -t quantdinger-frontend:local .
```

## 质量检查

提交改动前，请运行与改动范围相符的检查：

```bash
pnpm run lint:nofix
pnpm run test:unit
pnpm run build
pnpm run i18n:audit
```

其他命令：

| 命令 | 用途 |
|------|------|
| `pnpm run build:preview` | 使用 `.env.preview` 和 Mock 模式构建 |
| `pnpm run encoding:audit` | 检查错误编码和乱码 |
| `pnpm run i18n:extract` | 重新生成 Copilot 调用点多语言覆盖 |
| `pnpm run i18n:generate` | 重新生成核心语言文件 |
| `pnpm run lint` | 运行 ESLint 并自动修改文件 |
| `pnpm run lint:css` | 运行 Stylelint 并自动修改文件 |

`lint` 和 `lint:css` 会修改文件。进行大范围格式化前，应使用不自动修复的检查方式，或者在提交前认真检查差异。

## 目录结构

```text
QuantDinger-Vue/
├── .github/workflows/       # 正式版本和 GHCR 镜像发布流程
├── deploy/                  # Nginx 与 Caddy 部署配置
├── public/                  # 静态资源、地图、robots.txt 和 HTML 外壳
├── scripts/                 # 多语言生成、翻译和编码检查脚本
├── src/
│   ├── api/                 # 后端接口请求模块
│   ├── assets/              # 图片、图标和共享资源
│   ├── components/          # 通用 UI 组件
│   ├── config/              # 路由和应用配置
│   ├── constants/           # 服务商和交易所展示元数据
│   ├── core/                # 应用启动与权限控制
│   ├── layouts/             # 桌面端页面布局
│   ├── locales/             # 语言包和人工审核的覆盖项
│   ├── mock/                # 可选的 Vite 开发环境 Mock
│   ├── router/              # Vue Router 初始化
│   ├── services/pyodide/    # 浏览器 Python Worker 集成
│   ├── shims/               # Vite 使用的兼容层
│   ├── store/               # Vuex 模块与共享状态
│   ├── styles/              # 主题和工作区样式
│   ├── utils/               # 格式化、运行时、市场和编辑器工具
│   └── views/               # 研究、开发、回测、交易和管理页面
├── tests/unit/              # Node Test Runner 回归测试
├── Dockerfile               # 多阶段源码构建与 Nginx 运行镜像
├── Dockerfile.prebuilt      # 使用现有 dist 构建 Nginx 镜像
├── vite.config.js           # Vite 构建、代理、版本和分包配置
├── package.json
├── pnpm-lock.yaml
└── LICENSE
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 2.7、Vue Router 3、Vuex 3 |
| UI | Ant Design Vue 与 Ant Design Pro Layout |
| 图表 | ECharts 6、KLineCharts 9 |
| 编辑器 | CodeMirror 5 |
| 浏览器 Python | Pyodide、Comlink |
| 请求 | Axios，以及基于 HTTP 与 WebSocket 的工作流 |
| 多语言 | vue-i18n，内置 11 种语言 |
| 构建 | Vite 5、pnpm 10 |
| 样式 | Less、Vue Scoped CSS |
| 测试 | Node.js 内置 Test Runner |

## 常见问题

| 现象 | 排查方向 |
|------|----------|
| 云端仍显示旧前端 | 确认云平台是从 Git 构建还是拉取 GHCR。只推送 `main` 不会发布新的 `latest`；需要发布正式/手动镜像并更新部署标签，然后核对镜像摘要并清理浏览器缓存。 |
| 本地登录或接口请求失败 | 确认后端监听 `http://127.0.0.1:5000`，或者设置 `VITE_DEV_PROXY_TARGET`。 |
| 前端容器能启动但接口不通 | 从容器网络内检查 `BACKEND_URL`。前端容器中的 `localhost` 并不代表后端容器。 |
| 长回测或 AI 生成被超时中断 | 本镜像 Nginx 允许十分钟，但上层负载均衡器或云代理可能配置了更短的超时。 |
| Docker 无法从 `registry-1.docker.io` 拉取 | 配置 Docker daemon/Desktop 代理，并参考主仓库安装故障排查文档。 |
| 浏览器直接打开容器 manifest 显示 `UNAUTHORIZED` | 这通常说明仓库可达。`docker pull` 会执行浏览器普通请求没有的 Token 交换。 |
| pnpm 要求重建 `node_modules` | 确认 Corepack 使用的 pnpm 版本与 `packageManager` 一致，然后执行 `pnpm install --frozen-lockfile`。 |

## 相关仓库

| 仓库 | 作用 |
|------|------|
| [QuantDinger](https://github.com/OpenByteInc/QuantDinger) | 后端、Worker、Docker Compose、数据库与运维文档 |
| **QuantDinger-Vue** | 本仓库：桌面 Web 前端 |
| [QuantDinger-Mobile](https://github.com/OpenByteInc/QuantDinger-Mobile) | 手机端与 H5 前端 |

## 许可协议

本仓库使用 **QuantDinger Frontend Source-Available License v1.0**。分发、修改或商业使用前，请阅读 [`LICENSE`](./LICENSE)。

符合条款的非商业用途和合格非营利用途可以使用；商业用途需要取得 **Open Byte Inc** 的书面授权。请保留版权声明、许可文件以及协议要求的 QuantDinger 品牌署名。

## 联系方式

- 官网：[quantdinger.com](https://quantdinger.com)
- Telegram：[t.me/worldinbroker](https://t.me/worldinbroker)
- 邮箱：[support@quantdinger.com](mailto:support@quantdinger.com)
