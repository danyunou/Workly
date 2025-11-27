const User = require('../models/User'); 
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { sendVerificationEmail } = require("../services/emailService");
const { authLogger } = require("../utils/logger");
const { generateToken } = require("../utils/tokenService");
const { hashPassword, comparePassword } = require('../utils/hashPassword');


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nameRegex = /^[A-Za-z\s]{2,}$/;
const usernameRegex = /^[A-Za-z0-9_]{5,}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[+*.\-_/#$%!]).{8,}$/;

exports.registerUser = async (req, res) => {
  const { full_name, email, username, password, usage_preference } = req.body;

  if (!full_name || !email || !username || !password || !usage_preference)
    return res.json({ error: "Todos los campos son obligatorios." });

  if (!nameRegex.test(full_name))
    return res.json({ error: "Nombre inválido." });

  if (!emailRegex.test(email))
    return res.json({ error: "Correo electrónico inválido." });

  if (!usernameRegex.test(username))
    return res.json({ error: "Usuario inválido." });

  if (!passwordRegex.test(password))
    return res.json({ error: "Contraseña no cumple con los requisitos." });

  try {
    const exists = await User.checkDuplicateEmailOrUsername(email, username);
    if (exists) {
      return res.json({ error: "Correo o usuario ya registrado." });
    }

    const hashed = await hashPassword(password);
    const token = uuidv4();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.insertPendingUser({
      full_name,
      email,
      username,
      password_hash: hashed,
      usage_preference,
      verify_token: token,
      token_expires: expires,
    });

    await sendVerificationEmail(email, full_name, token);
    authLogger.info(`Usuario pendiente registrado: ${email} (${usage_preference})`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error en registro:", err);
    authLogger.error(`Error al registrar ${email}: ${err.message}`);
    return res.status(500).json({ error: "Error interno del servidor" });
  }

};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.getPendingUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Correo no encontrado o ya verificado." });
    }

    const full_name = user.full_name;
    const token = uuidv4();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.updatePendingUserToken(email, token, expires);
    await sendVerificationEmail(email, full_name, token);

    authLogger.info(`Reenvío de verificación enviado a: ${email}`);
    return res.json({ message: "Correo de verificación reenviado correctamente." });
  } catch (err) {
    console.error("Error al reenviar verificación:", err);
    authLogger.error(`Error al reenviar verificación a ${email}: ${err.message}`);
    return res.status(500).json({ error: "Error interno al reenviar correo." });
  }

};

exports.verifyAccount = async (req, res) => {
  const { token, email } = req.query;

  try {
    const pending = await User.getPendingUser(email, token);
    if (!pending) {
      return res.status(400).json({ error: "Token inválido o correo incorrecto." });
    }

    if (new Date() > new Date(pending.token_expires)) {
      authLogger.warn(`Intento de verificación con token expirado: ${email}`);
      return res.status(400).json({ error: "El token ha expirado." });
    }

    // rol fijo para usuario normal (cliente) — puedes ajustarlo si hay más roles después
    const role_id = 1;

    const userId = await User.activateUser(pending, role_id); // pasa role_id como argumento

    await User.deletePendingUser(pending.id);

    authLogger.info(`Usuario verificado: ${email}, asignado a rol ${role_id}`);
    return res.json({ message: "Cuenta verificada exitosamente. Ya puedes iniciar sesión." });
  } catch (err) {
    console.error("Error en verificación:", err);
    authLogger.error(`Error al verificar cuenta de ${email}: ${err.message}`);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son requeridos." });

  try {
    const user = await User.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Verifica tu cuenta antes de iniciar sesión." });
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const token = generateToken({ id: user.id, email: user.email, role_id: user.role_id });

    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        preferences: user.preferences,
        role_id: user.role_id, 
      },
    });
  } catch (err) {
    console.error("Error en login:", err.message);
    res.status(500).json({ error: "Error en el servidor." });
  }
};

