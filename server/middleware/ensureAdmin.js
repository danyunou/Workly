// middleware/ensureAdmin.js

const ensureAdmin = (req, res, next) => {
  if (req.user?.role_id !== 3) {
    return res.status(403).json({ error: "Acceso restringido a administradores" });
  }
  next();
};

module.exports = ensureAdmin;
