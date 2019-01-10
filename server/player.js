const cards = require("./cards");
// eslint-disable-next-line no-unused-vars
const Game = require("./game").Game; // Useful for VS Code type info

class Player {
  /**
   * @param {string} name
   * @param {any} socket
   * @param {Game} game
   */
  constructor(name, socket, game) {
    this.name = name;
    this.socket = socket;
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
    this.redrawHand();
    this.actions = null;
    this.money = null;
    this.buys = null;
    this.played = null;
    this.onChoice = null;
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

  promptAction() {
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
    this.sendChoice(choices, this.receiveAction);
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

  promptBuys() {
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
    this.sendChoice(choices, this.receiveBuys);
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

  playCard(name, callback) {
    const card = this.fromHand(name);
    if (card === null) {
      console.error("Card doesn't exist: " + name);
      return;
    }
    card.play(this, () => {
      this.afterPlay(card);
      callback();
    }, this.game);
  }

  afterPlay(card) {
    if (card.afterPlay) {
      card.afterPlay(this.game);
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
      console.error("drawPile isn't empty!");
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

  attacked(attackThenCallBack, callback) {
    if (this.hand.filter(c => c.name=="Moat").length) {
      this.sendChoice(["Moat", "Get Attacked"], choice => {
        if (choice == "Get Attacked") {
          attackThenCallBack();
        } else {
          callback();
        }
      });
    } else {
      attackThenCallBack();
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
    this.socket.send(JSON.stringify(o));
  }

  sendMessage(msg) {
    this.send({message: msg});
  }

  sendHand(prefix = "Your hand") {
    this.sendMessage(prefix + ": " + this.hand.map(c => c.name).join(", "));
  }

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
    this.send({choices: choices});
  }
}

module.exports.Player = Player;
