const cards = require("./cards");

/**
 * @typedef { import("./connection").Connection } Connection
 * @typedef { import("./game").Game } Game
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
    this.drawPile = [];
    this.discardPile = [];
    for (let i = 0; i < 7; ++i) {
      this.discardPile.push(cards.Copper);
    }
    for (let i = 0; i < 3; ++i) {
      this.discardPile.push(cards.Estate);
    }
    this.hand = [];
    this.actions = null;
    this.money = null;
    this.buys = null;
    this.played = null;
    this.afterTurn = null;
  }

  takeTurn(callback) {
    this.afterTurn = callback;
    this.actions = 1;
    this.money = 0;
    this.buys = 1;
    this.played = [];

    this.game.otherPlayers(this).forEach(p => p.sendMessage(`${this.name}'s turn`));
    this.sendMessage("");
    this.sendMessage("Your turn!");
    this.sendHand();
    this.promptAction();
  }

  async promptAction() {
    if (!this.actions) {
      this.sendMessage("No Action points remaining, starting Buy phase");
      this.promptBuys();
      return;
    }

    const actionCards = this.hand.filter(c => c.ofKind("action"));
    const choices = actionCards.map(c => c.name);

    if (!choices.length) {
      this.sendMessage("No Action cards to play, starting Buy phase");
      this.promptBuys();
      return;
    }

    choices.push("Done With Actions");

    this.sendPoints();
    this.receiveAction(await this.choose(choices));
  }

  receiveAction(choice) {
    if (choice == "Done With Actions") {
      this.promptBuys();
      return;
    }

    --this.actions;

    this.game.allLog(this.name + " played " + choice);
    this.playCard(choice, this.promptAction.bind(this));
  }

  sendPoints() {
    this.sendMessage(`Actions: ${this.actions} Money: ${this.money} Buys: ${this.buys}`);
  }

  async promptBuys() {
    if (!this.buys) {
      this.turnDone();
      return;
    }

    const treasureCards = this.hand.filter(c => c.ofKind("treasure"));

    const choices = treasureCards.map(c => c.name);

    if (choices.length) {
      choices.unshift("Play All Treasures");
      choices.push("\n");
    }

    Array.prototype.push.apply(choices,
      this.game.store.getAvailable(this.money).map(c => "Buy: " + c.name));

    if (!choices.length) {
      this.sendMessage("Nothing to buy");
      this.turnDone();
      return;
    }

    choices.push("Done With Buys");

    this.sendPoints();
    this.receiveBuys(await this.choose(choices));
  }

  receiveBuys(choice) {
    if (choice == "Done With Buys") {
      this.turnDone();
      return;
    }

    if (choice == "Play All Treasures") {
      this.playAllTreasures();
      return;
    }

    if (choice.substring(0, 5) == "Buy: ") {
      const buying = cards[choice.substring(5)];
      this.discardPile.push(buying);
      this.money -= buying.cost;
      --this.buys;

      this.game.allLog(this.name + " bought " + buying.name);
      this.game.store.bought(buying);
      this.promptBuys();
    } else {
      this.playCard(choice, this.promptBuys.bind(this));
    }
  }

  playAllTreasures() {
    const treasures = this.hand.filter(c => c.ofKind("treasure"));
    if (treasures.length) {
      this.playCard(treasures[0].name, this.playAllTreasures.bind(this));
    } else {
      this.promptBuys();
    }
  }

  fromHand(name) {
    const hi = this.hand.map(c => c.name).indexOf(name);
    if (hi == -1) {
      return null;
    }
    const card = this.hand.splice(hi, 1)[0];
    this.sendHand();
    return card;
  }

  fromDraw() {
    if (!this.drawPile.length) {
      this.shuffle();
      if (!this.drawPile.length) {
        return null;
      }
    }
    return this.drawPile.pop();
  }

  async playCard(name, callback) {
    const card = this.fromHand(name);
    if (card === null) {
      throw new Error("Card doesn't exist: " + name);
    }
    await card.play(this, this.game);
    this.afterPlay(card);
    callback();
  }

  afterPlay(card) {
    if (card.afterPlay) {
      card.afterPlay(this, this.game);
    } else {
      this.played.push(card);
    }
  }

  turnDone() {
    Array.prototype.push.apply(this.discardPile, this.hand.splice(0));
    Array.prototype.push.apply(this.discardPile, this.played.splice(0));

    this.sendMessage("");
    this.redrawHand();

    this.afterTurn();
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

    const array = this.discardPile;

    // Fisher-Yates (aka Knuth) Shuffle.
    let currentIndex = array.length, temporaryValue, rIndex;
    while (0 !== currentIndex) {
      rIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[rIndex];
      array[rIndex] = temporaryValue;
    }

    this.drawPile = this.discardPile;
    this.discardPile = [];
  }

  /**
   * @param {function(Player): Promise<void>} attack
   */
  async attacked(attack) {
    if (this.hand.filter(c => c.name=="Moat").length) {
      const choice = await this.choose(["Moat", "Get Attacked"]);
      if (choice === "Get Attacked") {
        return attack(this);
      }
    } else {
      return attack(this);
    }
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

  choose(choices) {
    return this.connection.choose(choices);
  }
}

module.exports.Player = Player;
