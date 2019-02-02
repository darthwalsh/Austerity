const express = require("express");
const process = require("process");
const ws = require("ws");
const Lobby = require("./lobby").Lobby;

const port = process.env.PORT || 8080;
const app = express();
app.use(express.static("client"));
const server = app.listen(port, () => console.log(`Example HTTP app listening on port ${port}!`));

const lobby = new Lobby();

const wss = new ws.Server({server});
wss.on("connection", ws => {
  lobby.addConnection(ws);
});
