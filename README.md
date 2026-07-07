<h1 align="center">QuantDinger Web Frontend</h1>

<p align="center">
  <strong>Desktop web client for QuantDinger, an open-source AI Trading OS.</strong><br/>
  Research, strategy design, backtesting, automation, portfolio operations, and account workflows in one browser workspace.
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

## What this repo is

This repository contains the Vue desktop web frontend for [QuantDinger](https://github.com/brokermr810/QuantDinger), a product of **Open Byte Inc**.

QuantDinger is better described as an **AI Trading OS** than a narrow "quant platform": it combines AI-assisted market analysis, strategy creation, backtesting, simulated trading, live execution workflows, exchange API management, billing, and operations tools. This repo is the main browser interface for those workflows.

For backend APIs, Docker Compose deployment, database services, and project-level documentation, start from the main repository:

- [QuantDinger main repository](https://github.com/brokermr810/QuantDinger)
- [Cloud deployment guide](https://github.com/brokermr810/QuantDinger/tree/main/docs)

## Feature areas

- AI market analysis, asset research, and assistant-style decision support
- Strategy and indicator authoring with chart inspection and code editing
- Backtest center with result review, trade records, and equity curves
- Trading assistant, trading bot, quick trade, and portfolio views
- Exchange account binding and API key management UI
- Membership, credits, billing, admin, OAuth, settings, and profile pages
- Multilingual UI, theme switching, and responsive layouts

## Production deployment

Most users should deploy the full QuantDinger stack from the main repo. You do **not** need Node.js or this source tree for production if you use the published Docker images.

### Full stack, recommended

Linux or macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.ps1 | iex
```

The main stack serves the desktop web app at:

```text
http://localhost:8888
```

### GHCR Compose without cloning the repo

```bash
curl -O https://raw.githubusercontent.com/brokermr810/QuantDinger/main/docker-compose.ghcr.yml
curl -o backend.env https://raw.githubusercontent.com/brokermr810/QuantDinger/main/backend_api_python/env.example
# edit backend.env before public deployment
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

The frontend image used by the stack is:

```text
ghcr.io/brokermr810/quantdinger-frontend
```

Common tags are `latest`, semantic versions such as `4.0.4`, and major/minor tags such as `4.0`. Pin a release in the main repo `.env` with `IMAGE_TAG`, or override only this service with `FRONTEND_TAG`.

### Run this frontend image alone

Use this when the backend is already running somewhere else:

```bash
docker run -d --name quantdinger-frontend \
  -p 8888:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/brokermr810/quantdinger-frontend:latest
```

`BACKEND_URL` controls the Nginx `/api/` proxy inside the container. In the main Compose stack it normally stays as `http://backend:5000`.

## Local development

### Requirements

| Tool | Version |
|------|---------|
| Node.js | Node 22 LTS recommended. This repo can run on Node 18+, but Node 22 also matches the mobile repo's newer Vite requirement. |
| pnpm | 10.x, enabled through Corepack. The version is pinned in `package.json`. |
| Backend | QuantDinger API reachable at `http://127.0.0.1:5000`, unless you override the dev proxy. |

Use `pnpm install` with the committed `pnpm-lock.yaml`. Avoid committing `package-lock.json`.

### Start the app

```bash
git clone https://github.com/brokermr810/QuantDinger-Vue.git
cd QuantDinger-Vue
corepack enable
pnpm install
pnpm run serve
```

Open:

```text
http://localhost:8000
```

Start the backend first. You can run it from the main repo through Docker Compose, or run the Python API locally according to the backend README.

### API proxy in development

Local `/api/*` requests are proxied by `vite.config.js`.

Default target:

```text
http://127.0.0.1:5000
```

Override it when needed:

```bash
VITE_DEV_PROXY_TARGET=http://127.0.0.1:5000 pnpm run serve
```

If DevTools shows `http://localhost:8000/api/...`, that is normal. The browser calls Vite on port `8000`, then Vite forwards the request to the backend.

## Build from source

```bash
pnpm run build
pnpm run preview
```

`pnpm run build` writes production assets to `dist/`.

To build a local Docker image:

```bash
docker build -t quantdinger-frontend:local .
docker run --rm -p 8888:80 -e BACKEND_URL=http://host.docker.internal:5000 quantdinger-frontend:local
```

## Project structure

```text
QuantDinger-Vue/
├── public/                 # Static assets and HTML shell
├── deploy/                 # Nginx templates for Docker production proxy
├── src/
│   ├── api/                # API request modules
│   ├── assets/             # Images, icons, and styles
│   ├── components/         # Shared UI components
│   ├── config/             # App and router configuration
│   ├── core/               # Bootstrapping, auth, and app setup
│   ├── layouts/            # Page layouts
│   ├── locales/            # i18n resources
│   ├── router/             # Vue Router configuration
│   ├── store/              # Vuex state
│   ├── utils/              # Helpers, request interceptors, crypto utilities
│   └── views/              # Page-level modules
├── vite.config.js          # Vite build, version stamping, and dev proxy
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
└── LICENSE
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Vue 2.7, Vue Router, Vuex |
| UI | Ant Design Vue |
| Charts | KLineCharts, ECharts |
| Editor | CodeMirror 5 |
| Networking | Axios |
| i18n | vue-i18n |
| Build | Vite 5, pnpm |
| Styling | Less and scoped CSS |

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| Docker pull times out on `registry-1.docker.io` | Configure Docker Desktop proxy and verify the proxy port. The main repo has `docs/INSTALL_TROUBLESHOOTING.md` with bilingual steps. |
| Browser returns `UNAUTHORIZED` for a Docker registry manifest URL | That usually means the registry is reachable. Docker obtains an auth token during `docker pull`; direct browser access is not the same flow. |
| Login or API calls fail in local dev | Confirm the backend is running on `http://127.0.0.1:5000`, or set `VITE_DEV_PROXY_TARGET`. |
| Container starts but API calls fail | Check `BACKEND_URL` and whether the frontend container can reach that address from inside Docker. |

## Related repositories

| Repository | Role |
|------------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | Backend API, Docker Compose, database services, deployment docs |
| **QuantDinger-Vue** | This repository: desktop web frontend source |
| [QuantDinger-Mobile](https://github.com/brokermr810/QuantDinger-Mobile) | Mobile and H5 frontend |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. See [`LICENSE`](./LICENSE) for the full text.

In short: non-commercial and qualified non-profit use is allowed under the license conditions; commercial use requires a separate written agreement with **Open Byte Inc**. Preserve copyright notices, the license file, and required QuantDinger attribution.

## Contact

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [support@quantdinger.com](mailto:support@quantdinger.com)
