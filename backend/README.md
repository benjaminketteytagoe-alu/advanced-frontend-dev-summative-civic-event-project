# CivicEvents+ API (backend)

The backend is a **REST API built with Node.js, Express 5 and PostgreSQL**. It holds all of CivicEvents+'s data and rules. The frontend in `../frontend` never talks to the database. Everything goes through this API.

What it does:

- **Accounts:** sign-up and login with bcrypt-hashed passwords and JWTs that last 1 hour. Every account has the role `user` or `admin`.
- **Access control:** every route except sign-up and login needs a valid token. Admin-only routes are also wrapped in `authorize(['admin'])`. Accounts an admin has disabled can't log in, and their existing tokens stop working.
- **Content:**
  - events, with an image upload
  - audio announcements
  - video promos, as an uploaded file or a YouTube or Vimeo link
  - Admins create, edit and publish all of these. Users only see published items.
- **Engagement:**
  - users register for events and cancel registrations
  - users leave one review per event
  - admins see each event's attendees and reviews
- **Service requests:** people report a problem such as a broken street light, and admins change its status and reply.
- **Notifications:** publishing content sends an in-app notification to every user.
- **Dashboards:** user and admin dashboards are built from aggregate queries.
- **File uploads:** multer saves uploads to `uploads/`, and they're served at `/uploads/...`.

---

## 1. Requirements

| Tool | Version |
|------|---------|
| Node.js | 18 or newer |
| PostgreSQL | 15 or newer |
| Postman (optional) | for trying the API by hand: import `CivicEvents+ API.postman_collection.json` |

## 2. Setup

```bash
cd backend
npm install
```

**Create the database and tables.** The database name is up to you; use the same one in `.env`.

```bash
psql -U <db-user> -h <db-host> -p <db-port> -c 'CREATE DATABASE <db-name>;'
psql -U <db-user> -h <db-host> -p <db-port> -d <db-name> -f ./migrations/001_create_tables.sql
psql -U <db-user> -h <db-host> -p <db-port> -d <db-name> -f ./migrations/003_service_requests.sql
```

The migration uses `IF NOT EXISTS`, so it's safe to run again.

**Add sample data (optional).** This adds sample events, an announcement, a promo, reviews and notifications. The sample people can't log in. Running it again adds nothing.

```bash
psql -U <db-user> -h <db-host> -p <db-port> -d <db-name> -f ./migrations/002_seed_data.sql
```

**Configure the environment.** Create `backend/.env`. The file is in `.gitignore` and **must never be committed**. Here are the names; fill in your own values:

```ini
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=<db-name>
DB_USER=<db-user>
DB_PASS=<your-db-password>

# Secret used to sign login tokens. Use a long random string, e.g.
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<long-random-string>

# Optional
PORT=4000
NODE_ENV=development
```

**Run it:**

```bash
npm run dev     # nodemon, restarts on changes
npm start       # plain node
```

When it's running you'll see `CivicEvents+ backend listening on port 4000`. To check it, open <http://localhost:4000/health>, which returns `{"ok":true,...}`.

> Once `.env` is filled in, you can run `npm run db:setup` for the tables and `npm run db:seed` for the sample data. They use the settings in `.env`, so `psql` isn't needed. Create the database itself first.

**Make an admin.** Sign-up always creates a `user`. To make an admin, promote the account in the database, then log out and back in:

```sql
UPDATE users SET role = 'admin' WHERE email = '<their-email>';
```

---

## 3. How a request flows

```
request ─► app.js (morgan logging, CORS, JSON/form parsing, /uploads static)
        ─► src/routes/index.routes.js        mounts everything under /api
        ─► src/routes/<area>.routes.js       per-area routes
             ├─ authenticate                 checks the JWT, loads the user, rejects disabled accounts
             ├─ authorize(['admin'])         admin-only routes
             ├─ upload.single('image'|...)   multer, for routes with files
             └─ validateBody                 express-validator rules
        ─► src/controllers/<area>.controller.js   request/response logic
        ─► src/models/<area>.model.js             parameterised SQL through pg
        ─► PostgreSQL
errors ─► src/middlewares/errorHandler.middleware.js   one JSON error format
```

| Folder | Role |
|--------|------|
| `server.js` | Loads `.env`, checks the database connection and starts listening |
| `app.js` | Express app: middleware, `/api` routes, `/uploads`, `/health` |
| `src/config/db.js` | The `pg` connection pool, configured from the `DB_*` variables |
| `src/routes/` | Maps URLs to controllers and adds the auth, upload and validation middleware |
| `src/controllers/` | Handles each endpoint and sends `{ status, message, data, pagination? }` |
| `src/models/` | All SQL, always parameterised (`$1, $2…`), so input is never pasted into a query |
| `src/middlewares/` | `auth` (JWT + roles), `upload` (multer limits and types), `validateBody`, `errorHandler` |
| `src/utils/` | `files.js` (uploaded files), `serviceTypes.js` (kinds of service request) and `videoLink.js` (checks YouTube and Vimeo links) |
| `migrations/` | `001_create_tables.sql`: the schema, `002_seed_data.sql`: sample data, `003_service_requests.sql`: the service requests table |
| `uploads/` | Uploaded files (git-ignored, created when needed) |

## 4. Database

There are eight tables. The first seven are in `migrations/001_create_tables.sql`, and `service_requests` is in `003_service_requests.sql`:

| Table | Holds |
|-------|-------|
| `users` | `full_name`, email, password hash, `role` (`user`/`admin`), `is_active` |
| `events` | title, description, location, start and end times, `metadata` (e.g. `image_url`), `published` |
| `event_registrations` | which user is registered for which event, with a status |
| `event_feedback` | one rating and comment per user per event |
| `announcements` | title, `audio_url`, `published` |
| `promos` | title, description, `video_url` (an uploaded file or a YouTube/Vimeo link), `caption_text`, `published` |
| `notifications` | title, message, type, `recipient_id` (`NULL` sends it to everyone), `metadata` |
| `service_requests` | who sent it, type, location, description, status (`open`, `in_progress`, `done`, `declined`) and the admin's reply |

## 5. Endpoints

Every path starts with `/api`. Every route except sign-up and login needs a token. Routes after "Admin only:" are for admins.

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/signup`, `POST /auth/login` (returns 403 for disabled accounts) |
| Users | `GET`/`PATCH /users/profile/me` · Admin only: `GET /users`, `GET /users/:id`, `PATCH /users/:id/enable`, `PATCH /users/:id/disable` |
| Events | `GET /events`, `GET /events/:id` · Admin only: `POST /events`, `PUT /events/:id`, `DELETE /events/:id` (file field `image`) |
| Registrations | `POST /event-registrations/register`, `POST /event-registrations/cancel`, `GET /event-registrations/my-registrations` · Admin only: `GET /event-registrations/event/:event_id/attendees` |
| Feedback | `POST /event-feedback`, `PUT /event-feedback/:id`, `GET /event-feedback/my-feedback` · Admin only: `GET /event-feedback/event/:event_id` |
| Announcements | `GET /announcements`, `GET /announcements/:id` · Admin only: `POST`, `PUT /:id`, `PATCH /:id/publish`, `PATCH /:id/unpublish`, `DELETE /:id` (file field `audio`) |
| Promos | `GET /promos`, `GET /promos/:id` · Admin only: `POST`, `PUT /:id`, `PATCH /:id/publish`, `PATCH /:id/unpublish`, `DELETE /:id` (file field `video` **or** body field `video_link`) |
| Notifications | `GET /notifications`, `GET /notifications/:id` · Admin only: `DELETE /notifications/:id` |
| Service requests | `GET /service-requests/types`, `GET /service-requests/mine`, `POST /service-requests` · Admin only: `GET /service-requests`, `PATCH /service-requests/:id` (tells the sender) |
| Dashboard | `GET /dashboard/me` · Admin only: `GET /dashboard/admin` |

## 6. Rules worth knowing

- **Drafts stay hidden.** For non-admins, event, announcement and promo lists contain only published items, and opening a draft by ID returns 404. Admins see everything.
- **Disabled accounts:** login returns 403 with the message *"Your account has been disabled…"*. Any token issued before the account was disabled gets 401 on its next request.
- **Promo videos:** you need either an upload or a link.
  - Links are checked by `src/utils/videoLink.js`. Only YouTube (`youtu.be`, `watch`, `shorts`, `embed`, `live`) and Vimeo are accepted, and they're saved in a standard form such as `https://www.youtube.com/watch?v=<id>`.
  - Any other link gets a 400 error on the `video_link` field. This means the frontend only ever embeds trusted players.
- **Upload limits** (set in `upload.middleware.js`): images up to 2 MB, audio up to 5 MB, video up to 8 MB. Anything else is rejected.
- **Errors** always come back as JSON: `{ status, message, errors? }`.

## 7. Security notes

- Keep `.env` out of git. If `JWT_SECRET` or the database password is ever shared, change both.
- Passwords are stored only as bcrypt hashes, and the API never returns them.
- All SQL is parameterised.
- CORS is open, which is fine for local development. Restrict it to the frontend's origin before deploying.
