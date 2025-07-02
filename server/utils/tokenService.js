// server/utils/tokenService.js
const jwt = require("jsonwebtoken");
const { jwtSecret } = require('../config/envConfig');

exports.generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1d" });
};
