const { createLogger, format, transports } = require("winston");
const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;

// Custom levels including "http"
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const levelColors = {
  error: chalk.red.bold,
  warn: chalk.yellow.bold,
  info: chalk.blue.bold,
  http: chalk.magenta.bold,
  debug: chalk.gray.bold,
};

const customFormat = format.printf(({ level, message, timestamp, stack }) => {
  const colorizer = levelColors[level] || ((text) => text);

  return stack
    ? `${chalk.gray(`[${timestamp}]`)} ${colorizer(
        level
      )}: ${message}\n${stack}`
    : `${chalk.gray(`[${timestamp}]`)} ${colorizer(level)}: ${message}`;
});

const logger = createLogger({
  levels,
  level: process.env.LOG_LEVEL || "http", // 👈 ensures http logs are not skipped
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat()
  ),
  // todo: you can uncomment when pushing it to vps
  transports: [
    new transports.Console({
      format: customFormat,
    }),
    // new transports.File({x
    //   filename: "logs/app.log",
    //   level: "http", // 👈 include http+ levels in this file
    //   maxsize: 5 * 1024 * 1024,
    //   maxFiles: 5,
    // }),
    // new transports.File({
    //   filename: "logs/error.log",
    //   level: "error",
    // }),
  ],
  exitOnError: false,
});

module.exports = logger;
