class Treasure {
  constructor(cost, money) {
    this.kind = "treasure";
    this.cost = cost;
    this.money = money;
  }

  play(player, callback) {
    player.money += this.money;
    callback();
  }
}

class Property {
  constructor(cost, points) {
    this.kind = "property";
    this.cost = cost;
    this.points = points;
  }

  getPoints(player) {
    return this.points;
  }
}

class Curse {
  constructor() {
    this.kind = "curse";
    this.cost = 0;
  }

  getPoints(player) {
    return -1;
  }
}

/**
 * For simple cards, with synchronous play methods
 */
class Action {
  constructor(cost, toPlay) {
    this.kind = "action";
    this.cost = cost;
    this.toPlay = toPlay;
  }

  play(player, callback, game) {
    this.toPlay(player, game);
    callback();
  }
}

const Adventurer = new Action(6, (player, game) => {
  let treasures = 0;
  const drawn = [];
  while (treasures < 2) {
    const card = player.fromDraw();
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
  Array.prototype.push.apply(player.discardPile, drawn); // TODO just discardPile.push
});

class Bureaucrat {
  constructor() {
    this.kind = ["action", "attack"];
    this.cost = 4;
  }

  play(player, callback, game) {
    if (game.store.counts["Silver"]) {
      player.discardPile.push(cards.Silver);
      game.store.bought(cards.Silver);
    }
    game.parallelAttack(player, (p, attackDone) => {
      const discardChoices = p.hand
        .filter(c => c.ofKind("property"))
        .map(c => c.name);
      if (discardChoices.length) {
        p.sendMessage("Put a Victory card onto your deck:");
        p.sendChoice(discardChoices, choice => {
          p.drawPile.push(p.fromHand(choice));
          attackDone();
        });
      }
      else {
        attackDone();
      }
    }, callback);
  }
}

class Cellar {
  constructor() {
    this.kind = "action";
    this.cost = 2;
  }

  play(player, callback, game) {
    player.actions += 1;
    let discarded = 0;
    const end = () => {
      player.draw(discarded);
      callback();
    };
    const promptDiscard = () => {
      const choices = player.hand.map(c => c.name);
      if (!choices.length) {
        end();
        return;
      }
      choices.push("Done Discarding");
      player.sendMessage("Discard cards:");
      player.sendChoice(choices, choice => {
        if (choice == "Done Discarding") {
          end();
          return;
        }
        const discard = player.fromHand(choice);
        ++discarded;
        player.discardPile.push(discard);
        promptDiscard();
      });
    };
    promptDiscard();
  }
}

class Chancellor {
  constructor() {
    this.kind = "action";
    this.cost = 3;
  }

  play(player, callback, game) {
    player.money += 2;
    player.sendMessage("Discard your draw pile?");
    player.sendChoice(["No", "Discard"], choice => {
      if (choice == "Discard") {
        Array.prototype.push.apply(player.discardPile, player.drawPile.splice(0));
      }
      callback();
    });
  }
}

class Chapel {
  constructor() {
    this.kind = "action";
    this.cost = 2;
  }

  play(player, callback, game) {
    let canTrash = 4;
    const promptTrash = () => {
      const trashChoices = player.hand.map(c => c.name);
      if (!trashChoices.length) {
        callback();
        return;
      }
      trashChoices.push("Done Trashing");
      player.sendMessage("Trash up to " + canTrash + " cards:");
      player.sendChoice(trashChoices, choice => {
        if (choice == "Done Trashing") {
          callback();
          return;
        }
        const trash = player.fromHand(choice);
        game.trash.push(trash);
        --canTrash;
        if (canTrash) {
          promptTrash();
        }
        else {
          callback();
        }
      });
    };
    promptTrash();
  }
}

const CouncilRoom = new Action(5, (player, game) => {
  player.buys += 1;
  player.draw(4);
  game.otherPlayers(player).forEach(p => {
    p.draw();
  });
});

class Feast {
  constructor() {
    this.kind = "action";
    this.cost = 5;
  }

  play(player, callback, game) {
    const gainChoices = game.store
      .getAvailable(5)
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a card:");
    player.sendChoice(gainChoices, gainChoice => {
      player.discardPile.push(cards[gainChoice]);
      game.store.bought(gainChoice);
      callback();
    });
  }

  afterPlay(game) {
    game.trash.push(this);
  }
}

const Festival = new Action(5, (player, game) => {
  player.actions += 2;
  player.buys += 1;
  player.money += 2;
});

class Gardens {
  constructor() {
    this.kind = "property";
    this.cost = 4;
  }

  getPoints(player) {
    return Math.floor(player.allCards().length / 10);
  }
}

const Laboratory = new Action(5, (player, game) => {
  player.draw(2);
  player.actions += 1;
});

class Library {
  constructor() {
    this.kind = "action";
    this.cost = 5;
  }

  play(player, callback, game) {
    const aside = [];
    const end = () => {
      Array.prototype.push.apply(player.discardPile, aside);
      player.sendHand();
      callback();
    };
    const promptTake = () => {
      if (player.hand.length >= 7) {
        end();
        return;
      }
      const card = player.fromDraw();
      if (!card) {
        end();
        return;
      }
      if (card.ofKind("action")) {
        player.sendMessage("Gain Action card or set aside:");
        player.sendChoice([card.name, "Set Aside"], choice => {
          if (choice == "Set Aside") {
            aside.push(card);
          }
          else {
            player.hand.push(card);
          }
          promptTake();
        });
      }
      else {
        player.hand.push(card);
        promptTake();
      }
    };
    promptTake();
  }
}

const Market = new Action(5, (player, game) => {
  player.draw();
  player.actions += 1;
  player.buys += 1;
  player.money += 1;
});

class Militia {
  constructor() {
    this.kind = ["action", "attack"];
    this.cost = 5;
  }

  play(player, callback, game) {
    player.money += 2;
    const attack = (p, attackDone) => {
      if (p.hand.length > 3) {
        const discardChoices = p.hand.map(c => c.name);
        p.sendMessage("Discard down to three cards:");
        p.sendChoice(discardChoices, choice => {
          p.discardPile.push(p.fromHand(choice));
          attack(p, attackDone);
        });
      }
      else {
        attackDone();
      }
    };
    game.parallelAttack(player, attack, callback);
  }
}

class Mine {
  constructor() {
    this.kind = "action";
    this.cost = 5;
  }

  play(player, callback, game) {
    const trashChoices = player.hand
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Treasures to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a Treasure:");
    player.sendChoice(trashChoices, trashChoice => {
      const trash = player.fromHand(trashChoice);
      game.trash.push(trash);
      const gainChoices = game.store
        .getAvailable(trash.cost + 3)
        .filter(c => c.ofKind("treasure"))
        .map(c => c.name);
      if (!gainChoices.length) {
        callback();
        return;
      }
      player.sendMessage("Gain a Treasure:");
      player.sendChoice(gainChoices, gainChoice => {
        player.hand.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
      });
    });
  }
}

class Moat {
  constructor() {
    this.kind = ["action", "reaction"];
    this.cost = 2;
  }

  play(player, callback, game) {
    player.draw(2);
    callback();
  }
}

const Moneylender = new Action(4, (player, game) => {
  const copper = player.fromHand("Copper");
  if (copper) {
    player.money += 3;
    game.trash.push(copper);
  }
});

class Remodel {
  constructor() {
    this.kind = "action";
    this.cost = 4;
  }

  play(player, callback, game) {
    const trashChoices = player.hand
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Cards to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a card:");
    player.sendChoice(trashChoices, trashChoice => {
      const trash = player.fromHand(trashChoice);
      game.trash.push(trash);
      const gainChoices = game.store
        .getAvailable(trash.cost + 2)
        .map(c => c.name);
      if (!gainChoices.length) {
        callback();
        return;
      }
      player.sendMessage("Gain a card:");
      player.sendChoice(gainChoices, gainChoice => {
        player.discardPile.push(cards[gainChoice]);
        game.store.bought(gainChoice);
        callback();
      });
    });
  }
}

const Smithy = new Action(4, (player, game) => {
  player.draw(3);
});

class Spy {
  constructor() {
    this.kind = ["action", "attack"];
    this.cost = 4;
  }

  play(player, callback, game) {
    player.actions += 1;
    player.draw();
    const attack = (p, attackDone) => {
      const card = p.fromDraw();
      if (!card) {
        attackDone();
        return;
      }
      const name = p.name == player.name ? "Your" : (p.name + "'s");
      player.sendMessage("Put back on deck or discard " + name + " " + card.name);
      player.sendChoice(["Put back", "Discard"], choice => {
        if (choice == "Put back") {
          p.drawPile.push(card);
        }
        else {
          p.discardPile.push(card);
        }
        attackDone();
      });
    };
    game.sequentialAttack(player, attack, () => {
      attack(player, callback);
    });
  }
}

class Thief {
  constructor() {
    this.kind = ["action", "attack"];
    this.cost = 4;
  }

  play(player, callback, game) {
    game.sequentialAttack(player, (p, attackDone) => {
      const drawn = [];
      let card = p.fromDraw();
      if (card)
        drawn.push(card);
      card = p.fromDraw();
      if (card)
        drawn.push(card);
      let treasures = drawn
        .filter(c => c.ofKind("treasure"))
        .map(c => c.name);
      if (!treasures.length) {
        Array.prototype.push.apply(p.discardPile, drawn);
        attackDone();
        return;
      }
      const choices = [];
      for (let i = 0; i < treasures.length; ++i) {
        const name = treasures[i];
        Array.prototype.push.apply(choices, ["Trash: " + name, "Steal: " + name]);
      }
      player.sendMessage("Trash or steal a Treasure:");
      player.sendChoice(choices, choice => {
        const steal = choice.substring(0, 7) == "Steal: ";
        choice = choice.substring(7);
        let chosen;
        if (choice == treasures[0]) {
          chosen = treasures.splice(0, 1)[0];
        }
        else {
          chosen = treasures.splice(1, 1)[0];
        }
        chosen = cards[chosen];
        if (steal) {
          player.discardPile.push(chosen);
        }
        else {
          game.trash.push(chosen);
        }
        treasures = treasures.map(n => cards[n]);
        Array.prototype.push.apply(p.discardPile, treasures);
        const notTreasures = drawn.filter(c => !c.ofKind("treasure"));
        Array.prototype.push.apply(p.discardPile, notTreasures);
        attackDone();
      });
    }, callback);
  }
}

class ThroneRoom {
  constructor() {
    this.kind = "action";
    this.cost = 4;
  }

  play(player, callback, game) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action card to double:");
    player.sendChoice(actions, actionName => {
      game.allLog(player.name + " played " + actionName + " doubled!");
      const action = player.fromHand(actionName);
      action.play(player, () => {
        action.play(player, () => {
          player.afterPlay(action);
          callback();
        }, game);
      }, game);
    });
  }
}

const Village = new Action(3, (player, game) => {
  player.draw();
  player.actions += 2;
});

class Witch {
  constructor() {
    this.kind = ["action", "attack"];
    this.cost = 5;
  }

  play(player, callback, game) {
    player.draw(2);
    game.parallelAttack(player, (p, attackDone) => {
      if (game.store.counts["Curse"]) {
        p.discardPile.push(cards.Curse);
        game.store.bought(cards.Curse);
      }
      attackDone();
    }, callback);
  }
}

const Woodcutter = new Action(3, (player, game) => {
  player.buys += 1;
  player.money += 2;
});

class Workshop {
  constructor() {
    this.kind = "action";
    this.cost = 3;
  }

  play(player, callback, game) {
    const gainChoices = game.store
      .getAvailable(4)
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a card:");
    player.sendChoice(gainChoices, gainChoice => {
      player.discardPile.push(cards[gainChoice]);
      game.store.bought(gainChoice);
      callback();
    });
  }
}

class KingsCourt {
  constructor() {
    this.kind = "action";
    this.cost = 7;
  }

  play(player, callback, game) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action card to triple:");
    player.sendChoice(actions, actionName => {
      game.allLog(player.name + " played " + actionName + " tripled!!");
      const action = player.fromHand(actionName);
      action.play(player, () => {
        action.play(player, () => {
          action.play(player, () => {
            player.afterPlay(action);
            callback();
          }, game);
        }, game);
      }, game);
    });
  }
}

const cards = {
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
  Platinum:     new Treasure(9, 5),
};

const toString = function() {return this.name;};

for(const name in cards) {
  const card = cards[name];

  card.name = name;
  card.toString = toString;

  if (card.kind) {
    let kind = card.kind;
    if (typeof kind == "string") {
      kind = [kind];
    }
    if (Array.isArray(kind)) {
      card.ofKind = other => kind.includes(other);
    } else {
      console.error("Card " + name + " kind type not defined");
    }
    delete card.kind;
  } else {
    console.error("Card " + name + " kind not defined");
  }

  if (typeof card.cost == "undefined") {
    console.error("Card " + name + " cost not defined");
  }
}

module.exports = cards;
