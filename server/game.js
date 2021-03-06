const cards = require("./cards");
const setOrder = require("./setOrder");
const Store = require("./store");
const Player = require("./player");

/**
 * @typedef { import("./connection") } Connection
 * @typedef { import("./cards").Card } Card
 */

class Game {
  /**
   * @param {object} options
   * @param {(array: any[]) => any[]} [options.shuffle]
   */
  constructor({shuffle = null} = {}) {
    this.store = new Store();
    /**
     * @type {Object.<string, Player>}
     */
    this.players = {};
    this.trash = /** @type {Card[]} */ ([]);
    this.started = false;
    this.shuffle = shuffle || this.fisherYatesShuffle;
  }

  /**
   * @param {any[]} array
   */
  fisherYatesShuffle(array) {
    let currentIndex = array.length;
    while (0 !== currentIndex) {
      const rIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      const temporaryValue = array[currentIndex];
      array[currentIndex] = array[rIndex];
      array[rIndex] = temporaryValue;
    }
    return array;
  }

  /**
   * @param {Player[]} ps
   */
  initClients(ps) {
    const included = this.store.included
      .sort((a, b) => a.compareTo(b, {compareKind: false}))
      .map(c => c.name);
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
  async start(debugMode) {
    this.started = true;
    const ps = this.allPlayers();

    this.initClients(ps.filter(p => p.connection.connected)); // disconnected clients will be initialized later

    ps.forEach(p => p.redrawHand());

    if (debugMode) {
      ps[0].hand.push(...this.store.getAvailable(99, null));
      ps[0].sendHand();
      this.allLog("!!!!!! " + ps[0].name + " IS CHEATING!!!!!!");
    }

    let turn = this.shuffle([...Array(ps.length).keys()])[0];

    for (;;) {
      await ps[turn % ps.length].takeTurn();
      ++turn;

      if (this.store.gameOver()) {
        this.allLog("");
        this.allLog("GAME OVER!!!");
        ps.sort((a, b) => b.getPoints() - a.getPoints()) // descending
          .map(
            p =>
              `${p.name}: ${p.getPoints()}     +VP: ${p.victory} Cards: ${this.getEndGame(
                p.allCards()
              )}`
          )
          .forEach(line => this.allLog(line));
        return;
      }
    }
  }

  /**
   * @param {Card[]} cards
   */
  getEndGame(cards) {
    cards = cards.slice().sort((a, b) => a.compareTo(b));
    const isPoint = /** @param {Card} c */ c => c.ofKind("victory") || c.ofKind("curse");
    const byVictory = [...cards.filter(isPoint), ...cards.filter(c => !isPoint(c))];

    const map = new Map();
    byVictory.forEach(c => map.set(c.name, 1 + (map.get(c.name) || 0)));

    return Array.from(map, ([name, count]) => `${name} (${count})`).join(", ");
  }

  /**
   * @param {Connection} connection
   */
  addPlayer(connection) {
    if (this.started) {
      throw new Error("Can't change players after game started");
    }
    const name = connection.name;

    const player = new Player(connection, this);

    if (!Object.keys(this.players).length) {
      const setCards = setOrder.reduce((o, set) => {
        o[set] = this.store
          .optional()
          .filter(card => card.set === set)
          .map(c => c.name);
        return o;
      }, {});
      player.send({isLeader: setCards});
      player.send({
        included: this.store
          .optional()
          .sort((a, b) => a.compareTo(b, {compareSet: true}))
          .map(c => c.name),
      });
    } else {
      player.sendMessage("Waiting for the leader to start the game");
      this.allLog(player.name + " joined");
    }
    this.players[name] = player;

    connection.messageHandlers.chat = data => {
      this.allLog(player.name + ": " + data);
    };

    connection.messageHandlers["gameStart"] =
      /** @param {{included: string[], debugMode: boolean}} data */
      data => {
        this.store.init(
          data.included.map(n => cards[n]),
          this.allPlayers().length
        );
        this.start(data.debugMode);
      };

    connection.ws.addEventListener("close", () => {
      this.allLog(player.name + " disconnected");
    });
  }

  /**
   * @param {Connection} connection
   */
  removePlayer(connection) {
    if (this.started) {
      throw new Error("Can't change players after game started");
    }
    delete this.players[connection.name];
  }

  allPlayers() {
    return Object.keys(this.players).map(n => this.players[n]);
  }

  /**
   * @param {Player} player
   */
  otherPlayers(player) {
    return this.allPlayers().filter(p => p.name !== player.name);
  }

  /**
   * @param {Player} player
   * @param {(other: Player) => Promise<void>} attack
   */
  parallelAttack(player, attack) {
    return Promise.all(this.otherPlayers(player).map(p => p.attacked(attack)));
  }

  /**
   * @param {Player} player
   * @param {(other: Player) => Promise<void>} attack
   */
  async sequentialAttack(player, attack) {
    const ps = this.allPlayers();
    ps.push(...ps.splice(0, ps.indexOf(player))); // Rotate around so player is ps[0]

    for (let i = 1; i < ps.length; ++i) {
      await ps[i].attacked(attack);
    }
  }

  /**
   * @param {string} text
   */
  allLog(text) {
    for (const id in this.players) {
      this.players[id].sendMessage(text);
    }
  }

  /**
   * @param {Player} player
   * @param {string} cardName
   * @param {object} options
   * @param {boolean} [options.toHand]
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
    this.store.gain(card);
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

module.exports = Game;
