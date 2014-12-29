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

  this.onChoice = null; //TODO should it be a stack?
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

    this.sendStatus();

    var actionCards = this.hand.filter(function(c){return c.kind=="action";});
    var choices = actionCards.map(function(c){return c.name;});

    if (!choices.length) {
      this.send({message:"No actions to play"});
      this.promptBuys();
      return;
    }

    choices.push("Done With Actions");

    this.onChoice = this.receiveAction;
    this.send({choices:choices});
  },

  receiveAction: function(choice) {
    this.onChoice = null;

    if(choice == "Done With Actions") {
      this.promptBuys();
      return;
    }

    this.playCard(choice);
    --this.actions;

    this.promptAction();
  },

  promptBuys: function() {
    if(!this.buys) {
      this.turnDone();
      return;
    }

    this.sendStatus();

    var treasureCards = this.hand.filter(function(c){return c.kind=="treasure";});

    var choices = treasureCards.map(function(c){return c.name;});

    if (choices.length) {
      choices.unshift("Play All Treasures");
      choices.push("\n");
    }

    Array.prototype.push.apply(choices,
      store.getAvailable(this.money).map(function(c){return "Buy: " + c.name}));

    if (!choices.length) {
      this.send({message:"Nothing to buy"});
      this.turnDone();
      return;
    }

    choices.push("Done With Buys");

    this.onChoice = this.receiveBuys;
    this.send({choices:choices});
  },

  receiveBuys: function(choice) {
    var t = this;
    this.onChoice = null;

    if (choice == "Done With Buys") {
      this.turnDone();
      return;
    }

    if (choice == "Play All Treasures") {
      this.hand
        .filter(function(c){return c.kind=="treasure";})
        .forEach(function(c){t.playCard(c.name)});
      this.promptBuys();
      return;
    }

    if (choice.substring(0, 5) == "Buy: ") {
      var buying = cards[choice.substring(5)];
      this.discardPile.push(buying);
      this.money -= buying.cost;
      --this.buys;

      //TODO reduce number of cards in store
    } else {
      this.playCard(choice);
    }

    this.promptBuys();
  },

  playCard: function(name) {
    var hi = this.hand.map(function(c){return c.name;}).indexOf(name);
      if (hi == -1)
        console.error("Bad choice: " + choice);
    var card = this.hand.splice(hi, 1)[0];
    card.play(this); //TODO will need to be async to handle cards with user interaction
    this.played.push(card);
  },

  sendStatus: function() {
    var message = "Hand: " + this.hand.map(function(c){return c.name}).toString();
    message += "\r\n";

    message += "Actions: " + this.actions;
    message += " Money: " + this.money;
    message += " Buys: " + this.buys;

    this.send({message: message});
  },

  turnDone: function() {
    Array.prototype.push.apply(this.discardPile, this.hand.splice(0));
    Array.prototype.push.apply(this.discardPile, this.played.splice(0));
    this.draw(5);

    this.send({message: ""});
    this.sendStatus();

    this.afterTurn();
  },

  draw: function(n) {
    for(var i = 0; i < (n || 1); ++i) {
      if(!this.drawPile.length) {
        this.shuffle();
        if(!this.drawPile.length)
          return;
      }
      this.hand.push(this.drawPile.pop());
    }
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

  send: function(o) {
    this.socket.send(JSON.stringify(o));
  }
}

// Loudly fail so nobody can try-catch these errors
for(var name in Player.prototype)
  Player.prototype[name] = util.wrapErrors(Player.prototype[name]);
