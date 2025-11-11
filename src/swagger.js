const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const fs = require("fs");
const path = require("path");

const baseSwagger = YAML.load(path.join(__dirname, "./docs/swagger.yaml"));

const docsPath = path.join(__dirname, "./docs");
const files = fs.readdirSync(docsPath);

baseSwagger.paths = {};

files.forEach((file) => {
  if (file !== "swagger.yaml") {
    const doc = YAML.load(path.join(docsPath, file));
    Object.assign(baseSwagger.paths, doc.paths);
  }
});

module.exports = {
  swaggerUi,
  swaggerDocument: baseSwagger,
};
