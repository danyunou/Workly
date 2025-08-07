// server/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Workly_Production',
  password: 'lolquemal',
  port: 5432,
});

module.exports = pool;
