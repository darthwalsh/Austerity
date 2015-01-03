var cards = (function() {

function Treasure(cost, money) {
  this.kind = "treasure";
  this.cost = cost;
  this.money = money;
  this.play = function(player, callback) {
    player.money += this.money;
    callback();
  };
}

function Property(cost, points) {
  this.kind = "property";
  this.cost = cost;
  this.points = points; //TODO function taking player?
}

function Action(cost, play) {
  this.kind = "action";
  this.cost = cost;
  this.play = function(player, callback) {
    play(player);
    callback();
  }
}

var cards = {
  Copper: new Treasure(0, 1),
  Silver: new Treasure(3, 2),
  Gold:   new Treasure(6, 3),

  Estate:  new Property(2, 1),
  Duchy:   new Property(5, 3),
  Province: new Property(8, 3),

  Festival: new Action(5, function(player) {
    player.actions += 2;
    player.buys += 1;
    player.money += 2;
  }),
  Laboratory: new Action(5, function(player) {
    player.draw(2);
    player.actions += 1;
  }),
  Market: new Action(5, function(player) {
    player.draw();
    player.actions += 1;
    player.buys += 1;
    player.money += 1;
  }),
  Moneylender: new Action(3, function(player) {
    var copper = player.fromHand(cards.Copper.name);
    if (copper) {
      player.money += 3;
      game.trash.push(copper);
    }
  }),
  Smithy: new Action(4, function(player) {
    player.draw(3);
  }),
  Village: new Action(3, function(player) {
    player.draw();
    player.actions += 2;
  }),
  Woodcutter: new Action(3, function(player) {
    player.buys  += 1;
    player.money += 2;
  })
};

for(var name in cards) {
  cards[name].name = name;
  cards[name].toString = function() { return this.name; };
}

return cards;
})();

