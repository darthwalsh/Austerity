const cards = require("./cards");

/**
 * @typedef { import("./connection") } Connection
 * @typedef { import("./game") } Game
 * @typedef { import("./cards").Card } Card
 */

class Player {
  /**
   * @param {Connection} connection
   * @param {Game} game
   */
  constructor(connection, game) {
    this.name = connection.name;
    this.connection = connection;
    this.game = game;
    this.drawPile = /** @type {Card[]} */ ([]);
    this.discardPile = /** @type {Card[]} */ ([]);
    for (let i = 0; i < 7; ++i) {
      this.discardPile.push(cards.Copper);
    }
    for (let i = 0; i < 3; ++i) {
      this.discardPile.push(cards.Estate);
    }
    this.hand = /** @type {Card[]} */ ([]);
  }

  async takeTurn(callback) {
    this.actions = 1;
    this.money = 0;
    this.buys = 1;
    this.played = /** @type {Card[]} */ ([]);
    this.onPlayed = /** @type {(function(Card): void)[]} */ ([]);

    this.game.otherPlayers(this).forEach(p => p.sendMessage(`${this.name}'s turn`));
    this.sendMessage("");
    this.sendMessage("Your turn!");
    this.sendHand();
    await this.actionPhase();
    await this.buyPhase();
    this.turnDone();
    callback();
  }

  async actionPhase() {
    for (;;) {
      if (!this.actions) {
        this.sendMessage("No Action points remaining, starting Buy phase");
        return;
      }

      const actionCards = this.hand.filter(c => c.ofKind("action"));
      const choices = actionCards.map(c => c.name);

      if (!choices.length) {
        this.sendMessage("No Action cards to play, starting Buy phase");
        return;
      }

      choices.push("Done With Actions");

      this.sendPoints();
      const choice = await this.choose(choices);

      if (choice === "Done With Actions") {
        return;
      }

      --this.actions;

      this.game.allLog(this.name + " played " + choice);
      await this.playCard(choice);
    }
  }

  sendPoints() {
    this.sendMessage(`Actions: ${this.actions} Money: ${this.money} Buys: ${this.buys}`);
  }

  async buyPhase() {
    for (;;) {
      if (!this.buys) {
        return;
      }

      const treasureCards = this.hand.filter(c => c.ofKind("treasure"));
      const choices = treasureCards.map(c => c.name);

      if (choices.length) {
        choices.unshift("Play All Treasures");
        choices.push("\n");
      }

      choices.push(...this.game.store.getAvailable(this.money).map(c => "Buy: " + c.name));

      if (!choices.length) {
        this.sendMessage("Nothing to buy");
        return;
      }

      choices.push("Done With Buys");

      this.sendPoints();
      const choice = await this.choose(choices);

      if (choice === "Done With Buys") {
        return;
      }

      if (choice === "Play All Treasures") {
        this.playAllTreasures();
        continue;
      }

      if (choice.substring(0, 5) === "Buy: ") {
        const buying = cards[choice.substring(5)];
        this.discardPile.push(buying);
        this.money -= buying.cost;
        --this.buys;

        this.game.allLog(this.name + " bought " + buying.name);
        this.game.store.bought(buying);
      } else {
        this.game.allLog(this.name + " played " + choice);
        await this.playCard(choice);
      }
    }
  }

  playAllTreasures() {
    const before = this.money;

    // When implementing nontrivial treasures, this probably shouldn't include them
    for (const treasure of this.hand.filter(c => c.ofKind("treasure"))) {
      this.playCard(treasure.name);
    }
    this.game.allLog(`${this.name} played all treasures for ${this.money - before} coin`);
  }

  fromHand(name) {
    const hi = this.hand.map(c => c.name).indexOf(name);
    if (hi === -1) {
      return null;
    }
    const card = this.hand.splice(hi, 1)[0];
    this.sendHand();
    return card;
  }

  /**
   * @param {object} options
   * @param {boolean} [options.reveal]
   * @return {Card}
   */
  fromDraw({reveal = false} = {}) {
    if (!this.drawPile.length) {
      this.shuffle();
      if (!this.drawPile.length) {
        return null;
      }
    }
    const drawn = this.drawPile.pop();
    if (reveal) {
      this.game.allLog(`${this.name} revealed ${drawn.name}`);
    }
    return drawn;
  }

  /**
   * @param {number} count
   * @param {object} [options]
   * @param {boolean} [options.reveal]
   * @return {Card[]}
   */
  multiFromDraw(count, options = {}) {
    const cards = [];
    for (let i = 0; i < count; ++i) {
      const draw = this.fromDraw(options);
      if (!draw) {
        break;
      }
      cards.push(draw);
    }
    return cards;
  }

  async playCard(name) {
    const card = this.fromHand(name);
    if (card === null) {
      throw new Error("Card doesn't exist: " + name);
    }
    await card.play(this);
    this.afterPlay(card);
  }

  /**
   * @param {Card} card
   */
  afterPlay(card) {
    for (const e of this.onPlayed) {
      e(card);
    }
    if (card.afterPlay) {
      card.afterPlay(this);
    } else {
      this.played.push(card);
    }
  }

  turnDone() {
    this.discardPile.push(...this.hand.splice(0));
    this.discardPile.push(...this.played.splice(0));

    this.sendMessage("");
    this.redrawHand();
  }

  draw(n = 1, prefix) {
    for (let i = 0; i < n; ++i) {
      const card = this.fromDraw();
      if (card) {
        this.hand.push(card);
      }
    }
    this.sendHand(prefix);
  }

  redrawHand() {
    this.draw(5, "Your upcoming hand");
  }

  shuffle() {
    if (this.drawPile.length) {
      throw new Error("drawPile isn't empty!");
    }

    this.game.shuffle(this.discardPile);

    this.drawPile = this.discardPile;
    this.discardPile = [];
  }

  /**
   * @param {function(Player): Promise<void>} attack
   */
  async attacked(attack) {
    if (this.hand.filter(c => c.name === "Moat").length) {
      const choice = await this.choose(["Moat", "Get Attacked"]);
      if (choice === "Moat") {
        this.game.allLog(`${this.name} revealed Moat`);
        return;
      }
    }
    return attack(this);
  }

  getPoints() {
    return this.allCards().reduce((a, c) => a + (c.getPoints ? c.getPoints(this) : 0), 0);
  }

  allCards() {
    const all = this.drawPile.concat(this.discardPile).concat(this.hand);
    if (this.played) {
      return all.concat(this.played);
    }
    return all;
  }

  send(o) {
    this.connection.send(o);
  }

  sendMessage(msg) {
    this.connection.send({message: msg});
  }

  sendHand(prefix = "Your hand") {
    this.hand.sort((a, b) => a.compareTo(b));
    this.sendMessage(prefix + ": " + this.hand.map(c => c.name).join(", "));
  }

  /**
   * @param {string[]} choices
   * @return {Promise<string>}
   */
  choose(choices) {
    return this.connection.choose(choices);
  }
}

module.exports = Player;
