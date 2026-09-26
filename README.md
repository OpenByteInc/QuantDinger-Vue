<h1 align="center">QuantDinger Web Frontend</h1>

<p align="center">
  <strong>The desktop web workspace for QuantDinger, an AI Trading OS.</strong><br/>
  Research markets, build and validate strategies, run backtests, operate virtual or live deployments, and administer the platform from one browser application.
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> |
  <a href="./README_CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="https://github.com/OpenByteInc/QuantDinger"><img src="https://img.shields.io/badge/Main_Repo-QuantDinger-blue?logo=github" alt="Main repository" /></a>
  <img src="https://img.shields.io/badge/Vue-2.7-4FC08D?logo=vue.js" alt="Vue 2.7" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite 5" />
  <img src="https://img.shields.io/badge/UI-Ant_Design_Vue-1890ff?logo=ant-design" alt="Ant Design Vue" />
  <img src="https://img.shields.io/badge/License-Source_Available-orange" alt="Source-available license" />
</p>

---

## Repository scope

This repository contains the Vue desktop frontend for [QuantDinger](https://github.com/OpenByteInc/QuantDinger), a product of **Open Byte Inc**. It is the browser client only. Backend APIs, workers, databases, Docker Compose definitions, migrations, and operational documentation live in the main repository.

Use the main repository when you want to install or operate the complete platform:

- [QuantDinger main repository](https://github.com/OpenByteInc/QuantDinger)
- [Deployment and operations documentation](https://github.com/OpenByteInc/QuantDinger/tree/main/docs)

The frontend expects a compatible QuantDinger backend. Running this repository by itself provides the UI shell and local mock support, but backend-powered research, strategy, billing, and trading workflows require the API service.

## Current product areas

### Research and market context

- AI asset research with market context, event radar, watchlists, professional reports, and shareable report pages
- Market, sentiment, technical, and fundamental views with ECharts and KLineCharts visualizations
- Reusable universes for stock and crypto research
- Multilingual, light/dark theme, and responsive desktop layouts

### Strategy and indicator authoring

- CTA and portfolio strategy workspaces based on Strategy API V2 contracts
- Indicator editor, indicator marketplace, factor library, templates, parameter forms, and code verification
- AI-assisted strategy editing with source-scoped conversation memory
- Exact code-edit operations for focused changes, automatic application after validation, and changed-line highlighting
- Clear separation between discussion replies, valid code candidates, and generation or validation errors
- Source versions, restore workflows, publish readiness checks, and backtest handoff

### Backtesting and research

- CTA and portfolio backtests with saved history, equity, drawdown, trades, and chart review
- Point-in-time factor research with IC, quantile portfolios, factor correlation, turnover, and fee analysis
- Strategy evolution with asynchronous jobs, user-defined parameter ranges, bar-count walk-forward validation, blind holdouts, robustness scoring, Monte Carlo analysis, and per-strategy history
- Strategy evolution jobs continue on the backend when the user leaves the page

### Trading operations

- Unified strategy runtime for paper, signal-only, and live workflows
- Signal-only virtual accounts with simulated orders, fills, positions, fees, PnL, and equity curves without broker submission
- Live positions, orders, execution records, strategy logs, AI decision records, grid resting orders, and review reports
- Broker account, credential, environment, and account-health management
- Explicit pause, stop, and close-position controls with status feedback

### Platform administration

- Authentication, profile security, billing, credits, notifications, and user management
- Agent token and AI skill administration
- System settings for providers, research sources, branding, and runtime configuration

## Architecture at a glance

```text
Browser
  └── Vue 2.7 single-page application
        ├── /api/* ── Vite proxy (development) ── QuantDinger backend
        ├── /api/* ── Nginx proxy (container) ─── QuantDinger backend
        ├── CodeMirror strategy and indicator editors
        ├── ECharts and KLineCharts visualizations
        └── Pyodide worker for supported browser-side Python tasks
```

The application uses hash-based Vue Router routes. Production containers serve static files through Nginx and proxy `/api/` to `BACKEND_URL`, which keeps browser requests same-origin.

## Production deployment

Most users should deploy the full stack from the main repository. A production installation does not require Node.js or a checkout of this frontend repository when it uses the published image.

### Install the full stack

Linux or macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.ps1 | iex
```

The default desktop URL is:

```text
http://localhost:8888
```

The port can be changed through `FRONTEND_PORT` in the main repository environment configuration.

### Start from the published Compose file

```bash
curl -O https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/backend_api_python/env.example
# Review backend.env before exposing the deployment publicly.
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Published frontend image:

```text
ghcr.io/openbyteinc/quantdinger-frontend
```

Release tags include the full semantic version, major/minor aliases, and `latest`. Pin the complete stack with `IMAGE_TAG`, or set `FRONTEND_TAG` when only the frontend should use a different image tag.

### Run the frontend container alone

Use this only when a compatible backend is already available:

```bash
docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/openbyteinc/quantdinger-frontend:latest
```

`BACKEND_URL` is read at container startup and controls the Nginx `/api/` proxy. In the full Compose stack it normally remains `http://backend:5000`.

### Understand when images are published

Pushing a commit to this repository's `main` branch updates source code, but it does **not** publish a new GHCR image by itself. The release workflow publishes a multi-architecture image when:

- a `v*` release tag is pushed; or
- **Publish frontend image to GHCR** is started manually from GitHub Actions.

A release tag publishes semantic-version aliases and `latest`. A manual run publishes a short-SHA image tag. If a cloud deployment still shows old UI after a source push, confirm whether the host builds directly from Git or pulls a previously published Docker tag.

## Local development

### Requirements

| Tool | Requirement |
|------|-------------|
| Node.js | Node 18 or newer; Node 22 LTS is recommended |
| pnpm | 10.x through Corepack; the exact version is pinned in `package.json` |
| Backend | QuantDinger API at `http://127.0.0.1:5000`, unless the proxy target is overridden |

Use `pnpm` with the committed `pnpm-lock.yaml`. `package-lock.json` is intentionally ignored.

### Install and start

```bash
git clone https://github.com/OpenByteInc/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Open <http://localhost:8000>. Start the backend first, either through the main repository's Docker Compose stack or as a local Python service.

`pnpm run serve` is an alias for the same Vite development server.

### Development API proxy

Browser requests to `/api/*` are proxied by `vite.config.js`. The default target is:

```text
http://127.0.0.1:5000
```

Override it for another backend:

Linux or macOS:

```bash
VITE_DEV_PROXY_TARGET=http://127.0.0.1:5000 pnpm run dev
```

Windows PowerShell:

```powershell
$env:VITE_DEV_PROXY_TARGET = 'http://127.0.0.1:5000'
pnpm run dev
```

Seeing `http://localhost:8000/api/...` in browser developer tools is expected. Vite receives the browser request and forwards it to the configured backend.

### Environment variables

| Variable | Purpose | Typical development value |
|----------|---------|---------------------------|
| `VITE_DEV_PROXY_TARGET` | Vite `/api` and WebSocket proxy target | `http://127.0.0.1:5000` |
| `VITE_ENABLE_MOCK` | Enables modules from `src/mock/services` | `false` |
| `VITE_API_BASE_URL` | Browser API base path | `/api` |
| `VITE_PYTHON_API_BASE_URL` | Optional direct Python API base used by compatible modules | `http://127.0.0.1:5000` |
| `VITE_PYODIDE_CDN_BASE` | Custom Pyodide CDN base | empty for the default |
| `VITE_PYODIDE_LOCAL_BASE` | Self-hosted Pyodide asset base | empty |
| `VITE_PYODIDE_PREFER_CDN` | Prefer CDN assets when both sources exist | empty or `true` |
| `VITE_APP_VERSION` | Explicit version stamped into the build | normally inferred |

Do not put exchange credentials, provider secrets, or private API keys in Vite environment variables. Values prefixed with `VITE_` are compiled into browser assets.

## Build and preview

```bash
pnpm run build
pnpm run preview
```

`pnpm run build` writes production assets to `dist/`. `pnpm run preview` serves them on <http://localhost:8001> and uses the same development proxy target for `/api`.

Build a complete local image from source:

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  quantdinger-frontend:local
```

If `dist/` already exists and pulling a Node builder image is undesirable:

```bash
pnpm run build
docker build -f Dockerfile.prebuilt -t quantdinger-frontend:local .
```

## Quality checks

Run the relevant checks before submitting a change:

```bash
pnpm run lint:nofix
pnpm run test:unit
pnpm run build
pnpm run i18n:audit
```

Additional commands:

| Command | Purpose |
|---------|---------|
| `pnpm run build:preview` | Build with `.env.preview` and mock mode |
| `pnpm run encoding:audit` | Detect invalid text encodings and mojibake |
| `pnpm run i18n:extract` | Regenerate Copilot call-site locale overrides |
| `pnpm run i18n:generate` | Regenerate core locale files |
| `pnpm run lint` | Run ESLint with automatic fixes |
| `pnpm run lint:css` | Run Stylelint with automatic fixes |

The `lint` and `lint:css` commands modify files. Use their non-fixing equivalents or review the diff before committing broad formatting changes.

## Project structure

```text
QuantDinger-Vue/
├── .github/workflows/       # Tagged release and GHCR image workflow
├── deploy/                  # Nginx and Caddy deployment configuration
├── public/                  # Static assets, maps, robots.txt, and HTML shell
├── scripts/                 # Locale generation, translation, and encoding audits
├── src/
│   ├── api/                 # Backend request modules
│   ├── assets/              # Images, icons, and shared assets
│   ├── components/          # Shared UI components
│   ├── config/              # Route and application configuration
│   ├── constants/           # Provider and exchange presentation metadata
│   ├── core/                # Application bootstrapping and permissions
│   ├── layouts/             # Desktop page layouts
│   ├── locales/             # Locale bundles and reviewed overrides
│   ├── mock/                # Optional Vite development mocks
│   ├── router/              # Vue Router initialization
│   ├── services/pyodide/    # Browser Python worker integration
│   ├── shims/               # Compatibility shims used by Vite
│   ├── store/               # Vuex modules and shared state
│   ├── styles/              # Theme and workspace styles
│   ├── utils/               # Formatting, runtime, market, and editor helpers
│   └── views/               # Research, authoring, backtest, trading, and admin pages
├── tests/unit/              # Node test-runner regression tests
├── Dockerfile               # Multi-stage source build and Nginx runtime
├── Dockerfile.prebuilt      # Nginx image from an existing dist directory
├── vite.config.js           # Vite build, proxy, version, and chunk configuration
├── package.json
├── pnpm-lock.yaml
└── LICENSE
```

## Technology

| Layer | Technology |
|-------|------------|
| Framework | Vue 2.7, Vue Router 3, Vuex 3 |
| UI | Ant Design Vue and Ant Design Pro Layout |
| Charts | ECharts 6 and KLineCharts 9 |
| Editors | CodeMirror 5 |
| Browser Python | Pyodide and Comlink |
| Networking | Axios with HTTP and WebSocket-backed workflows |
| Localization | vue-i18n with 11 shipped languages |
| Build | Vite 5 and pnpm 10 |
| Styling | Less and scoped Vue CSS |
| Tests | Node.js built-in test runner |

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| A cloud deployment still shows old frontend code | Determine whether it builds from Git or pulls GHCR. A `main` push alone does not publish `latest`; publish a release/manual image and update the deployed tag. Then verify the image digest and clear browser cache. |
| Login or API requests fail locally | Confirm the backend is listening on `http://127.0.0.1:5000`, or set `VITE_DEV_PROXY_TARGET`. |
| The frontend container starts but API calls fail | Check `BACKEND_URL` from inside the container network. `localhost` inside the frontend container does not refer to the backend container. |
| Long backtests or AI generation time out behind another proxy | Nginx in this image allows ten minutes, but an upstream load balancer or cloud proxy may have a shorter timeout. |
| Docker cannot pull from `registry-1.docker.io` | Configure the Docker daemon/Desktop proxy and follow the main repository's installation troubleshooting guide. |
| A direct browser request to a container manifest returns `UNAUTHORIZED` | That often confirms the registry is reachable. `docker pull` performs a token exchange that a plain browser request does not. |
| pnpm wants to recreate `node_modules` | Ensure the Corepack pnpm version matches the `packageManager` field, then reinstall with `pnpm install --frozen-lockfile`. |

## Related repositories

| Repository | Role |
|------------|------|
| [QuantDinger](https://github.com/OpenByteInc/QuantDinger) | Backend, workers, Docker Compose, databases, and operational documentation |
| **QuantDinger-Vue** | This repository: desktop web frontend |
| [QuantDinger-Mobile](https://github.com/OpenByteInc/QuantDinger-Mobile) | Mobile and H5 frontend |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. Read [`LICENSE`](./LICENSE) before distributing, modifying, or using the software commercially.

Qualified non-commercial and non-profit use is allowed under the license conditions. Commercial use requires a separate written agreement with **Open Byte Inc**. Preserve copyright notices, the license file, and required QuantDinger attribution.

## Contact

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [support@quantdinger.com](mailto:support@quantdinger.com)
