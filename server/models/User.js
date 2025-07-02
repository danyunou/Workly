// server/models/User.js
const pool = require('../config/db');

exports.findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT users.*, roles.name AS role
     FROM users
     LEFT JOIN roles ON users.role_id = roles.id
     WHERE users.email = $1`,
    [email]
  );
  return result.rows[0];
};

exports.checkDuplicateEmailOrUsername = async (email, username) => {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE email = $1 OR username = $2
     UNION
     SELECT 1 FROM pending_users WHERE email = $1 OR username = $2`,
    [email, username]
  );
  return result.rows.length > 0;
};

exports.insertPendingUser = async ({ full_name, email, username, password_hash, usage_preference, verify_token, token_expires }) => {
  await pool.query(
    `INSERT INTO pending_users 
      (full_name, email, username, password_hash, usage_preference, verify_token, token_expires)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [full_name, email, username, password_hash, usage_preference, verify_token, token_expires]
  );
};

exports.getPendingUser = async (email, token) => {
  const result = await pool.query(
    `SELECT * FROM pending_users WHERE email = $1 AND verify_token = $2`,
    [email, token]
  );
  return result.rows[0];
};

exports.activateUser = async (pending) => {
  const role_id = pending.usage_preference === "freelancer" ? 2 : 1;

  const result = await pool.query(
    `INSERT INTO users (full_name, email, username, password_hash, preferences, is_verified, role_id)
     VALUES ($1, $2, $3, $4, $5, true, $6)
     RETURNING id`,
    [
      pending.full_name,
      pending.email,
      pending.username,
      pending.password_hash,
      JSON.stringify({ usage: pending.usage_preference }),
      role_id
    ]
  );

  return result.rows[0].id;
};


exports.assignUserRole = async (userId, roleId) => {
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
    [userId, roleId]
  );
};

exports.deletePendingUser = async (id) => {
  await pool.query(
    `DELETE FROM pending_users WHERE id = $1`,
    [id]
  );
};

exports.getPendingUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM pending_users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

exports.updatePendingUserToken = async (email, token, expires) => {
  await pool.query(
    `UPDATE pending_users SET verify_token = $1, token_expires = $2 WHERE email = $3`,
    [token, expires, email]
  );
};
