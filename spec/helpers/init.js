/* global jasmine */

const path = require("path");
const reporters = require("jasmine-reporters");

const junitReporter = new reporters.JUnitXmlReporter({
  savePath: path.join(__dirname, "..", "results"),
  consolidateAll: false,
});
jasmine.getEnv().addReporter(junitReporter);

jasmine.DEFAULT_TIMEOUT_INTERVAL = 500;
