// server/utils/hashPassword.js
const bcrypt = require('bcrypt');

exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

exports.comparePassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};
