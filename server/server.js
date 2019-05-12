/* eslint-disable no-console */
const express = require("express");
const path = require("path");
const ws = require("ws");

const Connection = require("./connection");
const Lobby = require("./lobby");

class Server {
  /**
   * @param {object} options
   * @param {any} [options.port]
   * @param {boolean} [options.trivialShuffle]
   */
  listen(options) {
    const port = options.port || 8080;

    const app = express();
    const client = path.join(__dirname, "..", "client");
    app.use(express.static(client));
    const server = app.listen(port, () => console.log(`Example HTTP app on ${client} listening on port ${port}!`));

    const lobbyOptions = {};
    if (options.trivialShuffle) {
      console.log("Using trivial shuffle");
      lobbyOptions.shuffle = array => array.sort((a, b) => {
        if (typeof a.name === "string") {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        }
        if (typeof a === "number") {
          return a - b;
        }
        throw new Error(a.toString());
      });
    }

    this.lobby = new Lobby(lobbyOptions);

    const wss = new ws.Server({server});
    wss.on("connection", ws => {
      this.lobby.sendLobby(new Connection(ws));
    });
  }
}

module.exports = Server;
