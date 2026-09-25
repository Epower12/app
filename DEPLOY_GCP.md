# Deploying SportPredict to Google Cloud Run

Your application has been configured with Docker and PostgreSQL, making it fully ready for Google Cloud Run. Follow these steps to deploy.

## 1. Setup your PostgreSQL Database
Make sure you have provisioned a PostgreSQL database (from Neon, Supabase, or Google Cloud SQL). You will need the **Connection String** (`postgresql://user:password@host/dbname`).

## 2. Initialize the Database Schema
Before your app can work, the tables need to be created in the new production database. 
Run this command from your terminal, replacing the URL with your actual Postgres connection string:
```bash
DATABASE_URL="your_actual_postgres_url" node scripts/init_pg.js
```

## 3. Deploy to Cloud Run
Run the following command in your terminal to build the Docker image and deploy it. Make sure you have the `gcloud` CLI installed and are logged in (`gcloud auth login`).

```bash
gcloud run deploy sport-predict \
  --source . \
  --project=project-6b8cb570-b233-4a52-815 \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=your_actual_postgres_url,NEXTAUTH_SECRET=your_secret_key"
```

*Note: Once Cloud Run provides you with a public URL, you'll need to run an update command to set the `NEXTAUTH_URL` variable to that new URL:*
```bash
gcloud run services update sport-predict \
  --project=project-6b8cb570-b233-4a52-815 \
  --region=us-central1 \
  --update-env-vars="NEXTAUTH_URL=https://your-new-cloud-run-url"
```
