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
    this.victory = 0;
    this.phase = /** @type {"" | "action" | "buy" | "cleanup"} */ ("");
    this.enableSendHand = true;
  }

  async takeTurn() {
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
    this.cleanupPhase();
    this.phase = "";
  }

  async actionPhase() {
    this.phase = "action";
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
    this.phase = "buy";

    let bought = false;

    for (;;) {
      if (!this.buys) {
        return;
      }

      const treasureCards = this.hand.filter(c => c.ofKind("treasure"));
      const choices = [];

      if (!bought) {
        choices.push(...treasureCards.map(c => c.name));

        if (choices.length) {
          choices.unshift("Play All Treasures");
          choices.push("\n");
        }
      }

      choices.push(...this.game.store.getAvailable(this.money, this).map(c => "Buy: " + c.name));

      if (!choices.length) {
        this.game.allLog(`${this.name} wasn't able to buy anything`);
        return;
      }

      choices.push("Done With Buys");

      this.sendPoints();
      const choice = await this.choose(choices);

      if (choice === "Done With Buys") {
        if (!bought) {
          this.game.allLog(`${this.name} chose not to buy anything`);
        }
        return;
      }

      if (choice === "Play All Treasures") {
        await this.playAllTreasures();
        continue;
      }

      if (choice.substring(0, 5) === "Buy: ") {
        bought = true;
        this.buyCard(choice.substring(5));
      } else {
        this.game.allLog(this.name + " played " + choice);
        await this.playCard(choice);
      }
    }
  }

  /**
   * @param {string} buyChoice
   */
  buyCard(buyChoice) {
    const buying = cards[buyChoice];
    this.discardPile.push(buying);
    this.money -= buying.getCost(this);
    --this.buys;
    this.game.allLog(this.name + " bought " + buying.name);
    this.game.store.gain(buying);
    buying.onThisBought && buying.onThisBought(this);
    for (const onBought of this.played.map(c => c.onBought).filter(f => f)) {
      onBought(this, buying);
    }
  }

  async playAllTreasures() {
    const before = this.money;

    this.sendHand();
    this.enableSendHand = false;

    // When implementing nontrivial treasures, this probably shouldn't include them
    for (const treasure of this.hand.filter(c => c.ofKind("treasure"))) {
      await this.playCard(treasure.name);
    }
    this.game.allLog(`${this.name} played all treasures for +${this.money - before} coin`);

    this.enableSendHand = true;
    this.sendHand();
  }

  /**
   * @param {string} name
   */
  fromHand(name) {
    const hi = this.hand.map(c => c.name).indexOf(name);
    if (hi === -1) {
      throw new Error(`Card ${name} not in hand: ${this.hand.map(c => c.name).join(", ")}`);
    }
    const card = this.hand.splice(hi, 1)[0];
    this.sendHand();
    return card;
  }

  /**
   * @param {object} options
   * @param {boolean} [options.reveal]
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

  /**
   * @param {Card} trash
   */
  trashPush(trash) {
    this.game.trashPush(this, trash);
  }

  /**
   * @param {number} points
   */
  gainVictory(points) {
    this.game.allLog(`${this.name} gained ${points} Victory tokens`);
    this.victory += points;
  }

  /**
   * @param {Card[]} discard Cards to discard, where [0] is revealed
   */
  discardPush(discard) {
    if (!discard.length) {
      return;
    }
    const others = discard.length > 1 ? ` and ${discard.length - 1} more` : "";
    this.game.allLog(`${this.name} discarded ${discard[0].name}${others}`);
    this.discardPile.push(...discard);
  }

  /**
   * @param {string} name
   */
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

  cleanupPhase() {
    this.phase = "cleanup";

    this.discardPile.push(...this.hand.splice(0));
    this.discardPile.push(...this.played.splice(0));

    this.sendMessage("");
    this.redrawHand();
  }

  /**
   * @param {string} [prefix]
   */
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
    this.discardPile = /** @type {Card[]} */ ([]);
  }

  /**
   * @param {(p: Player) => Promise<void>} attack
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

  /**
   * @return {number}
   */
  getPoints() {
    return (
      this.victory + this.allCards().reduce((a, c) => a + (c.getPoints ? c.getPoints(this) : 0), 0)
    );
  }

  allCards() {
    const all = this.drawPile.concat(this.discardPile).concat(this.hand);
    if (this.played) {
      return all.concat(this.played);
    }
    return all;
  }

  /**
   * @param {object} o
   */
  send(o) {
    this.connection.send(o);
  }

  /**
   * @param {string} msg
   */
  sendMessage(msg) {
    this.connection.send({message: msg});
  }

  sendHand(prefix = "Your hand") {
    if (!this.enableSendHand) {
      return;
    }

    this.hand.sort((a, b) => a.compareTo(b));
    this.sendMessage(prefix + ": " + this.hand.map(c => c.name).join(", "));
  }

  /**
   * @param {string[]} choices
   */
  choose(choices) {
    return this.connection.choose(choices);
  }
}

module.exports = Player;
