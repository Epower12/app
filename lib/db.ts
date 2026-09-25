import { Pool } from 'pg';

// This reads the string from your .env file
const connectionString = process.env.DATABASE_URL;

// Create a connection pool gracefully
// We avoid throwing an error immediately so the Next.js Docker build 
// can complete its prerendering phase without runtime secrets.
const pool = new Pool({
  connectionString: connectionString || 'postgresql://dummy:dummy@localhost/dummy',
  // Neon requires SSL. This ensures it works locally and in production.
  ssl: !!connectionString,
  max: 10,                       // Neon free tier has a tight connection cap
  idleTimeoutMillis: 10_000,     // Close idle conns before Neon kills them (~30s server-side)
  connectionTimeoutMillis: 15_000, // Cold-start Neon can take 5-10s to spin up the compute
  allowExitOnIdle: false,
});

// Recycle pool connections that error out so a dead connection doesn't
// poison the pool for subsequent requests.
pool.on('error', (err) => {
  console.error('[db] pool client error (will be recycled):', err.message);
});

export default pool;