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
  
  this.onChoice = null; //TODO should it be a stack?
}

Player.prototype = {
  takeTurn: function() {
    this.actions = 1;
    this.money = 0;
    this.buys = 0;
    
    var played = [];
    
    while(this.actions) {
      this.send({message: "Actions: " + this.actions + 
                         " Money: " + this.money + 
                         " Buys: " + this.buys});
      
      var actions = this.hand.filter(function(c){return c.kind=="action";});
      
      if (!actions.length) {
        this.send({message:"No actions to play"});
        break;
      }
      
      var choices = actions.map(function(c){return c.name;});
      choices.push("Done With Actions");
      
      this.onChoice = function(choice) {
        if(choice == "Done With Actions") {
          this.actions = 1;
          return;
        }
        
        var hi = this.hand.map(function(C){return c.name;}).indexOf(choice);
        if (hi == -1)
          console.error("Bad choice: " + choice + "  Choices: " + choices);
        var card = this.hand.splice(hi, 1)[0];
        card.play(this);
        played.push(card);
      }
      
      this.send({choices:choices});
      console.error("TODO async")
      this.onChoice = null;
    
      --this.actions;
    }
    
    console.error("TODO BUYS");
    
    Array.prototype.push.apply(this.discardPile, this.hand);
    Array.prototype.push.apply(this.discardPile, played);
    
    this.draw(5);
    this.onChoice = null;
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
