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

  /**
   *  @param {Connection} connection
   */
  async sendLobby(connection) {
    const choices = [
      "Refresh",
      "New Game",
      ...Object.keys(this.games).filter(g => {
        const game = this.games[g];
        const player = game.players[connection.name];
        return (player && !player.connection.ws) || !game.started;
      })];
    const choice = await connection.choose(choices);
    let game;
    switch (choice) {
    case "Refresh":
      this.sendLobby(connection);
      return;
    case "New Game":
      game = new Game();
      this.games[`${connection.name}'s game`] = game;
      break;
    }
    game = game || this.games[choice];
    delete connection.messageHandlers.name;

    const existingPlayer = game.players[connection.name];
    if (existingPlayer) {
      existingPlayer.connection.newConnection(connection.ws);
      game.initClients([existingPlayer]);
      existingPlayer.connection.resendChoices();
      game.allLog(`${connection.name} rejoined`);
    } else {
      game.addPlayer(connection);
    }
  }
}

module.exports.Lobby = Lobby;
