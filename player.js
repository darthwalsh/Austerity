function Player(name, socket) {
  this.name = name;
  this.socket = socket;
  this.drawPile = [];
  this.discardPile = [];
  for(var i = 0; i < 7; ++i)
    this.discardPile.push(cards.Copper);
  for(var i = 0; i < 3; ++i)
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

    var actionCards = this.hand.filter(function(c){return c.ofKind("action");});
    var choices = actionCards.map(function(c){return c.name;});

    if (!choices.length) {
      this.sendMessage("No Actions to play");
      this.promptBuys();
      return;
    }

    choices.push("Done With Actions");

    var message = "Actions: " + this.actions + " Money: " + this.money + " Buys: " + this.buys;
    this.sendMessage(message);
    this.sendChoice(choices, this.receiveAction);
  },

  receiveAction: function(choice) {
    if(choice == "Done With Actions") {
      this.promptBuys();
      return;
    }

    --this.actions;

    game.alllog(this.name + " played " + choice);
    this.playCard(choice, this.promptAction.bind(this));
  },

  promptBuys: function() {
    if(!this.buys) {
      this.turnDone();
      return;
    }

    var treasureCards = this.hand.filter(function(c){return c.ofKind("treasure");});

    var choices = treasureCards.map(function(c){return c.name;});

    if (choices.length) {
      choices.unshift("Play All Treasures");
      choices.push("\n");
    }

    Array.prototype.push.apply(choices,
      game.store.getAvailable(this.money).map(function(c){return "Buy: " + c.name}));

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
      var buying = cards[choice.substring(5)];
      this.discardPile.push(buying);
      this.money -= buying.cost;
      --this.buys;

      game.alllog(this.name + " bought " + buying.name);
      game.store.bought(buying);
      this.promptBuys();
    } else {
      this.playCard(choice, this.promptBuys.bind(this));
    }
  },

  playAllTreasures: function() {
    var treasures = this.hand.filter(function(c){return c.ofKind("treasure");});
    if (treasures.length) {
      this.playCard(treasures[0].name, this.playAllTreasures.bind(this));
    } else {
      this.promptBuys();
    }
  },

  fromHand: function(name) {
    var hi = this.hand.map(function(c){return c.name;}).indexOf(name);
    if (hi == -1)
      return null;
    var card = this.hand.splice(hi, 1)[0];
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
    var t = this;
    var card = this.fromHand(name);
    if (card == null) {
      console.error("Card doesn't exist: " + name);
      return;
    }
    card.play(this, function() {
      t.played.push(card);
      callback();
    });
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

    for(var i = 0; i < n; ++i) {
      var card = this.fromDraw();
      if (card)
        this.hand.push(card);
    }
    this.sendHand();
  },

  shuffle: function() {
    if(this.drawPile.length)
      console.error("drawPile isn't empty!");

    var array = this.discardPile;

    // Fisher-Yates (aka Knuth) Shuffle.
    var currentIndex = array.length, temporaryValue, randomIndex ;
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

  attacked: function(attack, callback) {
    if(this.hand.filter(function(c){return c.name=="Moat";}).length) {
      this.sendChoice(["Moat", "Get Attacked"], function(choice) {
        if(choice == "Get Attacked")
          attack();
        callback();
      });
    } else {
      attack();
      callback();
    }
  },

  getPoints: function() {
    var t = this;
    return this.allCards().reduce(
      function(a, c) { return a + (c.getPoints ? c.getPoints(t) : 0); }, 0);
  },

  allCards: function() {
    var all = this.drawPile.concat(this.discardPile).concat(this.hand);
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
    this.sendMessage("Hand: " + this.hand.map(function(c){return c.name}).toString());
  },

  sendChoice: function(choices, handleChoice) {
    var t = this;
    if (this.onChoice)
      console.error("onChoice wasn't empty!!!");
    this.onChoice = function(choice) {
      t.onChoice = null;
      handleChoice.call(t, choice);
    };
    this.send({choices:choices});
  }
}

// Loudly fail so nobody can try-catch these errors
for(var name in Player.prototype)
  Player.prototype[name] = util.wrapErrors(Player.prototype[name]);
