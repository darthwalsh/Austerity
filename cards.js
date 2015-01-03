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

function Mine() {
  this.kind = "action";
  this.cost = 5;
  this.play = function(player, callback) {
    var trashChoices = player.hand
      .filter(function(c){return c.kind=="treasure";})
      .map(function(c){return c.name;});
    if (!trashChoices.length) {
      player.send({message: "No Treasures to trash"})
      callback();
      return;
    }
    player.send({message: "Trash a Treasure:"})
    player.sendChoice(trashChoices, function(trashChoice) {
      var trash = player.fromHand(trashChoice);
      game.trash.push(trash);

      var gainChoices = game.store
        .getAvailable(trash.cost+3)
        .filter(function(c){return c.kind=="treasure";})
        .map(function(c){return c.name;});
      if (!gainChoices.length) {
        callback();
        return;
      }

      player.send({message: "Gain a Treasure:"})
      player.sendChoice(gainChoices, function(gainChoice) {
        player.hand.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
      });
    });
  };
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
  Mine: new Mine(),
  Moneylender: new Action(4, function(player) {
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

