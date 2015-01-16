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
  this.getPoints = function(player) {
    return points;
  }
}

function Curse() {
  this.kind = "curse";
  this.cost = 0;
  this.getPoints = function(player) {
    return -1;
  }
}

function Action(cost, play) {
  this.kind = "action";
  this.cost = cost;
  this.play = function(player, callback) {
    play(player);
    callback();
  }
}

var Adventurer = new Action(6, function(player) {
  var treasures = 0;
  var drawn = [];
  while (treasures < 2 && player.drawPile.length) {
    var card = player.drawPile.pop();
    if (card.kind == "treasure") {
      player.hand.push(card);
      ++treasures;
    } else {
      drawn.push(card);
    }

    if (!player.drawPile.length)
      player.shuffle();
  }

  player.sendHand();
  Array.prototype.push.apply(player.discardPile, drawn);
});

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

var CouncilRoom = new Action(5, function(player) {
  player.buys += 1;
  player.draw(4);
  game.otherPlayers(player).forEach(function(p) {
    p.draw();
  })
});

var Festival = new Action(5, function(player) {
  player.actions += 2;
  player.buys += 1;
  player.money += 2;
});

function Gardens() {
  this.kind = "property";
  this.cost = 4;
  this.getPoints = function(player) {
    return Math.floor(player.allCards().length / 10);
  }
}

var Laboratory = new Action(5, function(player) {
  player.draw(2);
  player.actions += 1;
});

var Market = new Action(5, function(player) {
  player.draw();
  player.actions += 1;
  player.buys += 1;
  player.money += 1;
});

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

var Moneylender = new Action(4, function(player) {
  var copper = player.fromHand(cards.Copper.name);
  if (copper) {
    player.money += 3;
    game.trash.push(copper);
  }
});

function Remodel() {
  this.kind = "action";
  this.cost = 4;
  this.play = function(player, callback) {
    var trashChoices = player.hand
      .map(function(c){return c.name;});
    if (!trashChoices.length) {
      player.sendMessage("No Cards to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a card:");
    player.sendChoice(trashChoices, function(trashChoice) {
      var trash = player.fromHand(trashChoice);
      game.trash.push(trash);

      var gainChoices = game.store
        .getAvailable(trash.cost+2)
        .map(function(c){return c.name;});
      if (!gainChoices.length) {
        callback();
        return;
      }

      player.sendMessage("Gain a card:");
      player.sendChoice(gainChoices, function(gainChoice) {
        player.discardPile.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
      });
    });
  };
}

var Smithy = new Action(4, function(player) {
  player.draw(3);
});

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

var Village = new Action(3, function(player) {
  player.draw();
  player.actions += 2;
});

function Witch() {
  this.kind = "action"; //TODO attack
  this.cost = 5;
  this.play = function(player, callback) {
    player.draw(2);
    game.otherPlayers(player).forEach(function(p) {
      if (game.store.counts["Curse"]) { //TODO moat?
        p.discardPile.push(cards.Curse);
        game.store.bought(cards.Curse);
      }
    });
    callback();
  };
}

var Woodcutter = new Action(3, function(player) {
  player.buys  += 1;
  player.money += 2;
});

function Workshop() {
  this.kind = "action";
  this.cost = 3;
  this.play = function(player, callback) {
    var gainChoices = game.store
        .getAvailable(4)
        .map(function(c){return c.name;});
      if (!gainChoices.length) {
        callback();
        return;
      }

      player.sendMessage("Gain a card:");
      player.sendChoice(gainChoices, function(gainChoice) {
        player.discardPile.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
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

  Estate:   new Property(2, 1),
  Duchy:    new Property(5, 3),
  Province: new Property(8, 6),
  Curse:    new Curse(),

  Adventurer: Adventurer,
  Cellar: new Cellar(),
  Chapel: new Chapel(),
  CouncilRoom: CouncilRoom,
  Festival: Festival,
  Gardens: new Gardens(),
  Laboratory: Laboratory,
  Market: Market,
  Mine: new Mine(),
  Moneylender: Moneylender,
  Remodel: new Remodel(),
  Smithy: Smithy,
  ThroneRoom: new ThroneRoom(),
  Village: Village,
  Witch: new Witch(),
  Woodcutter: Woodcutter,
  Workshop: new Workshop(),

  //TODO Moat Chancellor Bureaucrat Feast Militia Spy Thief Library

  // Prosperity
  KingsCourt: new KingsCourt(),
  Platinum: new Treasure(9, 5)
};

for(var name in cards) {
  cards[name].name = name;
  cards[name].toString = function() { return this.name; };
}

return cards;
})();

