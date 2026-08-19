# 📦 OLX Clone — Fullstack Marketplace Platform

<p>
  <img src="https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 8" />
  <img src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL / Neon" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/SignalR-Realtime-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt="SignalR" />
  <img src="https://img.shields.io/badge/Redis-Cache%20%26%20Backplane-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</p>

> A production-grade OLX-style marketplace, built as a full-stack monorepo: a layered ASP.NET Core Web API backend and a React + TypeScript SPA frontend, with real-time chat, AI-assisted listing creation, and semantic search baked in.

---

## 🧭 Overview

OLX Clone is a two-sided classifieds marketplace where users browse categorized listings, chat with sellers in real time, and manage their account, orders, and notifications from a single dashboard. An admin suite sits alongside the public app for moderation, reporting, and platform operations.

The backend follows a **layered architecture** (API → BLL → DAL) with the repository/specification pattern, JWT-based auth, and a Redis-backed caching and real-time layer so it can scale horizontally behind a load balancer. The frontend is a **Vite-powered React SPA** with Redux Toolkit state, Tailwind CSS v4 styling, and a fully typed API layer.

---

## 🗂 Monorepo Directory Structure

```
CloneOLX/
├── README.md
├── render.yaml                    # Render.com deployment config (API)
│
└── olx-project/
    ├── turbo.json                 # Turborepo pipeline config
    │
    ├── apps/
    │   ├── api/                            # .NET 8 backend — Layered Architecture
    │   │   ├── OLX.API/                    # Presentation layer
    │   │   │   ├── Controllers/            # Account, Advert, Chat, Admin, AI, Order, Report...
    │   │   │   ├── Configuration/          # Middleware, mapping profiles, DB seeding
    │   │   │   ├── Extensions/             # DI / service registration extensions
    │   │   │   ├── Hubs/                   # SignalR hubs (chat, presence, notifications)
    │   │   │   └── Program.cs
    │   │   │
    │   │   ├── Olx.BLL/                    # Business Logic Layer
    │   │   │   ├── Services/               # AccountService, AdvertImageService, ChatService...
    │   │   │   ├── Interfaces/             # Service contracts (IAccountService, IChatService...)
    │   │   │   ├── Specifications/         # Ardalis.Specification query specs
    │   │   │   ├── DTOs / Models/          # Request/response contracts
    │   │   │   ├── Mapper/                 # AutoMapper profiles
    │   │   │   ├── Pagination/             # Generic paging, filtering, sorting
    │   │   │   └── Resources/              # Localized messages (en / uk)
    │   │   │
    │   │   ├── Olx.DAL/                    # Data Access Layer
    │   │   │   ├── Data/                   # OlxDbContext, EF Core entity configs
    │   │   │   ├── Migrations/             # EF Core migrations
    │   │   │   └── Repositories/           # Generic repository + Unit of Work
    │   │   │
    │   │   ├── Olx.BLL.Tests/              # Unit test suite
    │   │   └── Dockerfile
    │   │
    │   └── web/
    │       └── olx-frontend/               # React 19 + Vite SPA
    │           ├── src/
    │           │   ├── components/         # advert/, admin/, common/, inputs/, uploaders/...
    │           │   ├── pages/               # account/, admin/, advert/, user/, info/...
    │           │   ├── layout/              # main/, admin/ layouts (Header, Footer, AdminLayout)
    │           │   ├── services/            # Axios-based API clients per domain
    │           │   ├── store/               # Redux Toolkit slices (auth, presence, notifications)
    │           │   ├── hooks/               # useLiveOnlineStatus, useDebouncedValue...
    │           │   ├── i18n/                # en / uk translations
    │           │   ├── types/               # Shared TS contracts
    │           │   └── utils/
    │           ├── vite.config.ts
    │           └── package.json
    │
    └── .gitignore
```

---

## ✨ Key Features & Modules

### 🔐 Authentication & Access Control
- JWT access tokens with rotating refresh tokens, backed by ASP.NET Core Identity roles.
- **Google OAuth 2.0** sign-in, with automated promotion to the **Admin** role when a signed-in account's email matches the configured master-admin address — no manual role assignment needed.
- **Google reCAPTCHA v3** on auth-sensitive flows to filter out bot traffic without interrupting real users.
- Email confirmation, password reset, and account lockout policies out of the box.

### 🛍️ Marketplace Engine
- Multi-step listing creator with category-aware, dynamic filter fields.
- Client-side **image crop & upload optimization** (`antd-img-crop`) paired with server-side processing via SixLabors.ImageSharp.
- Searchable **category tree** with nested filters, plus **AI-assisted listing autofill** (Google Gemini) that suggests a category and description from just a title.
- Location-aware filtering by region, city/settlement, and Nova Poshta delivery warehouse, using a full Ukrainian address hierarchy.
- Semantic advert search powered by **pgvector** embeddings on PostgreSQL.

### ⚡ Real-Time Communication
- Live buyer↔seller chat and admin support chat via **SignalR**.
- A **Redis backplane** (`StackExchangeRedis`) keeps SignalR groups and broadcasts in sync across every API instance, so real-time features scale horizontally.
- Live online/offline presence tracking, plus a Redis-backed rate limiter and a **FusionCache** L2 distributed cache (Redis) for hot data like categories and adverts.

### 📱 Interactive QR Flow
- A centered modal (Ant Design `Modal`, backdrop-dimmed) renders a shareable QR code (`qrcode.react`) for the current listing or page.
- One-tap "Copy Link" fallback for devices that can't scan, making mobile hand-off between devices seamless.

### 🛠 Admin Suite
- Dashboards for orders, users, sellers, and reports, with charts (sales, status breakdown).
- Moderation tools: user blocking, advert locking/removal, report review, and a live admin chat panel.
- Scheduled background services for token cleanup, stale image cleanup, and admin message expiry.

---

## 🧰 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | ASP.NET Core Web API (.NET 8, C# 12), EF Core 8, ASP.NET Core Identity, JWT Bearer Auth, FluentValidation, AutoMapper, Ardalis.Specification, SignalR, SixLabors.ImageSharp, MailKit, Swashbuckle/Swagger, Google Gemini API |
| **Frontend** | React 19, TypeScript, Vite, Redux Toolkit, React Router, Tailwind CSS v4, Ant Design, i18next, Leaflet, Axios, SignalR client |
| **Database** | PostgreSQL (Neon serverless), pgvector extension, EF Core Migrations |
| **DevOps / Tools** | Docker, Render (API hosting), Redis / Upstash (cache + SignalR backplane + rate limiter), Turborepo, GitHub Actions-ready, Swagger UI |

---

## 🚀 Local Setup & Installation

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) and npm
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) project) with the `vector` extension available
- A Redis instance (e.g. [Upstash](https://upstash.com)) for cache, SignalR backplane, and rate limiting

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/OlxClone.git
cd OlxClone/CloneOLX/olx-project
```

### 2. Backend — `apps/api`
Configure secrets locally with `dotnet user-secrets` (never commit real credentials to `appsettings.json`):

```bash
cd apps/api/OLX.API

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<neon-host>;Database=neondb;Username=<user>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true"
dotnet user-secrets set "ConnectionStrings:Redis:Cache" "<redis-cache-connection-string>"
dotnet user-secrets set "ConnectionStrings:Redis:SignalR" "<redis-signalr-connection-string>"
dotnet user-secrets set "ConnectionStrings:Redis:Limiter" "<redis-limiter-connection-string>"
dotnet user-secrets set "JwtOptions:Key" "<random-256-bit-key>"
dotnet user-secrets set "RecaptchaSecretKey" "<recaptcha-secret-key>"
dotnet user-secrets set "GeminiApiKey" "<gemini-api-key>"
dotnet user-secrets set "NewPostApiKey" "<novaposhta-api-key>"
dotnet user-secrets set "MailSettings:Account" "<smtp-account>"
dotnet user-secrets set "MailSettings:Password" "<smtp-app-password>"
# Optional — omit to fall back to seeder defaults
dotnet user-secrets set "AdminSeed:Email" "<admin-email>"
dotnet user-secrets set "AdminSeed:Password" "<admin-password>"
```

See [`SECRETS.md`](olx-project/apps/api/OLX.API/SECRETS.md) for the full list of keys and the deployed-environment (`__`-separated env var) equivalents.

Then restore, migrate, and run:

```bash
dotnet restore
dotnet ef database update --project ../Olx.DAL --startup-project .
dotnet run
```

The API starts on `https://localhost:5005` (see `Properties/launchSettings.json`) with Swagger UI at `/swagger`.

### 3. Frontend — `apps/web/olx-frontend`

```bash
cd ../../web/olx-frontend
npm install
```

Set the frontend environment (a tracked `.env.development` already points at `http://localhost:5005`). Add reCAPTCHA and any local-only keys to a gitignored `.env.development.local`:

```
VITE_RECAPTCHA_SITE_KEY=<recaptcha-site-key>
```

Then start the dev server:

```bash
npm run dev
```

The SPA runs on `http://localhost:5173` and talks to the API via `VITE_API_BASE_URL`.

### 4. (Optional) Run the API in Docker

```bash
cd apps/api
docker build -t olx-api .
docker run -p 8080:8080 --env-file .env olx-api
```

---

## 📄 License

This project is provided for educational/portfolio purposes.
