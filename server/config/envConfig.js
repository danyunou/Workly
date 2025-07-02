require('dotenv').config();

const requiredVars = [
  'PORT',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'AWS_BUCKET_NAME',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_SECRET',
];

// Mostrar advertencia si alguna falta
for (const key of requiredVars) {
  if (!process.env[key]) {
    console.warn(`⚠️  Falta variable de entorno: ${key}`);
  }
}

module.exports = {
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET, // 💡 ESTA es la clave que estás usando
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  awsBucket: process.env.AWS_BUCKET_NAME,
  awsRegion: process.env.AWS_REGION,
  awsKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecret: process.env.AWS_SECRET_ACCESS_KEY,
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalSecret: process.env.PAYPAL_SECRET
};
