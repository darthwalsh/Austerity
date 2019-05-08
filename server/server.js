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
      lobbyOptions.shuffle = array => array.sort();
    }

    const lobby = new Lobby(lobbyOptions);

    const wss = new ws.Server({server});
    wss.on("connection", ws => {
      lobby.sendLobby(new Connection(ws));
    });
  }
}

module.exports = Server;
