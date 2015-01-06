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

function Cellar() {
  this.kind = "action";
  this.cost = 2;
  this.play = function(player, callback) {
    player.actions += 1;
    var discarded = 0;

    var end = function() {
      player.draw(discarded);
      callback();
    };

    var promptDiscard = function() {
      var choices = player.hand.map(function(c){return c.name;});
      if (!choices.length) {
        end();
        return;
      }
      choices.push("Done Discarding");

      player.sendMessage("Discard cards:");
      player.sendChoice(choices, function(choice) {
        if(choice == "Done Discarding") {
          end();
          return;
        }

        var discard = player.fromHand(choice);
        ++discarded;
        player.discardPile.push(discard);

        promptDiscard();
      });
    };

    promptDiscard();
  }
}

function Chapel() {
  this.kind = "action";
  this.cost = 2;
  this.play = function(player, callback) {
    var canTrash = 4;

    var promptTrash = function() {
      var trashChoices = player.hand.map(function(c){return c.name;});
      if (!trashChoices.length) {
        callback();
        return;
      }
      trashChoices.push("Done Trashing");

      player.sendMessage("Trash up to " + canTrash + " cards:");
      player.sendChoice(trashChoices, function(choice) {
        if(choice == "Done Trashing") {
          callback();
          return;
        }

        var trash = player.fromHand(choice);
        game.trash.push(trash);
        --canTrash;

        if (canTrash) {
          promptTrash();
        } else {
          callback();
        }
      });
    };

    promptTrash();
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
      player.sendMessage("No Treasures to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a Treasure:");
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

      player.sendMessage("Gain a Treasure:");
      player.sendChoice(gainChoices, function(gainChoice) {
        player.hand.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
      });
    });
  };
}

function ThroneRoom() {
  this.kind = "action";
  this.cost = 4;
  this.play = function(player, callback) {
    var actions = player.hand
      .filter(function(c){return c.kind=="action";})
      .map(function(c){return c.name;});
    if (!actions.length) {
      player.sendMessage("No Actions to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action to double:");
    player.sendChoice(actions, function(action) {
      game.alllog(player.name + " played " + action + " doubled!");
      var action = player.fromHand(action);
      action.play(player, function() {
        action.play(player, function() {
          player.played.push(action);
          callback();
        });
      });
    });
  };
}

function KingsCourt() {
  this.kind = "action";
  this.cost = 7;
  this.play = function(player, callback) {
    var actions = player.hand
      .filter(function(c){return c.kind=="action";})
      .map(function(c){return c.name;});
    if (!actions.length) {
      player.sendMessage("No Actions to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action to triple:")
    player.sendChoice(actions, function(action) {
      game.alllog(player.name + " played " + action + " tripled!!");
      var action = player.fromHand(action);
      action.play(player, function() {
        action.play(player, function() {
          action.play(player, function() {
            player.played.push(action);
            callback();
        });
        });
      });
    });
  };
}

var cards = {
  // Core game
  Copper: new Treasure(0, 1),
  Silver: new Treasure(3, 2),
  Gold:   new Treasure(6, 3),

  Estate:  new Property(2, 1),
  Duchy:   new Property(5, 3),
  Province: new Property(8, 6),

  Cellar: new Cellar(),
  Chapel: new Chapel(),
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
  ThroneRoom: new ThroneRoom(),
  Village: new Action(3, function(player) {
    player.draw();
    player.actions += 2;
  }),
  Woodcutter: new Action(3, function(player) {
    player.buys  += 1;
    player.money += 2;
  }),

  // Prosperity
  KingsCourt: new KingsCourt()
};

for(var name in cards) {
  cards[name].name = name;
  cards[name].toString = function() { return this.name; };
}

return cards;
})();

