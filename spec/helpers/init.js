/* global jasmine */

import path from "path";
import reporters from "jasmine-reporters";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// TODO const __dirname = import.meta.dirname;

const junitReporter = new reporters.JUnitXmlReporter({
  savePath: path.join(__dirname, "..", "results"),
  consolidateAll: false,
});
jasmine.getEnv().addReporter(junitReporter);

const isDebugger = /--debug|--inspect/.test(process.execArgv.join(" "));

jasmine.DEFAULT_TIMEOUT_INTERVAL = isDebugger ? 1000 * 60 * 60 : 1500;
