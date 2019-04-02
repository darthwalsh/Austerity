/* eslint-disable no-console */
const express = require("express");
const path = require("path");
const ws = require("ws");

const Connection = require("./connection");
const Lobby = require("./lobby");

const port = process.env.PORT || 8080;
const app = express();
const client = path.join(__dirname, "..", "client");
app.use(express.static(client));
const server = app.listen(port, () => console.log(`Example HTTP app on ${client} listening on port ${port}!`));

const options = {};
if (process.argv.includes("--trivialShuffle")) {
  console.log("Using trivial shuffle");
  options.shuffle = array => array.sort();
}

const lobby = new Lobby(options);

const wss = new ws.Server({server});
wss.on("connection", ws => {
  lobby.sendLobby(new Connection(ws));
});
