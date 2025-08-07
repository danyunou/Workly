const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Necesario para Render
  },
});

module.exports = pool;
