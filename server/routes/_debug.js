const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/health/db', async (_req, res) => {
  try {
    const { rows } = await pool.query('select now() as now');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.get('/env/min', (_req, res) => {
  res.json({
    hasDB: !!process.env.DATABASE_URL,
    hasJWT: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || null
  });
});

module.exports = router;
