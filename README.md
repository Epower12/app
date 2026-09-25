# SportPredict 🏆

A competitive sports prediction platform built with **Next.js 16**, **NextAuth**, and **PostgreSQL**.

Make predictions on Football, Hockey, and Tennis matches — earn points, climb leaderboards, and challenge players worldwide.

---

## ✨ Features

- 🌍 **Multi-sport** — Football, Ice Hockey, Tennis
- 📊 **Smart scoring** — points for outcomes, exact scores, and goal totals
- 🏅 **Live leaderboards** — global and per-tournament rankings
- 🎯 **Prediction history** — track your accuracy over time
- 💎 **Premium tier** — advanced analytics, double points, and exclusive features
- 🔐 **Secure auth** — email/password via NextAuth with bcrypt

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env.local
# Edit .env.local and fill in NEXTAUTH_SECRET and DATABASE_URL

# 3. Initialise the database
npm run db:init

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

---

## 📁 Project Structure

```
sport-predictions/
├── app/                    # Next.js App Router
│   ├── landing/            # Public landing page
│   ├── login/              # Auth pages
│   ├── signup/
│   ├── tournaments/        # Main app pages (authenticated)
│   ├── predictions/
│   ├── leaderboard/
│   ├── premium/
│   ├── profile/
│   ├── api/                # API routes
│   │   ├── auth/           #   NextAuth handlers
│   │   ├── matches/
│   │   ├── predictions/
│   │   ├── tournaments/
│   │   ├── sports/
│   │   ├── leaderboard/
│   │   └── user/
│   ├── globals.css         # Global design system + landing styles
│   └── layout.tsx          # Root layout (SessionProvider)
├── lib/                    # Shared utilities
│   ├── db.ts               #   PostgreSQL connection & helpers
│   ├── types.ts            #   Shared TypeScript types
│   ├── scoring.ts          #   Points calculation logic
│   └── profile.ts          #   User profile helpers
├── types/
│   └── next-auth.d.ts      # NextAuth session type augmentation
├── scripts/
│   ├── init_db.js          # Database initialisation script
│   └── debug_db.js         # Database diagnostics
├── data/                   # Local data files (gitignored)
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXTAUTH_URL` = `https://your-app.vercel.app`
   - `NEXTAUTH_SECRET` = (generate: `openssl rand -base64 32`)
   - `DATABASE_URL` = your PostgreSQL connection string (e.g. from [Neon](https://neon.tech))

### Netlify
1. Push to GitHub
2. Import repo in [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Set same environment variables in Netlify UI

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXTAUTH_URL` | Canonical URL of the app | ✅ |
| `NEXTAUTH_SECRET` | JWT signing secret | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_OWNER_EMAIL` | Email address of the platform owner | ✅ |
| `NODE_ENV` | `development` or `production` | Optional |

---

## 👤 User Roles

| Role | Description |
|---|---|
| `user` | Standard free tier — all sports &amp; tournaments |
| `premium` | Enhanced scoring, analytics, premium badge |
| `admin` | Full admin access to manage matches &amp; tournaments |

---

## 🛠 Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:init      # Initialise / seed the database
npm run db:verify    # Verify database integrity
```

---

## 📄 License

MIT © 2026 SportPredict
