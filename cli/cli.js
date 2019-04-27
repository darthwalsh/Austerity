/* eslint-disable no-console */

const readline = require("readline");
const Library = require("./lib");

const [, , url, name] = process.argv;
if (!url || !name) {
  console.error("Expected usage: cli URL NAME");
  process.exit(1);
}

const wsUrl = url.replace(/^http/, "ws");

const cl = readline.createInterface(process.stdin, process.stdout);

/**
 * @param {string[]} query
 * @return {Promise<string>}
 */
function question(query) {
  return new Promise((res, rej) => {
    cl.question(query.join(" / ") + "\n", answer => {
      res(answer);
    });
  });
}

const lib = new Library(wsUrl, question, console.log);

lib.connect(name);
