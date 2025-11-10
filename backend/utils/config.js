require("dotenv").config();

function getSslOptions() {
  const sslMode = (process.env.PGSSLMODE || "disable").toLowerCase();
  if (sslMode === "disable") {
    return false;
  }
  if (sslMode === "require") {
    return { rejectUnauthorized: false };
  }
  if (sslMode === "verify-ca" || sslMode === "verify-full") {
    return { rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

const config = {
  database: {
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,

    password: process.env.PGPASSWORD,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: getSslOptions(),
    options: "-c timezone=Europe/Warsaw",
  },
};

module.exports = config;
