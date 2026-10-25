# Astute Funerals — Class in Dignity

Funeral policy website with online applications and an admin dashboard.

| Part | Tech | Folder |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, React Router | [`frontend/`](frontend/) |
| Backend | Spring Boot 4 (Java 21), Spring Security, Spring Data JPA | [`backend/`](backend/) |
| Database | H2 file database by default (`backend/data/`), PostgreSQL in production | |

## Pages

| Page | URL |
|---|---|
| Home, About, Apply, Contact | `/`, `/about`, `/apply` (`/apply?plan=family` preselects a plan), `/contact` |
| Admin sign in | `/admin/login` |
| Admin dashboard | `/admin` — overview, applications, capture applicant, messages, settings |

## Requirements

- Java 21 or newer (no Maven install needed — the project includes the Maven Wrapper)
- Node.js 20 or newer

## Running in development

Two terminals:

```powershell
# 1. API on http://localhost:8080
cd backend
$env:ADMIN_PASSWORD = "choose-a-strong-password"   # only used the first time, to create the admin
.\mvnw.cmd spring-boot:run
```

```powershell
# 2. Website on http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Admin: http://localhost:5173/admin with username `admin` and the password above.
If you don't set `ADMIN_PASSWORD`, a random one is generated and printed in the backend log on first start.

## Building for production

The React build is written into Spring Boot's static folder, so one jar serves the whole site:

```powershell
cd frontend
npm run build                      # uses frontend/.env.production - set VITE_SITE_URL to your domain first
cd ..\backend
.\mvnw.cmd -B package
java -jar target\astute-funerals-0.0.1-SNAPSHOT.jar
```

Environment variables for the jar:

| Variable | Purpose |
|---|---|
| `SITE_URL` | Your public domain, e.g. `https://www.astutefunerals.co.za` (sitemap & robots.txt) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin account (created once, change it under Settings) |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Database, e.g. `jdbc:postgresql://localhost:5432/astute`. Defaults to the H2 file in `./data` |
| `COOKIE_SECURE=true` | Required when served over HTTPS |
| `PORT` | HTTP port (default 8080) |

Serve it behind HTTPS (e.g. Nginx/Caddy or your host's HTTPS) and back up the database regularly.

### Using Supabase as the database

Turn on the `supabase` profile and use the **Session pooler** connection details from your Supabase project
(**Connect** button in the dashboard):

```
SPRING_PROFILES_ACTIVE=supabase
DB_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
DB_USERNAME=postgres.<your-project-ref>
DB_PASSWORD=<your database password>
```

The profile ([application-supabase.yml](backend/src/main/resources/application-supabase.yml)) keeps a small
connection pool and stores all tables in their own `astute` schema. **Do not move them to `public`:** Supabase
publishes the `public` schema through its REST API, which would expose applicants' personal information.
Use the session pooler (port 5432), not the transaction pooler (port 6543).

## Admin roles

| Role | Can do |
|---|---|
| **Admin** | Review/approve applications, capture applicants, read and reply to messages, edit own details & password |
| **Super admin** | Everything an admin can do, plus **Users**: add people, change roles, deactivate, reset passwords, remove |

The first account (from `ADMIN_USERNAME` / `ADMIN_PASSWORD`) is a super admin. There must always be at least one
active super admin, and nobody can demote, deactivate or delete themselves. Deactivated users are signed out on
their next click. Applications record who captured and last updated them; message replies record who sent them.

### Replying to messages

Admins reply from **Messages** using quick-reply templates. **WhatsApp** and **email** open on the admin's device with
the reply already typed; **Log a phone call** records a call. Every reply is saved so the team can see who answered.

To let the server send emails itself (a "Send email" button appears), set these environment variables:

| Variable | Example |
|---|---|
| `MAIL_FROM` | `astutefunerals@morokagroup.co.za` |
| `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT` | `smtp.your-provider.co.za` / `587` |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | your mailbox login |
| `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH` / `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE` | `true` / `true` |

## Where to change things

| What | File |
|---|---|
| Plans, prices, cover amounts, dependant limits | [`backend/src/main/resources/application.yml`](backend/src/main/resources/application.yml) → `app.plans` |
| Phone numbers, email, address, hours, FSP number | [`frontend/src/config/site.ts`](frontend/src/config/site.ts) and the structured data in [`frontend/index.html`](frontend/index.html) |
| Page text | [`frontend/src/pages/`](frontend/src/pages/) |
| Colours, fonts, layout | [`frontend/src/styles/styles.css`](frontend/src/styles/styles.css) (variables at the top), admin in `admin.css` |
| Logo & icons | [`frontend/public/img/`](frontend/public/img/) |
| Form validation rules | [`ApplicationValidator.java`](backend/src/main/java/za/co/astutefunerals/applications/ApplicationValidator.java) (server) and [`validation.ts`](frontend/src/lib/validation.ts) (instant feedback in the browser) |

## API overview

Public: `GET /api/meta` (plans & options), `POST /api/applications`, `POST /api/contact`.
Admin (session login): `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`, `GET /api/admin/stats`,
`GET|POST /api/admin/applications`, `GET /api/admin/applications.csv`, `GET|PATCH|DELETE /api/admin/applications/{id}`,
`GET /api/admin/messages`, `PATCH|DELETE /api/admin/messages/{id}`, `POST /api/admin/password`.

Validation errors return `422` with `{"error": "...", "errors": {"field.path": "message"}}`.

## SEO

Per-page titles, descriptions, canonical links and Open Graph tags (React 19 document metadata), `LocalBusiness`
structured data, a social sharing image, and `/sitemap.xml` + `/robots.txt` generated by the backend (admin and API
excluded). Google renders React pages; submit `https://your-domain/sitemap.xml` in Google Search Console after launch.

## Security

BCrypt password hashing; HttpOnly, SameSite=Strict session cookie; CSRF protection (cookie + header); Content
Security Policy and other security headers; rate limiting on login and the public forms; full server-side validation
including SA ID check digits; honeypot spam protection; CSV export protected against spreadsheet formula injection.
Banking details are deliberately **not** collected online — consultants complete the debit/stop order mandate by phone.

## Tests

```powershell
cd backend; .\mvnw.cmd test        # validator unit tests + application context
cd frontend; npm run typecheck     # TypeScript
```
