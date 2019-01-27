const Connection = require("./connection").Connection;
const Game = require("./game").Game;


class Lobby {
  constructor() {
    /** @type {Object<string, Game>} */
    this.games = {};
  }

  addConnection(ws) {
    this.sendLobby(new Connection(ws));
  }

  sendLobby(connection) {
    const choices = ["Refresh", "New Game", ...Object.keys(this.games)];
    connection.sendChoice(choices, choice => {
      let game;
      switch (choice) {
      case "Refresh":
        this.sendLobby(connection);
        return;
      case "New Game":
        game = new Game(console.log);
        this.games[`${connection.name}'s game`] = game;
        break;
      }
      game = game || this.games[choice];
      connection.close();
      game.addPlayer(connection.name, connection.ws);
    });
  }
}

module.exports.Lobby = Lobby;
