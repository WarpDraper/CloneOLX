# 📦 OLX Clone — Fullstack Marketplace

![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> **High-performance marketplace clone.** Жодної води, тільки чиста архітектура та швидкість. Проєкт створений з фокусом на масштабованість та "чистий код".

---

## 🏗 Архітектура (Monorepo)

Проєкт побудований за принципом **Monorepo**, що дозволяє тримати фронтенд, бекенд та спільні пакети в одному місці.

- **`apps/web`** — Frontend на Next.js / React.
- **`apps/api`** — Backend на .NET 10 (Clean Architecture: API, BLL, Domain, Infrastructure).
- **`packages/database`** — Спільний шар даних та міграції.



---

## 🛠 Технологічний стек

| Шар | Технології |
| :--- | :--- |
| **Backend** | .NET 10, Entity Framework Core, JWT, Swagger (Swashbuckle) |
| **Frontend** | React, TypeScript, Tailwind CSS, Axios |
| **Database** | MS SQL Server / PostgreSQL |
| **DevOps** | Docker, Git, GitHub Actions |

---

## 🚀 Основні фічі

- 🔐 **JWT Authentication** — надійна система входу та реєстрації.
- 📢 **Ads Management** — створення, редагування та видалення оголошень.
- 🔍 **Search & Filters** — швидкий пошук товарів за категоріями та ціною.
- 📱 **Responsive Design** — ідеально виглядає як на моніторі, так і на смартфоні.
- ⚡ **Swagger UI** — інтерактивна документація API для зручного тестування.

---

## 🛠 Як запустити

### 1. Клонування репозиторію
```bash
git clone [https://github.com/your-username/olx-project.git](https://github.com/your-username/olx-project.git)
cd olx-project