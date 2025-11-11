const logger = require("../utils/logger");
const chalk = require("chalk");

const loggingMiddleware = (req, res, next) => {
  const start = Date.now();

  // Request log
  logger.http(
    `${chalk.cyan("➡️ [REQ]")} ${chalk.yellow(req.method)} ${chalk.green(
      req.originalUrl
    )}`,
    {
      ip: req.ip,
      query: req.query,
      params: req.params,
      body: req.body,
      userAgent: req.get("User-Agent"),
    }
  );

  res.on("finish", () => {
    const duration = Date.now() - start;

    let statusIcon = chalk.green("✅");
    if (res.statusCode >= 500) statusIcon = chalk.red("🔥");
    else if (res.statusCode >= 400) statusIcon = chalk.yellow("⚠️");
    else if (res.statusCode >= 300) statusIcon = chalk.cyan("➡️");

    logger.http(
      `${statusIcon} ${chalk.cyan("[RES]")} ${chalk.yellow(
        req.method
      )} ${chalk.green(req.originalUrl)} → ${chalk.bold(
        res.statusCode
      )} ${chalk.gray(`(${duration}ms)`)}`,
      {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get("Content-Length") || "0",
      }
    );
  });

  res.on("error", (err) => {
    logger.error(`${chalk.red("❌ Response Error")}`, {
      method: req.method,
      url: req.originalUrl,
      error: err.message,
    });
  });

  next();
};

module.exports = loggingMiddleware;
