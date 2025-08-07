module.exports = function ensureFreelancer(req, res, next) {
  if (req.user?.role_id !== 2) {
    return res.status(403).json({ error: "Acceso denegado: solo freelancers" });
  }
  next();
};
