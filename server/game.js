const Store = require("./store").Store;
const cards = require("./cards");
const Player = require("./player").Player;

/**
 * @typedef { import("./connection").Connection } Connection
 * @typedef { import("./cards").Card } Card
 */

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

  /**
   * @param {boolean} debugMode
   */
  start(debugMode) {
    this.started = true;
    const ps = this.allPlayers();

    this.initClients(ps);

    ps.forEach(p => p.redrawHand());

    if (debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.allLog("!!!!!! " + ps[0].name + " IS CHEATING!!!!!!");
    }

    let turn = Math.floor(Math.random() * ps.length);
    const nextTurn = () => {
      if (this.store.gameOver()) {
        this.allLog("GAME OVER!!!");
        ps.sort((a, b) => b.getPoints() - a.getPoints()) // descending
          .map(p => `${p.name}: ${p.getPoints()}     ` +
            p.allCards()
              .filter(c => c.ofKind("victory") || c.ofKind("curse"))
              .map(c => c.name)
              .sort()
              .toString())
          .forEach(line => this.allLog(line));
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
      this.store.init(data.included.map(n => cards[n]), this.allPlayers().length);
      this.start(data.debugMode);
    };

    connection.ws.addEventListener("close", () => {
      this.allLog(player.name + " disconnected");
    });
  }

  allPlayers() {
    return Object.keys(this.players).map(n => this.players[n]);
  }

  /**
   * @param {Player} player
   * @return {Player[]}
   */
  otherPlayers(player) {
    return this.allPlayers().filter(p => p.name !== player.name);
  }

  /**
   * @param {Player} player
   * @param {function(Player): Promise<void>} attack
   * @return {Promise<void[]>}
   */
  parallelAttack(player, attack) {
    return Promise.all(this.otherPlayers(player).map(p => p.attacked(attack)));
  }

  /**
   * @param {Player} player
   * @param {function(Player): Promise<void>} attack
   */
  async sequentialAttack(player, attack) {
    const ps = this.allPlayers();
    ps.push(...ps.splice(0, ps.indexOf(player))); // Rotate around so player is ps[0]

    for (let i = 1; i < ps.length; ++i) {
      await ps[i].attacked(attack);
    }
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

  /**
   * @param {Player} player
   * @param {Card} card
   */
  trashPush(player, card) {
    this.allLog(`${player.name} trashed ${card.name}`);
    this.trash.push(card);
  }
}

module.exports.Game = Game;
