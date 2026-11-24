# CivicEvents+ Project

CivicEvents+ is a web platform for local civic life. Residents browse community events and register for them, leave feedback, listen to audio announcements, watch captioned video promos and get notified when something new is published. Administrators manage all of this content and the user accounts from an admin portal with live statistics.

## How the pieces fit

```
┌─────────────────────────┐   HTTPS/JSON + Bearer token   ┌──────────────────────────┐      SQL      ┌──────────────┐
│ frontend/               │ ────────────────────────────► │ backend/                 │ ────────────► │ PostgreSQL   │
│ HTML + Tailwind + jQuery│ ◄──────────────────────────── │ Node.js + Express API    │ ◄──────────── │ 7 tables     │
│ static files, port 5500 │       JSON responses          │ port 4000, /api/...      │               │              │
└─────────────────────────┘                               │ uploads/ (media files)   │               └──────────────┘
                                                          └──────────────────────────┘
```

| Part | What it does | Details |
|------|--------------|---------|
| **`frontend/`** | The user interface: every page, role-based navigation, the audio and video players, forms with upload previews, and admin charts. No build step and no stored data. Everything comes from the API. | [frontend/README.md](frontend/README.md) |
| **`backend/`** | The REST API and the source of truth: authentication (JWT), role checks, validation, file uploads, notifications and dashboards, all on top of PostgreSQL. | [backend/README.md](backend/README.md) |
| **`video-demo/`** | The project walkthrough video. | |

## Who can do what

| | User | Admin |
|---|---|---|
| Browse published events, announcements and promos | ✅ | ✅ (drafts too) |
| Register for or cancel events, leave feedback | ✅ | ✅ |
| Receive notifications, edit own profile | ✅ | ✅ |
| Create, edit, publish and delete content, including YouTube/Vimeo promo links | ❌ | ✅ |
| See attendees and all feedback, enable or disable users, dashboard stats | ❌ | ✅ |

The frontend hides what a role can't use. The **backend enforces it**: admin routes return 403 to users, and disabled accounts can't log in.

## Quick start

You need Node.js 18 or newer, PostgreSQL 15 or newer, and Python 3 (or any static server).

```bash
# 1. Database: create it, then load the schema
psql -U <db-user> -c 'CREATE DATABASE <db-name>;'
psql -U <db-user> -d <db-name> -f backend/migrations/001_create_tables.sql

# 2. Backend: create backend/.env (variable names are in backend/README.md), then
cd backend && npm install && npm run dev        # http://localhost:4000/health

# 3. Frontend, in a second terminal
cd frontend && python3 -m http.server 5500      # http://localhost:5500/index.html
```

Sign up in the app, then promote your account to admin (see [backend/README.md](backend/README.md#2-setup)).

## Secrets

Database credentials and the JWT signing secret live only in `backend/.env`, which git ignores. None of the READMEs contain real values. If a secret is ever exposed, change it.

## Repository layout

```
.
├── README.md          this file
├── .gitignore         ignores IDE settings (.idea/)
├── backend/           Express API, migrations, uploads (has its own .gitignore for .env and node_modules)
├── frontend/          static HTML pages, page scripts, styles
└── video-demo/        demo video
```
