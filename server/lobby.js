const Game = require("./game").Game;

class Lobby {
  constructor() {
    /** @type {Object<string, Game>} */
    this.games = {};
  }

  addConnection(ws) {
    const player = new LobbyPlayer(ws);
    this.sendLobby(player, ws);
  }

  sendLobby(player, ws) {
    const choices = ["Refresh", "New Game", ...Object.keys(this.games)];
    player.sendChoice(choices, choice => {
      let game;
      switch (choice) {
      case "Refresh":
        this.sendLobby(player, ws);
        return;
      case "New Game":
        game = new Game(console.log);
        this.games[`${player.name}'s game`] = game;
        break;
      }
      game = game || this.games[choice];
      player.close();
      game.addPlayer(player.name, ws);
    });
  }
}

class LobbyPlayer {
  constructor(socket) {
    this.socket = socket;
    this.name = "NoName";

    const socketHandler = data => {
      data = JSON.parse(data.data);
      const type = Object.keys(data)[0];
      data = data[type];
      switch (type) {
      case "name":
        this.name = data;
        return;
      case "choice":
        this.onChoice(data);
        return;
      }
    };
    this.socket.addEventListener("message", socketHandler);
    this.close = () => this.socket.removeEventListener("message", socketHandler);
  }

  // TODO maybe merge into Player's implementation of sendChoice?
  sendChoice(choices, handleChoice) {
    if (!choices.length) {
      console.error("EMPTY CHOICE!!!");
    }

    if (this.onChoice) {
      console.error("onChoice wasn't empty!!!");
    }
    this.onChoice = choice => {
      this.onChoice = null;
      handleChoice.call(this, choice);
    };
    this.socket.send(JSON.stringify({choices: choices}));
  }
}

module.exports.Lobby = Lobby;
