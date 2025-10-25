/* eslint-disable no-console */

import readline from "readline";
import Library from "./lib.js";
import Server from "../server/server.js";

let [, , name] = process.argv;
if (!name) {
  console.error(`Expected usage: cli URL NAME

Use URL=host to also run the server on port 8080`);
  process.exit(1);
}

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

const lib = new Library(question, console.log);


if (name === "host") {
  throw "TODO do the server start stuff"
}


lib.connect(name);
