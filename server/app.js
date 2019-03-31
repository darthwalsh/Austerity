const express = require("express");
const path = require("path");
const ws = require("ws");

const Connection = require("./connection").Connection;
const Lobby = require("./lobby").Lobby;

const port = process.env.PORT || 8080;
const app = express();
const client = path.join(__dirname, "..", "client");
app.use(express.static(client));
// eslint-disable-next-line no-console
const server = app.listen(port, () => console.log(`Example HTTP app on ${client} listening on port ${port}!`));

const lobby = new Lobby();

const wss = new ws.Server({server});
wss.on("connection", ws => {
  lobby.sendLobby(new Connection(ws));
});
