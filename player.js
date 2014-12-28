var Player = function (name, socket) {
  this.name = name;
  this.socket = socket;
  this.drawPile = [];
  this.discardPile = [];
//TODO  for(var i = 0; i < 7; ++i)
//    this.discardPile.push(cards.Copper);
  for(var i = 0; i < 3; ++i)
    this.discardPile.push(cards.Estate);
    
  this.discardPile.push(cards.Smithy); //TODO
  this.discardPile.push(cards.Village);
  
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
    this.buys = 0;
    this.played = [];
    
    this.promptAction();
  }
  
  promptAction = function() {
    this.send({message: "Actions: " + this.actions + 
                       " Money: " + this.money + 
                       " Buys: " + this.buys});
    
    var actionCards = this.hand.filter(function(c){return c.kind=="action";});
    
    if (!actionCards.length) {
      this.send({message:"No actions to play"});
      break;
    }
    
    var choices = actions.map(function(c){return c.name;});
    choices.push("Done With Actions");
    
    
    this.onChoice = this.receiveAction; //TODO correct this?
    this.send({choices:choices});
  },
  
  receiveAction: function(choice) {
    this.onChoice = null;
    
    if(choice == "Done With Actions") {
      this.promptBuys();
    }
      
    var hi = this.hand.map(function(C){return c.name;}).indexOf(choice);
    if (hi == -1)
      console.error("Bad choice: " + choice);
    var card = this.hand.splice(hi, 1)[0];
    
    card.play(this);
    --this.actions;
    
    this.played.push(card);
    
    if(this.actions)
      promptAction();
    else
      promptBuys();
  },
  
  turnDone: function() {
    Array.prototype.push.apply(this.discardPile, this.hand);
    Array.prototype.push.apply(this.discardPile, played);
    
    this.draw(5);
    this.onChoice = null;
  }
    
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
