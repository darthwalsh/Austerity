const Store = require("./store").Store;
const cards = require("./cards");
const Player = require("./player").Player;
// eslint-disable-next-line no-unused-vars
const Connection = require("./connection").Connection; // Useful for VS Code type info

class Game {
  constructor(log) {
    this.log = log;
    this.store = new Store();
    /**
     * @type {Object.<string, Player>}
     */
    this.players = {};
    this.trash = [];
  }

  canStart() {
    // TODO Game of 1 is only fun when debugging
    return Object.keys(this.players).length >= 1;
  }

  start(debugMode) {
    const ps = this.allPlayers();

    if (debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.allLog("!!!!!!\n" + ps[0].name + " IS CHEATING\n!!!!!!");
    }

    const included = this.store.included.map(c => c.name);
    ps.forEach(p => p.send({included}));

    const colors = this.store.getAllCards().reduce((o, c) => {
      o[c.name] = c.color;
      o["Buy: " + c.name] = c.color;
      return o;
    }, {});
    ps.forEach(p => p.send({colors}));

    let turn = Math.floor(Math.random() * ps.length);
    const nextTurn = () => {
      if (this.store.gameOver()) {
        let result = "GAME OVER!!!\r\n";
        result += ps
          .sort((a, b) => b.getPoints() - a.getPoints()) // descending
          .map(p => p.name + ": " + p.getPoints() + "\n    " +
            p.allCards()
              .filter(c => c.ofKind("property")||c.ofKind("curse"))
              .map(c => c.name)
              .sort()
              .toString())
          .join("\r\n");
        this.allLog(result);
        return;
      }

      ++turn;
      ps[turn % ps.length].takeTurn(nextTurn);
    };

    ps[turn].takeTurn(nextTurn);
  }

  /**
   * @param {Connection} connection
   */
  addPlayer(connection) {
    const name = connection.name;
    this.log(name + " joined");

    const player = new Player(connection, this);

    if (Object.keys(this.players).length == 0) {
      player.send({isLeader: this.store.optional()});
    } else {
      this.allLog(player.name + " joined");
    }
    this.players[name] = player;

    connection.messageHandlers.chat = data => {
      this.allLog(player.name + ": " + data);
    };

    connection.messageHandlers.gameStart = data => {
      this.store.setIncluded(data.included.map(n => cards[n]));
      this.start(data.debugMode);
    };

    connection.ws.addEventListener("close", () => { // TODO(NODE) move to Connection.js
      this.log(player.name + " disconnected");
      delete this.players[player.name];
    });
  }

  allPlayers() {
    return Object.keys(this.players).map(n => this.players[n]);
  }

  otherPlayers(player) {
    return this.allPlayers().filter(p => p.name !== player.name);
  }

  parallelAttack(player, attackThenCallBack, callback) {
    const others = this.otherPlayers(player);
    let attacksLeft = others.length;
    if (!attacksLeft) {
      callback();
      return;
    }
    const attackDone = () => {
      if (! --attacksLeft) {
        callback();
      }
    };
    others.forEach(p => {
      p.attacked(() => {
        attackThenCallBack(p, attackDone);
      }, attackDone);
    });
  }

  sequentialAttack(player, attackThenCallBack, callback) {
    const ps = this.allPlayers();

    if (ps.length == 1) {
      callback();
      return;
    }

    const pi = ps.indexOf(player);
    let i = (pi + 1) % ps.length;

    const attackDone = () => {
      i = (i + 1) % ps.length;

      if (i == pi) {
        callback();
        return;
      }

      ps[i].attacked(() => {
        attackThenCallBack(ps[i], attackDone);
      }, attackDone);
    };

    ps[i].attacked(() => {
      attackThenCallBack(ps[i], attackDone);
    }, attackDone);
  }

  allLog(text) {
    for (const id in this.players) {
      this.players[id].sendMessage(text);
    }
  }
}

module.exports.Game = Game;
