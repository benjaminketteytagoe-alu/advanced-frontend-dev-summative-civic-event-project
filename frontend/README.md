# CivicEvents+ — Frontend (UI Implementation)

An accessible, responsive frontend for the CivicEvents+ API, built with **HTML, Tailwind CSS and jQuery only** (no build step).
It covers authentication, role-based access (admin vs user), events with registration and feedback, audio announcements, captioned video promos, in-app notifications, user profiles, and an admin dashboard with charts.

Artwork and avatars are generated with the [DiceBear](https://www.dicebear.com) HTTP API. All animation is CSS and jQuery and respects `prefers-reduced-motion`.
Several effects are hand ported from [Pixel Perfect UI](https://github.com/vansh-nagar/Pixel-Perfect) by Vansh Nagar (MIT, <https://www.pixel-perfect.space>); see section 7.

---

## 1. Requirements

| Tool | Why |
|------|-----|
| The backend in `../backend` running (Node 18+, PostgreSQL 15+) | The UI consumes its REST API |
| Any static file server | Serves the HTML pages (examples below) |
| A modern browser (Chrome, Edge, Firefox, Safari 16.4+) | |
| Internet access | Tailwind, jQuery, Google Fonts and DiceBear load from CDNs |

## 2. Start the backend

Follow `../backend/README.md`. In short:

```bash
cd backend
# 1. create the database and tables
psql -U <db-user> -h <db-host> -p <db-port> -c 'CREATE DATABASE "civic-events-db";'
psql -U <db-user> -h <db-host> -p <db-port> -d civic-events-db -f ./migrations/001_create_tables.sql
# 2. set DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME and JWT_SECRET in backend/.env
# 3. install and run
npm install
npm run dev        # → http://localhost:4000
```

Check it's up: <http://localhost:4000/health> should return `{"ok":true,...}`.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Sign-up or login says *“We couldn’t reach the CivicEvents+ server at http://localhost:4000/api”* | The backend isn't running. Start it with `npm run dev` in `backend/` and keep that terminal open. The footer's **API online / unreachable** dot shows the live status. |
| Backend prints `password authentication failed for user "postgres"` | `DB_PASS` in `backend/.env` doesn't match your Postgres password. Set one with `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpass';"` and put the same value in `.env`. |
| Backend prints `database "civic-events-db" does not exist` | Create it with `CREATE DATABASE "civic-events-db";`. The quotes are required because of the hyphens. |
| Backend prints `relation "users" does not exist` | Run `migrations/001_create_tables.sql` against the database (see step 1 above). |
| `Cannot find module 'express'` | Run `npm install` in `backend/`. |
| `npm run db:setup` fails | It reads `$DB_PASSWORD` (not `DB_PASS`) from your shell, not from `.env`. Use the `psql` commands above instead. `db:seed` and `db:reset` need `002_seed_data.sql`, which isn't in the project. |
| The UI talks to the wrong port | You may have opened a page with `?api=...` once; it is remembered. Open `index.html?api=http://localhost:4000/api` to reset it. |

## 3. Run the frontend

Serve the `frontend` folder with any static server, then open the printed URL.

```bash
cd frontend

# option A — Python (built into most systems)
python3 -m http.server 5500

# option B — Node
npx serve -l 5500 .

# option C — VS Code "Live Server" extension: right-click index.html → Open with Live Server
```

Then visit **<http://localhost:5500/index.html>**.

> Use a server rather than opening files directly with `file://`, so that browser storage and CORS behave consistently.

## 4. Connecting to the backend (API base URL)

The default API base URL is **`http://localhost:4000/api`**, defined in `app.js` (`DEFAULT_API`). There is no build step, so there is no `.env` file for the frontend. Instead, you can change the URL in any of these ways:

| Method | Example |
|--------|---------|
| Query string (remembered in localStorage) | `http://localhost:5500/index.html?api=http://192.168.1.20:4000/api` |
| Global variable before `app.js` | `<script>window.CIVIC_API_BASE = 'https://api.example.com/api'</script>` |
| Edit the constant | `var DEFAULT_API = '…'` in `app.js` |

The footer of every page shows a live **API online / unreachable** indicator, based on `GET /health`.

Uploaded media (event images, announcement audio and promo videos) are served by the backend from `${origin}/uploads/...`. The UI uses the URLs exactly as the API returns them (for example `metadata.image_url` for events).

## 5. Creating an admin account

Self-signup always creates a normal **user**, because the UI never sends a `role`. To get an administrator for testing, sign up through the UI and then promote that account in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Sign out and back in to pick up the new role. Admins land on the dashboard (`admin.html`) after login.

## 6. Pages

| Page | Who | API used |
|------|-----|----------|
| `index.html` | everyone | landing page for visitors; personal dashboard (`/dashboard/me`) when signed in |
| `signup.html`, `login.html` | guests | `/auth/signup`, `/auth/login` |
| `events.html` | users | `/events`, `/event-registrations/my-registrations` (search, date and location filters, sorting, pagination) |
| `event.html?id=` | users | event detail, map, register/cancel, feedback; registrants list for admins |
| `event-form.html[?id=]` | **admin** | create/edit with image upload (`image`), preview and progress bar |
| `announcements.html`, `announcement.html?id=` | users | list with inline play; accessible custom audio player |
| `announcement-form.html[?id=]` | **admin** | audio upload (`audio`), publish toggle |
| `promos.html`, `promo.html?id=` | users | lazy-loaded thumbnails; `<video>` with a captions `<track>` and interactive transcript, or the embedded YouTube/Vimeo player for linked promos |
| `promo-form.html[?id=]` | **admin** | video upload (`video`) **or** a YouTube/Vimeo link (`video_link`), plus captions with a live preview |
| `notifications.html` | users | inbox with detail view and links to related items; delete for admins |
| `my-registrations.html` | users | ticket-style list with cancel |
| `profile.html` | users | edit name and email; role and status are read-only |
| `search.html?q=` | users | global search across events, announcements and promos |
| `admin.html` | **admin** | KPIs and four SVG charts (`/dashboard/admin`), auto-refreshes every 60 seconds |
| `admin-users.html` | **admin** | list users, view profile, enable/disable (no role editing) |
| `admin-content.html` | **admin** | every event, announcement and promo, including unpublished ones; publish toggles |
| `admin-notifications.html` | **admin** | delete form, per-row and bulk delete |

## 7. Code structure (flat, no sub-folders)

| File | Purpose |
|------|---------|
| `tw-config.js` | Tailwind theme (colours, fonts, shadows) |
| `styles.css` | Component classes, motion system, skeletons, focus styles, reduced-motion fallbacks |
| `app.js` | Core `CE` namespace: config, **auth context**, API client, error handling, **role guards**, cache, notifications, layout, UI kit |
| `components.js` | Shared cards, actions (register, delete, publish), form kit, caption builder, admin sidebar |
| `fx.js` | Motion effects (`CE.fx`): odometer numbers, success ripple, card tilt with glare |
| `page-*.js` | One script per page |

### Effects ported from Pixel Perfect UI

The originals are React components that need framer-motion. These versions are rebuilt with CSS and jQuery only, so no extra library is added. All of them are switched off or flattened when the visitor prefers reduced motion.

| Pixel Perfect component | Class / function | Used on |
|---|---|---|
| `star-border` | `.star-border` | Event detail sidebar card, landing-page hero ticket |
| `crop-marks` | `.crop-marks` (768px and wider) | Event detail cover, promo video player |
| `focus-brackets` | `.focus-brackets`, `.focus-brackets--reticle` | Admin and home stat tiles (hover/focus), profile avatar |
| `milestone-odometer` | `CE.fx.odometer($el, value)` | Admin key figures and home stats; live refreshes roll on from the previous value |
| `success-ripple-animation` | `CE.fx.success()` | After registering for an event |
| `tilt-card-glare` | `.tilt` | Event and promo cards (mouse/trackpad only) |

### Promo videos: upload or link

Admins choose **Upload a file** (MP4, MOV, AVI or MKV up to 8 MB) or **Paste a YouTube or Vimeo link** on the promo form. Links like `youtu.be/…`, `youtube.com/watch?v=…`, `/shorts/…` and `vimeo.com/…` are accepted.

* The backend checks the link (`backend/src/utils/videoLink.js`) and stores it in the existing `video_url` column in a standard form, so the database didn't change.
* Linked promos play inside the app in the provider's own player (YouTube's privacy-enhanced `youtube-nocookie.com` embed, captions on by default). The caption text is shown as the transcript. Cards use YouTube's thumbnail and show a *YouTube* or *Vimeo* badge.
* Only YouTube and Vimeo are accepted, so the app never embeds pages from unknown sites.

## 8. Where the role-based access guards are

Search the code for `ROLE`, `GUARD` and `ADMIN-ONLY`. There are three layers, all documented in comments in `app.js`, section 5:

1. **Page guard.** Each page sets `<body data-auth="public | guest | user | admin">`, and `CE.guard.page()` checks it before any page code runs. Signed-out visitors are sent to login. Normal users who open an admin page see a 403 panel, and that page's script never initialises, so no admin API calls are made.
2. **Element guard.** Markup marked `data-role="admin"`, `"user"`, `"guest"` or `"auth"` is **removed from the DOM** by `CE.guard.apply()` when the role doesn't match.
3. **Action guard.** `CE.guard.can('event:edit')` and similar checks are used wherever admin or user-only buttons are generated (`components.js`, `page-event.js`, …) and again inside each handler before a request is sent.

The frontend checks only improve the experience. The backend's `authorize(['admin'])` middleware is the real security boundary. If a request is forbidden anyway, the API returns 403 and the UI shows an **Access restricted** dialog with a **Contact admin** option.

## 9. Auth and session behaviour

* **Keep me signed in** unticked (default) stores the token in `sessionStorage`, which clears when the tab closes. Ticked stores it in `localStorage`, which persists. The trade-off is explained on the login form: persistent tokens are exposed to any script on the origin, so all rendered data is HTML-escaped.
* Every protected request sends `Authorization: Bearer <token>`.
* The backend's JWTs last 1 hour. The UI reads `exp` from the token and signs the user out with a message when it expires. Any `401` response does the same and redirects to `login.html?next=…`.
* On each page load the profile is refreshed in the background. Accounts disabled by an admin are signed out.

## 10. UX and accessibility notes

* Semantic landmarks, a skip link, visible focus rings, `aria-live` regions for results and toasts, and dialogs and drawers that trap focus and close with Esc.
* Audio player: real buttons and sliders with labels, `aria-valuetext` on the seek bar, keyboard shortcuts (Space/K, ←/→, J/L, M), and a fallback download link.
* Promos: captions are **on by default**, with a toggle button, an interactive transcript, and native fullscreen and volume controls.
* Mobile-first responsive layouts, skeleton loaders, error states with **Try again**, and toasts with **Retry** for network or 5xx errors.
* Files are checked for size and type **before** upload (image 2 MB, audio 5 MB, video 8 MB, matching the backend's multer limits), and uploads show a progress bar.
* Optimistic updates (registration, publish toggles, enable/disable, notification read and delete) roll back if the request fails.
* Event, announcement and promo lists are cached in `sessionStorage` for 2 minutes. The cache is cleared on create, update and delete.
* Chart colours were checked for colour-blind safety, and every figure is also available as a table.

## 11. Known backend limitations (handled in the UI)

| Limitation | How the UI handles it |
|------------|-----------------------|
| No "mark notification as read" endpoint | Read state is stored per user in `localStorage`, updated optimistically |
| No endpoint to create a broadcast notification | Broadcasts are sent automatically when admins publish events, announcements or promos; the admin panel manages and deletes them |
| `GET /event-feedback/event/:id` is admin-only | Admins see the average and every review. Users see and edit their own review (one per event) |
| Events ignore `published` on create/update, and there is no publish endpoint | The toggle is sent anyway; status is shown read-only in the admin content list |
| Re-registering after a cancellation returns 409 | Shown as a clear message asking the user to contact the organiser |
| Announcements don't store `duration_seconds` or transcripts | Duration is read from the audio file's metadata; the transcript section offers a request link |
| Promo captions are plain `caption_text`, not a `.vtt` file | Converted into a WebVTT `<track>` in the browser (sentences timed across the video, or pasted WebVTT used as-is) |
| Login doesn't block disabled accounts | The UI checks `is_active` after login and on each page load, and signs disabled users out |
