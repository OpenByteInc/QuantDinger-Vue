<h1 align="center">QuantDinger Frontend</h1>

<p align="center">
  <strong>Vue.js frontend source for QuantDinger</strong><br/>
  <strong>AI-native quant research, strategy, trading, and operations workspace</strong>
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
  <a href="https://ai.quantdinger.com">Live Demo</a> ·
  <a href="https://github.com/brokermr810/QuantDinger">Main Repository</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#development-setup">Development</a> ·
  <a href="https://t.me/worldinbroker">Telegram</a> ·
  <a href="#license">License</a>
</p>

---

## Overview

This repository contains the Vue.js frontend source code for QuantDinger. It is the web application layer that connects traders, researchers, and operators to the QuantDinger backend for AI analysis, charting, strategy development, backtesting, execution, billing, and user management.

If you are looking for one-click deployment, Docker Compose, backend APIs, or the full product documentation, start with the main repository:

- [QuantDinger main repository](https://github.com/brokermr810/QuantDinger)

## What This Frontend Delivers

### 1. Research and Analysis Workspace

- AI analysis pages for structured market research and decision support
- Multi-view market interfaces for crypto, stocks, forex, and related research flows
- Fast analysis, history review, and asset-research experiences connected to backend services
- Polymarket analysis UI for prediction-market research workflows

### 2. Strategy and Indicator Authoring

- Browser-based Python indicator and strategy editing workflows
- Natural-language assisted code generation experiences
- Professional K-line chart integration for signal inspection and strategy validation
- Drawing tools and chart overlays for discretionary and systematic workflows

### 3. Backtesting and Review

- Backtest Center interfaces for running and reviewing backtests
- Equity curves, trade records, result summaries, and configuration review
- Strategy-linked backtesting flows aligned with the backend persistence model
- UI support for iterative research and strategy refinement

### 4. Trading and Portfolio Operations

- Trading assistant pages for the strategy lifecycle
- Quick trade panel for direct execution from signal contexts
- Portfolio monitoring views and virtual position management
- Exchange account binding and execution-related UI components

### 5. Platform and Commercial Features

- Membership, credits, billing, and payment-related pages
- User profile, settings, role-aware admin views, and OAuth-related flows
- Indicator community and marketplace-oriented interfaces
- Responsive layout, theme switching, and multilingual support

## Deployment

**You do not need Node.js for production.** Every `v*` release on this repo publishes a multi-arch nginx image to GHCR. Most operators pull that image through the [QuantDinger main repository](https://github.com/brokermr810/QuantDinger) Docker Compose stack.

| Image | Registry path |
|-------|----------------|
| Official frontend | `ghcr.io/brokermr810/quantdinger-frontend` |
| Tags | `latest`, semver (`4.0.1`), `{major}.{minor}` (`4.0`) |

See available tags on [QuantDinger Releases](https://github.com/brokermr810/QuantDinger/releases) and [QuantDinger-Vue Releases](https://github.com/brokermr810/QuantDinger-Vue/releases).

### Option 1 — Full stack via main repo (recommended)

Fastest path — backend + frontend + Postgres + Redis, frontend pulled from GHCR automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.sh | bash
# open http://localhost:8888 and sign in with the admin account configured by the installer
```

Or clone the main repo and run `docker compose pull && docker compose up -d`. The `frontend` service uses `ghcr.io/brokermr810/quantdinger-frontend` — no Vue source tree required.

Docs: [main README — Try in 2 minutes](https://github.com/brokermr810/QuantDinger#try-in-2-minutes)

### Option 2 — GHCR-only Compose (two files, no git clone)

From the main repo’s [`docker-compose.ghcr.yml`](https://github.com/brokermr810/QuantDinger/blob/main/docker-compose.ghcr.yml):

```bash
curl -O https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/brokermr810/QuantDinger/main/backend_api_python/env.example
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

### Option 3 — Pull and run the frontend image alone

Useful when the backend already runs elsewhere (Railway, bare metal, another Compose project):

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:latest

docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/brokermr810/quantdinger-frontend:latest
```

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Upstream API base for nginx `/api/` proxy. Default in Compose: `http://backend:5000`. On Docker Desktop use `http://host.docker.internal:5000` when the API runs on the host. |

Pin a release instead of `latest`:

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:4.0.1
```

### Pin and update image tags (Compose)

In the **main repo project root**, create or edit `.env`:

```ini
# Lock both backend and frontend to the same release
IMAGE_TAG=4.0.1

# Or override frontend only (backend keeps IMAGE_TAG / latest)
# FRONTEND_TAG=4.0.1
# BACKEND_TAG=4.0.1
```

Tag resolution (highest wins): **`FRONTEND_TAG` → `IMAGE_TAG` → `latest`**.

**Update to a newer frontend** (full stack):

```bash
cd QuantDinger   # main repo root
docker compose pull
docker compose up -d
```

**Update frontend only** (leave backend running):

```bash
docker compose pull frontend
docker compose up -d --no-deps frontend
```

After changing `IMAGE_TAG` or `FRONTEND_TAG` in `.env`, run `pull` then `up -d` again so Compose recreates the container with the new tag.

**Verify the running tag:**

```bash
docker inspect quantdinger-frontend --format '{{.Config.Image}}'
```

### Option 4 — Build from this source

| Goal | Command |
|------|---------|
| Local nginx image | `docker build -t quantdinger-frontend:local .` then `docker run …` (see below) |
| Static `dist/` only | `pnpm run build` → serve `dist/` or use release **`dist.tar.gz`** |
| Dev inside main repo tree | `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build` with this repo cloned to `./QuantDinger-Vue/` |

Local Docker build (same Dockerfile as CI):

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8080:80 -e BACKEND_URL=http://host.docker.internal:5000 quantdinger-frontend:local
```

Sync built assets into the main repo without rebuilding the image:

```bash
pnpm run build
rm -rf ../frontend/dist/*
cp -r dist/* ../frontend/dist/
docker compose up -d --no-deps frontend   # if using main repo bind-mount path
```

### Pull troubleshooting

| Symptom | Fix |
|---------|-----|
| `denied` / manifest unknown | Confirm the tag exists on [Releases](https://github.com/brokermr810/QuantDinger/releases); try `latest` or a listed semver. |
| Slow pull (China / VPN) | In main repo `.env`: `IMAGE_PREFIX=docker.m.daocloud.io/library/` for Postgres/Redis; configure **Docker Desktop → Proxies** for GHCR. |
| Private fork image | `docker login ghcr.io` then set `FRONTEND_IMAGE=ghcr.io/<your-org>/quantdinger-frontend` in `.env`. |

---

## Development Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | **18 LTS** recommended (16.13+ minimum for [corepack](https://nodejs.org/api/corepack.html)) |
| pnpm | **10.x** — version pinned in `package.json` (`packageManager`); installed via `corepack enable` |
| Git | Required — production builds stamp commit and exact release tag metadata from the local repository |
| Backend | QuantDinger API reachable at `http://localhost:5000` (see below) |

Use **`pnpm install`** with the committed **`pnpm-lock.yaml`**. Do not commit `package-lock.json`; npm installs can resolve a different dependency tree than CI/Docker.

### Install and Run

Clone with Git when possible so release and commit metadata can be stamped accurately. A plain source ZIP can still build, but it falls back to package/env version metadata:

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install
pnpm run serve
```

If you work from a copy inside the main QuantDinger tree (e.g. `QuantDinger-Vue-src/`), run the same commands in this directory instead.

### Start the backend first

Before `pnpm run serve`, ensure the backend answers on port **5000**. Common options:

- [QuantDinger main repository](https://github.com/brokermr810/QuantDinger): `docker compose up -d` (full stack) or backend-related services only
- Local Python API per `backend_api_python/README.md` in the main repo

### Where to open the UI

| Mode | URL |
|------|-----|
| `pnpm run serve` (this source tree) | `http://localhost:8000` |
| Main repo Docker stack (GHCR frontend image) | `http://localhost:8888` |

Login credentials follow backend configuration. The installer prompts for an admin password; `123456` is only an unsafe local fallback and should not be used for shared or production environments.

### API Proxy

In local development, `/api/*` requests are proxied to the backend through `vite.config.js`.

- Proxy config file: `vite.config.js`
- Default backend target: `http://localhost:5000`

If your backend runs elsewhere, set `VITE_DEV_PROXY_TARGET` in your local environment or update the proxy target accordingly.

### Production build (source)

```bash
pnpm run build
```

Output goes to `dist/`. Release assets may also ship as **`dist.tar.gz`** on [QuantDinger-Vue Releases](https://github.com/brokermr810/QuantDinger-Vue/releases) for static hosting without Docker.

---

## Functional Areas

### Analysis and Research Pages

- `src/views/ai-analysis/`
- `src/views/ai-asset-analysis/`
- `src/views/dashboard/`
- `src/views/indicator-analysis/`

### Strategy, IDE, and Backtesting

- `src/views/indicator-ide/`
- `src/views/backtest-center/`
- `src/views/trading-assistant/`
- `src/views/trading-bot/`

### Execution and Portfolio

- `src/components/QuickTradePanel/`
- `src/views/portfolio/`
- `src/components/ExchangeAccountModal/`

### Billing, Community, and User System

- `src/views/billing/`
- `src/views/indicator-community/`
- `src/views/settings/`
- `src/views/profile/`
- `src/views/user/`

## Project Structure

```text
QuantDinger-Vue/
├── public/                    # Static assets and HTML shell
├── deploy/                    # nginx templates for Docker / production proxy
├── src/
│   ├── api/                   # API request modules
│   ├── assets/                # Images, icons, styles
│   ├── components/            # Shared UI components
│   ├── config/                # App and router config
│   ├── core/                  # Bootstrapping, auth, app setup
│   ├── layouts/               # Page layouts
│   ├── locales/               # i18n resources
│   ├── router/                # Vue Router configuration
│   ├── store/                 # Vuex state management
│   ├── utils/                 # Helpers, request interceptors, crypto utils
│   └── views/                 # Page-level modules
├── vite.config.js             # Vite build config, version stamping, and dev proxy
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml             # Lockfile — keep in sync with package.json
├── Dockerfile
└── LICENSE
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 2.x, Vue Router, Vuex |
| UI | Ant Design Vue |
| Charts | KLineCharts, ECharts |
| Editor | CodeMirror 5 |
| Networking | Axios with interceptors |
| i18n | vue-i18n |
| Build | Vite 5, pnpm |
| Styling | Less and scoped CSS |

## Internationalization

QuantDinger frontend currently supports 11 languages through `src/locales/lang/`:

| Language | File | Language | File |
|----------|------|----------|------|
| English | `en-US.js` | 简体中文 | `zh-CN.js` |
| 繁體中文 | `zh-TW.js` | 日本語 | `ja-JP.js` |
| 한국어 | `ko-KR.js` | Deutsch | `de-DE.js` |
| Français | `fr-FR.js` | ไทย | `th-TH.js` |
| Tiếng Việt | `vi-VN.js` | العربية | `ar-SA.js` |
| Русский | `ru-RU.js` |  |  |

To add another language, create a matching file and register it in `src/locales/index.js`.

## Screenshots and Product Docs

This repository focuses on frontend source development. For visual product tours and full product-level documentation, see:

- [Main README](https://github.com/brokermr810/QuantDinger)
- [Main repo docs](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## Contributing

Contributions are welcome.

Recommended workflow:

1. Fork this repository.
2. Create a feature branch such as `feature/my-change`.
3. Commit with clear messages.
4. Push your branch.
5. Open a pull request.

Please also review the main repository contribution guidance:

- [Contributing Guide](https://github.com/brokermr810/QuantDinger/blob/main/CONTRIBUTING.md)

## Community and Support

| Channel | Link |
|---------|------|
| Telegram | [t.me/worldinbroker](https://t.me/worldinbroker) |
| GitHub Issues | [Report bugs / Request features](https://github.com/brokermr810/QuantDinger/issues) |
| Email | [brokermr810@gmail.com](mailto:brokermr810@gmail.com) |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. See [`LICENSE`](./LICENSE) for the full license text.

Summary of the license position:

- Non-Commercial Use is permitted free of charge.
- Qualified Non-Profit Entity use is permitted free of charge within the scope defined by the license.
- Commercial Use requires a separate commercial license from QuantDinger.
- Branding, trademarks, attribution, and watermark notices may not be removed, altered, or misrepresented without prior written permission.

| Use Category | Cost | Scope |
|--------------|------|-------|
| Non-Commercial Use | Free | Personal learning, study, research, teaching, evaluation, experimentation, and similar non-commercial purposes |
| Qualified Non-Profit Entity Use | Free | Mission-aligned use by eligible non-profits, accredited educational institutions, and government-funded public research institutions |
| Commercial Use | License required | Any use involving commercial advantage, monetization, paid service delivery, or commercial product/service integration |

For commercial licensing:

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [brokermr810@gmail.com](mailto:brokermr810@gmail.com)

## Legal Notice and Compliance

- This frontend, and any related QuantDinger software or derivative work, may be used only for lawful purposes.
- No individual or organization may use the software for any unlawful, fraudulent, abusive, deceptive, market-manipulative, sanctions-violating, money-laundering, or otherwise prohibited activity.
- Any commercial deployment, operation, redistribution, resale, or service offering based on QuantDinger must comply with the laws, regulations, licensing requirements, sanctions rules, tax rules, data-protection rules, and market or platform rules applicable in the country or region where it is used.
- Users are solely responsible for determining whether their use is lawful in their jurisdiction and for obtaining any approvals, registrations, disclosures, or professional advice required by applicable law.
- QuantDinger, its copyright holders, contributors, licensors, maintainers, and related open-source participants do not provide legal, tax, investment, compliance, or regulatory advice.
- To the maximum extent permitted by applicable law, all such parties disclaim responsibility and liability for any unlawful use, regulatory breach, trading loss, service interruption, enforcement action, or other consequence arising from the use or misuse of the software.

## Acknowledgements

This frontend builds on a strong open-source ecosystem:

- [Vue.js](https://vuejs.org/)
- [Ant Design Vue](https://antdv.com/)
- [KLineCharts](https://github.com/klinecharts/KLineChart)
- [ECharts](https://echarts.apache.org/)
- [CodeMirror](https://codemirror.net/)
- [Axios](https://axios-http.com/)
- [vue-i18n](https://kazupon.github.io/vue-i18n/)
- [ant-design-vue-pro](https://github.com/vueComponent/ant-design-vue-pro)

<p align="center">
  If QuantDinger helps you, consider giving it a star.
</p>
