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
  while (treasures < 2) {
    var card = player.fromDraw();
    if (!card)
      break;
    if (card.ofKind("treasure")) {
      player.hand.push(card);
      ++treasures;
    } else {
      drawn.push(card);
    }
  }

  player.sendHand();
  Array.prototype.push.apply(player.discardPile, drawn);
});

function Bureaucrat() {
  this.kind = ["action", "attack"];
  this.cost = 4;
  this.play = function(player, callback) {
    if (game.store.counts["Silver"]) {
      player.discardPile.push(cards.Silver);
      game.store.bought(cards.Silver);
    }

    game.parallelAttack(player, function(p, attackDone) {
      var discardChoices = p.hand
        .filter(function(c){return c.ofKind("property");})
        .map(function(c){return c.name;});

     if(discardChoices.length) {
        p.sendMessage("Put a Victory card onto your deck:");
        p.sendChoice(discardChoices, function(choice) {
          p.drawPile.push(p.fromHand(choice));
          attackDone();
        })
      } else {
        attackDone();
      }
    }, callback);
  };
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

function Chancellor() {
  this.kind = "action";
  this.cost = 3;
  this.play = function(player, callback) {
    player.money += 2;

    player.sendMessage("Discard your draw pile?");
    player.sendChoice(["No", "Discard"], function(choice) {
      if (choice == "Discard") {
        Array.prototype.push.apply(player.discardPile, player.drawPile.splice(0));
      }
      callback();
    });
  };
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

function Feast() {
  this.kind = "action";
  this.cost = 5;
  this.play = function(player, callback) {
    var gainChoices = game.store
        .getAvailable(5)
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
  this.afterPlay = function(player) {
    game.trash.push(this);
  };
}

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

function Library() {
  this.kind = "action";
  this.cost = 5;
  this.play = function(player, callback) {
    var aside = [];

    var end = function() {
      Array.prototype.push.apply(player.discardPile, aside);
      player.sendHand();
      callback();
    };

    var promptTake = function() {
      if (player.hand.length >= 7) {
        end();
        return;
      }

      var card = player.fromDraw();

      if (!card) {
        end();
        return;
      }

      if (card.ofKind("action")) {
        player.sendMessage("Gain Action or set aside:");
        player.sendChoice([card.name, "Set Aside"], function (choice) {
          if(choice == "Set Aside") {
            aside.push(card);
          } else {
            player.hand.push(card);
          }
          promptTake();
        });
      } else {
        player.hand.push(card);
        promptTake();
      }
    };

    promptTake();
  };
}

var Market = new Action(5, function(player) {
  player.draw();
  player.actions += 1;
  player.buys += 1;
  player.money += 1;
});

function Militia() {
  this.kind = ["action", "attack"];
  this.cost = 5;
  this.play = function(player, callback) {
    player.money += 2;

    var attack = function(p, attackDone) {
      if(p.hand.length > 3) {
        var discardChoices = p.hand.map(function(c){return c.name;});
        p.sendMessage("Discard down to three cards:");
        p.sendChoice(discardChoices, function(choice) {
          p.discardPile.push(p.fromHand(choice));
          attack(p, attackDone);
        })
      } else {
        attackDone();
      }
    };

    game.parallelAttack(player, attack, callback);
  };
}

function Mine() {
  this.kind = "action";
  this.cost = 5;
  this.play = function(player, callback) {
    var trashChoices = player.hand
      .filter(function(c){return c.ofKind("treasure");})
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
        .filter(function(c){return c.ofKind("treasure");})
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

function Moat() {
  this.kind = ["action", "reaction"];
  this.cost = 2;
  this.play = function(player, callback) {
    player.draw(2);
    callback();
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

function Spy() {
  this.kind = ["action", "attack"];
  this.cost = 4;
  this.play = function(player, callback) {
    player.actions += 1;
    player.draw();

    var attack = function(p, attackDone) {
      var card = p.fromDraw();
      if(!card) {
        attackDone();
        return;
      }
      var name = p.name == player.name ? "Your" : (p.name + "'s");
      player.sendMessage("Put back on deck or discard " + name + " " + card.name);
      player.sendChoice(["Put back", "Discard"], function(choice) {
        if(choice == "Put back") {
          p.drawPile.push(card);
        } else {
          p.discardPile.push(card);
        }
        attackDone();
      });
    };
    game.sequentialAttack(player, attack, function() {
      attack(player, callback);
    });
  }
}

function Thief() {
  this.kind = ["action", "attack"];
  this.cost = 4;
  this.play = function(player, callback) {
    game.sequentialAttack(player, function(p, attackDone) {
      var drawn = [];

      var card = p.fromDraw();
      if (card) drawn.push(card);
      card = p.fromDraw();
      if (card) drawn.push(card);

      var treasures = drawn
        .filter(function(c){return c.ofKind("treasure");})
        .map(function(c){return c.name;});

      if (!treasures.length) {
        Array.prototype.push.apply(p.discardPile, drawn);
        attackDone();
        return;
      }

      var choices = [];
      for(var i = 0; i < treasures.length; ++i ) {
        var name = treasures[i];
        Array.prototype.push.apply(choices, ["Trash: "+name, "Steal: "+name]);
      }

      player.sendMessage("Trash or steal a Treasure:");
      player.sendChoice(choices, function(choice) {
        var steal = choice.substring(0, 7) == "Steal: ";
        choice = choice.substring(7);

        var chosen;
        if (choice == treasures[0]) {
          chosen = treasures.splice(0, 1)[0];
        } else {
          chosen = treasures.splice(1, 1)[0];
        }

        chosen = cards[chosen];

        if (steal) {
          player.discardPile.push(chosen);
        } else {
          game.trash.push(chosen);
        }

        treasures = treasures.map(function(n){ return cards[n]; });

        Array.prototype.push.apply(p.discardPile, treasures);
        var notTreasures = drawn.filter(function(c){return !c.ofKind("treasure");});
        Array.prototype.push.apply(p.discardPile, notTreasures);

        attackDone();
      });
    }, callback);
  };
}

function ThroneRoom() {
  this.kind = "action";
  this.cost = 4;
  this.play = function(player, callback) {
    var actions = player.hand
      .filter(function(c){return c.ofKind("action");})
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
          player.afterPlay(action);
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
  this.kind = ["action", "attack"];
  this.cost = 5;
  this.play = function(player, callback) {
    player.draw(2);
    game.parallelAttack(player, function(p, attackDone) {
      if (game.store.counts["Curse"]) {
        p.discardPile.push(cards.Curse);
        game.store.bought(cards.Curse);
      }
      attackDone();
    }, callback);
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
      .filter(function(c){return c.ofKind("action");})
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
            player.afterPlay(action);
            callback();
        });
        });
      });
    });
  };
}

var cards = {
  // Core game
  Copper:      new Treasure(0, 1),
  Silver:      new Treasure(3, 2),
  Gold:        new Treasure(6, 3),

  Estate:      new Property(2, 1),
  Duchy:       new Property(5, 3),
  Province:    new Property(8, 6),
  Curse:       new Curse(),

  Adventurer:  Adventurer,
  Bureaucrat:  new Bureaucrat(),
  Cellar:      new Cellar(),
  Chancellor:  new Chancellor(),
  Chapel:      new Chapel(),
  CouncilRoom: CouncilRoom,
  Feast:       new Feast(),
  Festival:    Festival,
  Gardens:     new Gardens(),
  Laboratory:  Laboratory,
  Library:     new Library(),
  Market:      Market,
  Mine:        new Mine(),
  Militia:     new Militia(),
  Moat:        new Moat(),
  Moneylender: Moneylender,
  Remodel:     new Remodel(),
  Smithy:      Smithy,
  Spy:         new Spy(),
  Thief:       new Thief(),
  ThroneRoom:  new ThroneRoom(),
  Village:     Village,
  Witch:       new Witch(),
  Woodcutter:  Woodcutter,
  Workshop:    new Workshop(),

  // Prosperity
  KingsCourt:   new KingsCourt(),
  Platinum:     new Treasure(9, 5)
};

var toString = function() { return this.name; };

for(var name in cards) {
  var c = cards[name];

  c.name = name;
  c.toString = toString;

  if (c.kind) {
    if (typeof c.kind == "string") {
      c.ofKind = (function(k) {
        return function(other) { return other == k; };
      })(c.kind);
    } else if (Array.isArray(c.kind)) {
      c.ofKind = (function(ks) {
        return function(other) { return ks.indexOf(other) != -1; };
      })(c.kind);
    } else {
      console.error("Card " + name + " kind type not defined");
    }
    delete c.kind;
  } else  {
    console.error("Card " + name + " kind not defined");
  }

  if (typeof c.cost == "undefined") {
    console.error("Card " + name + " cost not defined");
  }
}

return cards;
})();

