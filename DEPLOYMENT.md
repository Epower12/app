# Deployment Guide

This project is a Next.js application using SQLite.

## 🚀 Quick Check: Deployment Limitations

**⚠️ IMPORTANT: SQLite on Serverless (Netlify, Vercel)**
This app uses a local SQLite database (`data/predictions.db`).
- **Serverless platforms (like Netlify or Vercel) are ephemeral.** This means any data written to the database **WILL BE LOST** when the server functions restart (which happens frequently).
- The file system is also **Read-Only** in many cases, meaning you might not be able to write new data (users, predictions) at all.

### Recommended Approaches

1.  **For a proper Production App**: Use an external database like **Turso**, **Neon** (Postgres), or **Supabase**. You will need to update `lib/db.ts` to connect to these services.
2.  **For a Static / Read-Only Demo**: You can commit a populated `predictions.db` file to the repository (remove it from `.gitignore`). However, user actions (signups, stats) will fail or reset.

---

## 🛠️ Local Development

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Initialize Database**
    Creates a fresh `data/predictions.db` with the schema and default sports.
    ```bash
    npm run db:init
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 📦 Deploying to Netlify (as a Demo)

If you still wish to deploy this version to Netlify for a simple demonstration:

1.  **Environment Variables**
    Set these in Netlify Site Settings > Build & Deploy > Environment:
    - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
    - `NEXTAUTH_URL`: Your Netlify URL (e.g., `https://my-site.netlify.app`).

2.  **Database Strategy for Demo**
    Since we cannot write to the file system consistently:
    - Run `npm run db:init` locally to create the database.
    - **Temporarily** remove `data/*` and `*.db` from `.gitignore`.
    - Commit the `data/predictions.db` file to GitHub.
    - *Note: The app will be read-only or reset effectively on every deploy.*

3.  **Build Settings**
    - Build Command: `npm run build`
    - Publish Directory: `.next`

---

## 📂 Project Structure

- **`app/`**: Next.js App Router pages and API routes.
- **`lib/`**: Shared helper functions (database connection, logic).
- **`scripts/`**: Utility scripts for database management (`init`, `verify`, `audit`).
- **`public/`**: Static assets (images, fonts).
- **`data/`**: Local database storage (ignored by git).
