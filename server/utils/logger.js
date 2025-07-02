const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Asegurarse de que el directorio logs exista
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Formato común
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
);

// Log principal (consola)
const baseLogger = createLogger({
  level: "info",
  format: logFormat,
  transports: [new transports.Console()],
});

// Log específico para autenticación
const authLogger = createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logDir, "auth.log") }),
  ],
});

// Log específico para tareas programadas
const cronLogger = createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logDir, "cron.log") }),
  ],
});

module.exports = {
  baseLogger,
  authLogger,
  cronLogger,
};
