<h1 align="center">QuantDinger 桌面端前端</h1>

<p align="center">
  <strong>QuantDinger 的桌面 Web 客户端，一个开源 AI Trading OS 的主要操作界面。</strong><br/>
  覆盖行情研究、策略编写、回测、自动化交易、组合管理、账户与运营工作流。
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> |
  <a href="./README_CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="https://github.com/brokermr810/QuantDinger"><img src="https://img.shields.io/badge/Main_Repo-QuantDinger-blue?logo=github" alt="Main Repo" /></a>
  <img src="https://img.shields.io/badge/Vue-2.7-4FC08D?logo=vue.js" alt="Vue 2.7" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite 5" />
  <img src="https://img.shields.io/badge/UI-Ant_Design_Vue-1890ff?logo=ant-design" alt="Ant Design Vue" />
  <img src="https://img.shields.io/badge/License-Source_Available-orange" alt="License" />
</p>

---

## 这个仓库是什么

这是 [QuantDinger](https://github.com/brokermr810/QuantDinger) 的桌面端 Vue 前端源码仓库。QuantDinger 是 **Open Byte Inc** 的产品。

从产品定位上看，QuantDinger 更适合叫 **AI Trading OS**，也就是面向自动化交易的 AI 操作系统，而不是单纯的“量化平台”。它把 AI 市场分析、策略生成、回测、模拟盘交易、实盘执行工作流、交易所 API 管理、计费和运营后台放在同一套系统里。这个仓库负责其中的桌面浏览器界面。

如果你要部署整套系统、查看后端接口、数据库、Docker Compose 或云端部署文档，请优先看主仓库：

- [QuantDinger 主仓库](https://github.com/brokermr810/QuantDinger)
- [云端部署文档](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## 主要能力

- AI 行情分析、资产研究和交易决策辅助
- 策略、指标、图表和代码编辑工作流
- 回测中心、收益曲线、交易记录和结果复盘
- Trading Assistant、Trading Bot、闪电交易和组合视图
- 交易所账户绑定、API Key 管理和执行相关页面
- 会员、积分、支付、后台管理、OAuth、设置和个人中心
- 多语言、主题切换和响应式布局

## 生产部署

如果只是安装使用，不需要本仓库源码，也不需要在服务器上装 Node.js。推荐直接使用主仓库的 Docker Compose，它会拉取已经构建好的前端镜像。

### 推荐：部署完整系统

Linux 或 macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.ps1 | iex
```

桌面端默认访问地址：

```text
http://localhost:8888
```

### 不克隆仓库，直接用 GHCR Compose

```bash
curl -O https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/brokermr810/QuantDinger/main/backend_api_python/env.example
# 对外部署前先编辑 backend.env
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

前端镜像地址：

```text
ghcr.io/brokermr810/quantdinger-frontend
```

常用标签包括 `latest`、`4.0.4` 这样的语义化版本，以及 `4.0` 这样的主次版本标签。需要固定版本时，在主仓库 `.env` 中设置 `IMAGE_TAG`；只想单独固定桌面端前端时，设置 `FRONTEND_TAG`。

### 单独运行桌面端镜像

当后端已经部署在别处时，可以只跑前端容器：

```bash
docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/brokermr810/quantdinger-frontend:latest
```

`BACKEND_URL` 用来控制容器内 Nginx 的 `/api/` 反向代理目标。主仓库 Compose 中通常保持为 `http://backend:5000`。

## 本地开发

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | 推荐 Node 22 LTS。本仓库本身可运行在 Node 18+，但手机端仓库的 Vite 版本要求更高，用 Node 22 可以同时覆盖两个前端仓库。 |
| pnpm | 10.x，通过 Corepack 启用，版本已写在 `package.json`。 |
| 后端 | 默认要求 QuantDinger API 可通过 `http://127.0.0.1:5000` 访问。 |

请使用 `pnpm install` 和仓库里的 `pnpm-lock.yaml`。不要提交 `package-lock.json`。

### 启动开发服务

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install
pnpm run serve
```

浏览器打开：

```text
http://localhost:8000
```

启动前请先确保后端已经运行。你可以在主仓库里用 Docker Compose 启动，也可以按后端 README 运行本地 Python API。

### 开发环境 API 代理

本地开发时，浏览器请求 `/api/*`，由 `vite.config.js` 转发到后端。

默认后端地址：

```text
http://127.0.0.1:5000
```

如果后端跑在别的位置，启动前设置：

```bash
VITE_DEV_PROXY_TARGET=http://127.0.0.1:5000 pnpm run serve
```

开发者工具里看到 `http://localhost:8000/api/...` 是正常现象：浏览器先请求 Vite 开发服务，Vite 再把请求转发给真正的后端。

## 从源码构建

```bash
pnpm run build
pnpm run preview
```

生产构建产物会输出到 `dist/`。

构建本地 Docker 镜像：

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8888:80 -e BACKEND_URL=http://host.docker.internal:5000 quantdinger-frontend:local
```

## 目录结构

```text
QuantDinger-Vue/
├── public/                 # 静态资源和 HTML 入口
├── deploy/                 # Docker 生产环境 Nginx 模板
├── src/
│   ├── api/                # 接口请求模块
│   ├── assets/             # 图片、图标和样式
│   ├── components/         # 通用组件
│   ├── config/             # 应用和路由配置
│   ├── core/               # 启动、认证和应用初始化
│   ├── layouts/            # 页面布局
│   ├── locales/            # 多语言资源
│   ├── router/             # Vue Router
│   ├── store/              # Vuex 状态
│   ├── utils/              # 工具函数、请求拦截、加密辅助
│   └── views/              # 页面模块
├── vite.config.js          # Vite 构建、版本信息和开发代理
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
└── LICENSE
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 2.7、Vue Router、Vuex |
| UI | Ant Design Vue |
| 图表 | KLineCharts、ECharts |
| 编辑器 | CodeMirror 5 |
| 请求 | Axios |
| 多语言 | vue-i18n |
| 构建 | Vite 5、pnpm |
| 样式 | Less、Scoped CSS |

## 常见问题

| 现象 | 排查方向 |
|------|----------|
| Docker 拉镜像卡在 `registry-1.docker.io` | 检查 Docker Desktop 代理是否真的生效，代理端口是否写对。主仓库 `docs/INSTALL_TROUBLESHOOTING.md` 里有中英文排查步骤。 |
| 浏览器打开 Docker manifest 地址显示 `UNAUTHORIZED` | 这通常说明仓库能连通，不代表镜像有问题。`docker pull` 会先获取 token，直接用浏览器打开不是同一个流程。 |
| 本地登录或接口失败 | 确认后端在 `http://127.0.0.1:5000`，或者设置 `VITE_DEV_PROXY_TARGET`。 |
| 容器能启动但接口不通 | 检查 `BACKEND_URL`，以及前端容器在 Docker 内部是否能访问这个地址。 |

## 相关仓库

| 仓库 | 作用 |
|------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | 后端 API、Docker Compose、数据库服务和部署文档 |
| **QuantDinger-Vue** | 本仓库：桌面端 Web 前端源码 |
| [QuantDinger-Mobile](https://github.com/brokermr810/QuantDinger-Mobile) | 手机端和 H5 前端 |

## 许可协议

本仓库使用 **QuantDinger Frontend Source-Available License v1.0**，完整条款见 [`LICENSE`](./LICENSE)。

简单说：符合条款的非商业用途和合格非营利用途可以免费使用；商业用途需要取得 **Open Byte Inc** 的书面授权。请保留版权声明、许可文件和应用内要求保留的 QuantDinger 品牌署名。

## 联系方式

- 官网：[quantdinger.com](https://quantdinger.com)
- Telegram：[t.me/worldinbroker](https://t.me/worldinbroker)
- 邮箱：[support@quantdinger.com](mailto:support@quantdinger.com)
