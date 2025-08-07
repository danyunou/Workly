// server/services/emailService.js
const nodemailer = require("nodemailer");
require('dotenv').config(); 
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log("USER:", emailUser);
console.log("PASS:", emailPass);

exports.sendVerificationEmail = async (email, full_name, token) => {
  const verificationLink = `http://localhost:5173/verify?token=${token}&email=${email}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verifica tu cuenta en Workly",
    html: `<p>Hola ${full_name},</p>
      <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
      <a href="${verificationLink}">Verificar cuenta</a>
      <p>Este enlace expirará en 10 minutos.</p>`,
  });
};
