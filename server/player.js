const util = require("./util");
const cards = require("./cards");

function Player(name, socket) {
  this.name = name;
  this.socket = socket;
  this.drawPile = [];
  this.discardPile = [];
  for(let i = 0; i < 7; ++i)
    this.discardPile.push(cards.Copper);
  for(let i = 0; i < 3; ++i)
    this.discardPile.push(cards.Estate);

  this.hand = [];
  this.draw(5);

  this.actions = null;
  this.money = null;
  this.buys = null;
  this.played = null;

  this.onChoice = null;
  this.afterTurn = null;
}

Player.prototype = {
  takeTurn: function(callback) {
    this.afterTurn = callback;
    this.actions = 1;
    this.money = 0;
    this.buys = 1;
    this.played = [];

    this.promptAction();
  },

  promptAction: function() {
    if(!this.actions) {
      this.promptBuys();
      return;
    }

    const actionCards = this.hand.filter(function(c){return c.ofKind("action");});
    const choices = actionCards.map(function(c){return c.name;});

    if (!choices.length) {
      this.sendMessage("No Actions to play");
      this.promptBuys();
      return;
    }

    choices.push("Done With Actions");

    const message = "Actions: " + this.actions + " Money: " + this.money + " Buys: " + this.buys;
    this.sendMessage(message);
    this.sendChoice(choices, this.receiveAction);
  },

  receiveAction: function(choice) {
    if(choice == "Done With Actions") {
      this.promptBuys();
      return;
    }

    --this.actions;

    game.allLog(this.name + " played " + choice);
    this.playCard(choice, this.promptAction.bind(this));
  },

  promptBuys: function() {
    if(!this.buys) {
      this.turnDone();
      return;
    }

    const treasureCards = this.hand.filter(function(c){return c.ofKind("treasure");});

    const choices = treasureCards.map(function(c){return c.name;});

    if (choices.length) {
      choices.unshift("Play All Treasures");
      choices.push("\n");
    }

    Array.prototype.push.apply(choices,
      game.store.getAvailable(this.money).map(function(c){return "Buy: " + c.name;}));

    if (!choices.length) {
      this.sendMessage("Nothing to buy");
      this.turnDone();
      return;
    }

    choices.push("Done With Buys");

    this.sendMessage("Money: " + this.money + " Buys: " + this.buys);
    this.sendChoice(choices, this.receiveBuys);
  },

  receiveBuys: function(choice) {
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

      game.allLog(this.name + " bought " + buying.name);
      game.store.bought(buying);
      this.promptBuys();
    } else {
      this.playCard(choice, this.promptBuys.bind(this));
    }
  },

  playAllTreasures: function() {
    const treasures = this.hand.filter(function(c){return c.ofKind("treasure");});
    if (treasures.length) {
      this.playCard(treasures[0].name, this.playAllTreasures.bind(this));
    } else {
      this.promptBuys();
    }
  },

  fromHand: function(name) {
    const hi = this.hand.map(function(c){return c.name;}).indexOf(name);
    if (hi == -1)
      return null;
    const card = this.hand.splice(hi, 1)[0];
    this.sendHand();
    return card;
  },

  fromDraw: function() {
    if(!this.drawPile.length) {
      this.shuffle();
      if(!this.drawPile.length)
        return null;
    }
    return this.drawPile.pop();
  },

  playCard: function(name, callback) {
    const t = this;
    const card = this.fromHand(name);
    if (card === null) {
      console.error("Card doesn't exist: " + name);
      return;
    }
    card.play(this, function() {
      t.afterPlay(card);
      callback();
    });
  },

  afterPlay: function(card) {
    if (card.afterPlay) {
      card.afterPlay(this);
    } else {
      this.played.push(card);
    }
  },

  turnDone: function() {
    Array.prototype.push.apply(this.discardPile, this.hand.splice(0));
    Array.prototype.push.apply(this.discardPile, this.played.splice(0));

    this.sendMessage("");
    this.draw(5);

    this.afterTurn();
  },

  draw: function(n) {
    if (typeof n === "undefined") {
      n = 1;
    }

    for(let i = 0; i < n; ++i) {
      const card = this.fromDraw();
      if (card)
        this.hand.push(card);
    }
    this.sendHand();
  },

  shuffle: function() {
    if(this.drawPile.length)
      console.error("drawPile isn't empty!");

    const array = this.discardPile;

    // Fisher-Yates (aka Knuth) Shuffle.
    let currentIndex = array.length, temporaryValue, randomIndex ;
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    this.drawPile = this.discardPile;
    this.discardPile = [];
  },

  attacked: function(attackThenCallBack, callback) {
    if(this.hand.filter(function(c){return c.name=="Moat";}).length) {
      this.sendChoice(["Moat", "Get Attacked"], function(choice) {
        if(choice == "Get Attacked") {
          attackThenCallBack();
        } else {
          callback();
        }
      });
    } else {
      attackThenCallBack();
    }
  },

  getPoints: function() {
    const t = this;
    return this.allCards().reduce(
      function(a, c) { return a + (c.getPoints ? c.getPoints(t) : 0); }, 0);
  },

  allCards: function() {
    const all = this.drawPile.concat(this.discardPile).concat(this.hand);
    if (this.played)
      return all.concat(this.played);
    return all;
  },

  send: function(o) {
    this.socket.send(JSON.stringify(o));
  },

  sendMessage: function(msg) {
    this.send({message:msg});
  },

  sendHand: function() {
    this.sendMessage("Your hand: " + this.hand.map(function(c){return c.name;}).join(", "));
  },

  sendChoice: function(choices, handleChoice) {
    if(!choices.length) {
      console.error("EMPTY CHOICE!!!");
    }

    const t = this;
    if (this.onChoice)
      console.error("onChoice wasn't empty!!!");
    this.onChoice = function(choice) {
      t.onChoice = null;
      handleChoice.call(t, choice);
    };
    this.send({choices:choices});
  },
};

// Loudly fail so nobody can try-catch these errors
for(const name in Player.prototype)
  Player.prototype[name] = util.wrapErrors(Player.prototype[name]);

module.exports.Player = Player;