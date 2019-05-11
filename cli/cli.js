/* eslint-disable no-console */

const readline = require("readline");
const Library = require("./lib");
const Server = require("../server/server");

let [, , url, name] = process.argv;
if (!url || !name) {
  console.error(`Expected usage: cli URL NAME

Use URL=host to also run the server on port 8080`);
  process.exit(1);
}

if (url === "host") {
  new Server().listen({port: 8080});
  url = "http://localhost:8080";
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
