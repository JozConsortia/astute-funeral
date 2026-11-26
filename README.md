# Astute Funerals — *Class in Dignity*

A complete website and back-office system for **Astute Funerals**, a funeral services and funeral cover provider in
Danville, Pretoria. Families can compare plans, apply for cover online and get help 24/7. Staff manage applications,
answer messages and run the team from one secure admin dashboard.

![Java 21](https://img.shields.io/badge/Java-21-b07219)
![Spring Boot 4](https://img.shields.io/badge/Spring%20Boot-4.1-6db33f)
![React 19](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![Vite](https://img.shields.io/badge/Vite-6-646cff)

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Deploying to production](#deploying-to-production)
- [Admin guide](#admin-guide)
- [Security and privacy](#security-and-privacy)
- [API reference](#api-reference)
- [Testing](#testing)
- [Where to change things](#where-to-change-things)

---

## What it does

### Public website

Black-and-gold branding on a clean white page, built to be simple for grieving families and older visitors.

| Page | What visitors can do |
|---|---|
| **Home** `/` | Choose between **"Someone has passed away"** (24/7 call button and a step-by-step "what to do next" guide) and **"Plan ahead for my family"** (plans at a glance). Ask for a call back with just a name and number. |
| **Get covered** `/get-covered` | Compare the Single, Family and Extended Family plans, see how cover works, read the FAQ. |
| **Apply** `/apply` | A four-step online application: plan → main member → family and beneficiary → confirm. `/apply?plan=family` preselects a plan. |
| **About** `/about` | Mission, values and the benefits a policy can pay for. |
| **Contact** `/contact` | One-tap tiles to call, WhatsApp, email or get directions, plus a pop-up message form. |

Every page has a floating 24/7 emergency call button and works on phones.

### Admin dashboard `/admin`

| Section | Purpose |
|---|---|
| **Overview** | Eight equal tiles (total, new, in review, approved, declined, this month, approved premiums, messages awaiting reply). Each tile opens the matching filtered list. |
| **Applications** | Search and filter by status, plan and date; open, review, approve, decline or delete; **Print** on a logo letterhead; **Export to Excel**. |
| **Capture applicant** | Staff fill in the same application form for walk-in or telephone clients. |
| **Messages** | Contact-form messages and call-back requests, with quick-reply templates and replies by email, WhatsApp or phone. |
| **Users** *(super admins)* | Add team members, change roles, reset passwords, deactivate or delete accounts. |
| **My account** | Update your name and email, and change your password. |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router 7. Plain CSS with design tokens, no UI framework. |
| Backend | Spring Boot 4 (Java 21), Spring Security, Spring Data JPA / Hibernate, Spring Mail, Apache POI (Excel). |
| Database | H2 file database by default (no database server to install). PostgreSQL or Supabase in production. |
| Build | Maven Wrapper (no Maven install needed) and npm. In production one jar serves the website and the API. |

---

## Quick start

**You need:** Java 21 or newer, and Node.js 20 or newer.

Open two terminals.

```powershell
# Terminal 1 - API on http://localhost:8080
cd backend
$env:ADMIN_PASSWORD = "Choose-A-Str0ng!Password"   # only used the very first time, to create the admin
.\mvnw.cmd spring-boot:run
```

```powershell
# Terminal 2 - website on http://localhost:5173 (passes /api calls through to the backend)
cd frontend
npm install
npm run dev
```

- **Website:** http://localhost:5173
- **Admin:** http://localhost:5173/admin. Sign in with username `admin` and the password above.

If you don't set `ADMIN_PASSWORD`, a **temporary** password is generated and printed in the backend log on first start.
You'll be asked to choose your own password when you first sign in.

> On macOS or Linux use `./mvnw spring-boot:run` and `export ADMIN_PASSWORD=...`.

---

## Project structure

```
astute-funeral/
├── backend/                          Spring Boot API (also serves the built website in production)
│   ├── config/
│   │   └── application.example.yml   Template for local secrets (mail password). Copy to application.yml.
│   ├── data/                         H2 database file (created on first run, ignored by git)
│   └── src/main/java/za/co/astutefunerals/
│       ├── admin/                    Sign-in, users, roles, password rules, session checks
│       ├── applications/             Policy applications, validation, search, Excel export
│       ├── messages/                 Contact messages, call-backs, replies, email sending
│       ├── config/                   Security, rate limiting, app settings (plans live in application.yml)
│       └── web/                      Error handling, metadata, sitemap and robots.txt
└── frontend/                         React website and admin dashboard
    ├── public/img/                   Logo, icons, social sharing image
    └── src/
        ├── pages/                    Public pages
        ├── admin/                    Admin dashboard screens
        ├── components/               Shared pieces (layout, forms, icons, application form)
        ├── config/site.ts            Business details: phone numbers, address, hours, FSP number
        └── styles/                   styles.css (website + design tokens), admin.css (dashboard)
```

---

## Configuration

All settings have safe defaults for local development. Set them as environment variables, or put them in
`backend/config/application.yml`. Spring Boot reads that file automatically, and **git ignores it**, so secrets stay on
the machine.

| Setting | Purpose |
|---|---|
| `SITE_URL` | Public address, e.g. `https://www.astutefunerals.co.za` (used for the sitemap and canonical links) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First super admin account. Only used when no admin exists yet. |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | Database. Defaults to the H2 file in `backend/data/`. |
| `COOKIE_SECURE=true` | Required when the site is served over HTTPS |
| `PORT` | HTTP port (default `8080`) |
| `MAIL_FROM` and `SPRING_MAIL_*` | Lets the server email replies itself (see below) |

### Sending email replies

By default, replying by email opens the admin's own email program. To have the **server send replies straight to the
person's inbox** from the business address:

1. Copy [`backend/config/application.example.yml`](backend/config/application.example.yml) to
   `backend/config/application.yml`.
2. Fill in the mailbox password and save.
3. Restart the backend.

A **Send email** button then appears in Messages. The person receives your reply with their original message quoted
underneath, and their answers come back to the same mailbox. The button stays hidden until the password is filled in.

The same settings as environment variables:

| Variable | Example |
|---|---|
| `MAIL_FROM` | `Astute Funerals <astutefunerals@morokagroup.co.za>` |
| `SPRING_MAIL_HOST` / `SPRING_MAIL_PORT` | `mail.morokagroup.co.za` / `587` |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | the mailbox login |
| `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH` / `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE` | `true` / `true` |

### Where the data lives

With the default settings, **everything is stored in one file**: `backend/data/astute.mv.db`. That includes
applications, messages, replies and admin accounts. Nothing else needs to be installed.

- **Back it up** by copying that file somewhere safe while the backend is stopped.
- It is **not** uploaded to GitHub, because it contains personal information.
- It can't be opened in Excel. Use **Applications → Export to Excel** in the dashboard instead.

---

## Deploying to production

The React build is written into Spring Boot's static folder, so **one jar serves the whole site**:

```powershell
cd frontend
npm run build                 # set VITE_SITE_URL in frontend/.env.production to your domain first
cd ..\backend
.\mvnw.cmd -B package
java -jar target\astute-funerals-0.0.1-SNAPSHOT.jar
```

Production checklist:

- [ ] Serve the site over **HTTPS** (Nginx, Caddy or your host's HTTPS) and set `COOKIE_SECURE=true`.
- [ ] Set `SITE_URL` and `VITE_SITE_URL` to the real domain.
- [ ] Set up **regular backups** of the database.
- [ ] Fill in email settings if you want replies sent from the server.
- [ ] Update the FSP number in [`frontend/src/config/site.ts`](frontend/src/config/site.ts) (it is a placeholder).
- [ ] Submit `https://your-domain/sitemap.xml` in Google Search Console.

### Using Supabase (PostgreSQL)

Turn on the `supabase` profile and use the **Session pooler** connection details from your Supabase project
(**Connect** button in the dashboard):

```
SPRING_PROFILES_ACTIVE=supabase
DB_URL=jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
DB_USERNAME=postgres.<your-project-ref>
DB_PASSWORD=<your database password>
```

The profile ([application-supabase.yml](backend/src/main/resources/application-supabase.yml)) keeps a small connection
pool and stores all tables in their own `astute` schema. **Do not move them to `public`:** Supabase publishes the
`public` schema through its REST API, which would expose applicants' personal information. Use the session pooler
(port 5432), not the transaction pooler (port 6543).

---

## Admin guide

### Roles

| Role | Can do |
|---|---|
| **Admin** | Review and approve applications, capture applicants, read and reply to messages, edit own details and password |
| **Super admin** | Everything an admin can do, plus **Users**: add people, change roles, reset passwords, deactivate and delete accounts |

- The first account is a super admin.
- There must always be at least one active super admin.
- Nobody can demote, deactivate or delete themselves.

### Adding a team member

1. **Users → + Add user.** Enter their name, a username and their role.
2. The system creates a **temporary password** and shows it **once**, with a button to copy the sign-in details. Give
   them to the person in person or by phone.
3. When they first sign in, they must choose their **own** password before they can use anything else.

**Reset password** works the same way: a new temporary password is shown once, and the old one stops working at once.

### Password rules

At least **10 characters** with an **uppercase letter**, a **lowercase letter**, a **number** and a **special
character** (e.g. `! @ # ?`). The rules are checked on the server, and a live checklist shows progress while typing.

### Deactivating or deleting someone

- **Deactivate** signs the person out on their next click and blocks sign-in until you choose **Activate**. Their
  history is kept.
- **Delete** removes the account permanently. Replies and applications they handled keep their name.

### Replying to messages

Open **Messages**, pick a quick-reply template or write your own, then choose how to send it:

| Button | What happens |
|---|---|
| **Send email** *(when email is set up)* | The server emails the reply straight to the person's inbox. |
| **Email name@…** | Opens your own email program with the reply ready. Press send there. |
| **WhatsApp** | Opens WhatsApp with the reply ready. Press send there. |
| **Call** / **Log a phone call** | Phones the person, or records that you spoke to them. |

Every reply is saved under the message with the sender's name and time, so the team can see who answered.

---

## Security and privacy

- **Passwords:** BCrypt hashing, strong-password rules enforced on the server, and generated temporary passwords that
  must be replaced on first sign-in.
- **Sessions:** HttpOnly, `SameSite=Strict` cookie, a new session id on sign-in, and CSRF protection (cookie + header).
  Every admin request is re-checked, so deactivated users and role changes take effect immediately.
- **Abuse protection:** rate limits on sign-in and the public forms, plus honeypot spam traps.
- **Validation:** every form is fully validated on the server, including SA ID number check digits.
- **Headers:** Content Security Policy and other security headers.
- **Excel export:** ID and phone numbers are stored as text, so no digits or leading zeros are lost, and cells can
  never run as formulas.
- **Data minimisation:** banking details are deliberately **not** collected online. Consultants complete the debit or
  stop order mandate by phone, in line with POPIA.
- **Secrets stay local:** the database file and `backend/config/application.yml` are ignored by git.

---

## API reference

**Public**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/meta` | Plans, provinces and form options |
| `POST` | `/api/applications` | Submit an application |
| `POST` | `/api/contact` | Send a message or call-back request |

**Admin** (session sign-in, CSRF token required for changes)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/login`, `/api/admin/logout` | Sign in / out |
| `GET` `PATCH` | `/api/admin/me` | Your profile |
| `POST` | `/api/admin/password` | Change your password |
| `GET` | `/api/admin/stats` | Overview numbers |
| `GET` `POST` | `/api/admin/applications` | List (`q`, `status`, `plan`, `period=month`, `page`) / capture |
| `GET` | `/api/admin/applications.xlsx` | Excel export (same filters) |
| `GET` `PATCH` `DELETE` | `/api/admin/applications/{id}` | View / review / delete |
| `GET` | `/api/admin/messages` | Messages and replies |
| `PATCH` `DELETE` | `/api/admin/messages/{id}` | Mark read / delete |
| `POST` | `/api/admin/messages/{id}/replies` | Record or send a reply |
| `GET` `POST` | `/api/admin/users` | List / add users *(super admin)* |
| `PATCH` `DELETE` | `/api/admin/users/{id}` | Edit, deactivate / delete *(super admin)* |
| `POST` | `/api/admin/users/{id}/password` | Issue a new temporary password *(super admin)* |

Validation errors return `422` with `{"error": "...", "errors": {"field.path": "message"}}`.

---

## Testing

```powershell
cd backend;  .\mvnw.cmd test        # unit and integration tests
cd frontend; npm run typecheck      # TypeScript
```

The backend suite covers:
- application validation, including SA ID numbers;
- the Excel export (exact IDs and phone numbers, no formulas);
- the overview filters;
- password rules;
- the full temporary-password flow (add user → forced change → deactivate → delete);
- email replies, using a stand-in mail server.

---

## Where to change things

| What | File |
|---|---|
| Plans, prices, cover amounts, dependant limits | [`backend/src/main/resources/application.yml`](backend/src/main/resources/application.yml) → `app.plans` |
| Phone numbers, email, address, hours, FSP number | [`frontend/src/config/site.ts`](frontend/src/config/site.ts) and the structured data in [`frontend/index.html`](frontend/index.html) |
| Page text | [`frontend/src/pages/`](frontend/src/pages/) |
| Beneficiary relationship choices (the list before "Other") | [`ApplicationForm.tsx`](frontend/src/components/ApplicationForm.tsx) → `BENEFICIARY_RELATIONSHIPS` |
| Colours and fonts | [`frontend/src/styles/styles.css`](frontend/src/styles/styles.css) (tokens at the top); dashboard in `admin.css` |
| Icons | [`frontend/src/components/Icon.tsx`](frontend/src/components/Icon.tsx) |
| Logo and images | [`frontend/public/img/`](frontend/public/img/): `logo.png` (bright gold, for black backgrounds), `logo-deep.png` (deep gold, for white backgrounds and printouts), `emblem.png` (the mark in the header and admin sidebar). Replacements need a **solid** transparent background; a logo cut out of black by brightness turns pale and see-through on white. |
| Form rules | [`ApplicationValidator.java`](backend/src/main/java/za/co/astutefunerals/applications/ApplicationValidator.java) (server) and [`validation.ts`](frontend/src/lib/validation.ts) (instant feedback) |
| Password rules | [`PasswordPolicy.java`](backend/src/main/java/za/co/astutefunerals/admin/PasswordPolicy.java) and [`passwordRules.ts`](frontend/src/lib/passwordRules.ts) (keep the two in step) |

---

<p align="center"><em>Astute Funerals — Class in Dignity</em></p>
