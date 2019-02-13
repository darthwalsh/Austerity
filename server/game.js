const Store = require("./store").Store;
const cards = require("./cards");
const Player = require("./player").Player;
// eslint-disable-next-line no-unused-vars
const Connection = require("./connection").Connection; // Useful for VS Code type info

class Game {
  constructor() {
    this.store = new Store();
    /**
     * @type {Object.<string, Player>}
     */
    this.players = {};
    this.trash = [];
    this.started = false;
  }

  /**
   * @param {Player[]} ps
   */
  initClients(ps) {
    const included = this.store.included.map(c => c.name);
    ps.forEach(p => p.send({included}));

    const colors = this.store.getAllCards().reduce((o, c) => {
      o[c.name] = c.color;
      o["Buy: " + c.name] = c.color;
      return o;
    }, {});
    ps.forEach(p => p.send({colors}));
  }

  start(debugMode) {
    this.started = true;
    const ps = this.allPlayers();
    
    this.initClients(ps);

    ps.forEach(p => p.redrawHand());

    if (debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.allLog("!!!!!!\n" + ps[0].name + " IS CHEATING\n!!!!!!");
    }

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

    const player = new Player(connection, this);

    if (Object.keys(this.players).length == 0) {
      player.send({isLeader: this.store.optional()});
    } else {
      player.sendMessage("Waiting for the leader to start the game");
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

    connection.ws.addEventListener("close", () => {
      this.allLog(player.name + " disconnected");
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

  /**
   * @param {Player} player
   * @param {string} cardName
   * @param {object} options {toHand: boolean}
   */
  gainCard(player, cardName, {toHand = false} = {}) {
    if (!this.store.counts[cardName]) {
      throw new Error(`Out of ${cardName}`);
    }

    const card = cards[cardName];

    if (toHand) {
      player.hand.push(card);
    } else {
      player.discardPile.push(card);
    }
    this.store.bought(card);
    this.allLog(`${player.name} gained ${cardName}`);
  }

  /**
   * @param {Player} player
   * @param {string} cardName
   */
  tryGainCard(player, cardName) {
    if (this.store.counts[cardName]) {
      this.gainCard(player, cardName);
    }
  }

  trashPush(player, card) {
    this.allLog(`${player.name} trashed ${card.name}`);
    this.trash.push(card);
  }
}

module.exports.Game = Game;
