// server/services/emailService.js
const nodemailer = require("nodemailer");

const {
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  FRONTEND_URL
} = process.env;

// 🔧 Transporter idéntico al test: 587 + STARTTLS
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  connectionTimeout: 20000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
});

async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("SMTP listo para enviar.");
  } catch (err) {
    console.error("Fallo en transporter.verify():", err.code, err.message);
  }
}
exports.verifyMailer = verifyMailer;

exports.sendVerificationEmail = async (email, full_name, token) => {
  const baseUrl = FRONTEND_URL || "http://workly-frontend.s3-website.us-east-2.amazonaws.com";
  const verificationLink = `${baseUrl}/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  console.log(`Enviando correo a: ${email} via smtp.gmail.com:587 (STARTTLS)`);
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM || EMAIL_USER,
      to: email,
      subject: "Verifica tu cuenta en Workly",
      html: `<p>Hola ${full_name},</p>
             <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
             <p><a href="${verificationLink}">${verificationLink}</a></p>
             <p>Este enlace expirará en 10 minutos.</p>`,
    });
    console.log("✅ Correo enviado:", info.messageId);
  } catch (err) {
    console.error("❌ Error al enviar verificación:", err.code, err.command, err.responseCode, err.message);
    throw err;
  }
};
