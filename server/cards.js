/**
 * @typedef { import("./game").Game } Game
 * @typedef { import("./player").Player } Player
 */

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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    this.toPlay(player, game);
    callback();
  }
}

const Adventurer = new Action(6, (player, game) => {
  let treasures = 0;
  const drawn = [];
  while (treasures < 2) {
    const card = player.fromDraw();
    if (!card) {
      break;
    }
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    game.tryGainCard(player, "Silver");
    game.parallelAttack(player, async (p, attackDone) => {
      const discardChoices = p.hand
        .filter(c => c.ofKind("property"))
        .map(c => c.name);
      if (discardChoices.length) {
        p.sendMessage("Put a Victory card onto your deck:");
        const choice = await p.choose(discardChoices);
        p.drawPile.push(p.fromHand(choice));
        attackDone();
      } else {
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.actions += 1;
    let discarded = 0;

    for (;;) {
      const choices = player.hand.map(c => c.name);
      if (!choices.length) {
        break;
      }

      choices.push("Done Discarding");
      player.sendMessage("Discard cards:");
      const choice = await player.choose(choices);
      if (choice == "Done Discarding") {
        break;
      }

      const discard = player.fromHand(choice);
      ++discarded;
      player.discardPile.push(discard);
    }

    player.draw(discarded);
    callback();
  }
}

class Chancellor {
  constructor() {
    this.kind = "action";
    this.cost = 3;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.money += 2;
    player.sendMessage("Discard your draw pile?");
    const choice = await player.choose(["No", "Discard"]);
    if (choice == "Discard") {
      Array.prototype.push.apply(player.discardPile, player.drawPile.splice(0));
    }
    callback();
  }
}

class Chapel {
  constructor() {
    this.kind = "action";
    this.cost = 2;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    for (let canTrash = 4; canTrash; --canTrash) {
      const trashChoices = player.hand.map(c => c.name);
      if (!trashChoices.length) {
        callback();
        return;
      }
      trashChoices.push("Done Trashing");
      player.sendMessage(`Trash up to ${canTrash} cards:`);
      const choice = await player.choose(trashChoices);
      if (choice == "Done Trashing") {
        callback();
        return;
      }
      const trash = player.fromHand(choice);
      game.trashPush(player, trash);
    }
    callback();
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
    this.cost = 4;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const gainChoices = game.store
      .getAvailable(5)
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    game.gainCard(player, gainChoice);
    callback();
  }

  afterPlay(player, game) {
    game.trashPush(player, this);
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const aside = [];
    while (player.hand.length < 7) {
      const card = player.fromDraw();
      if (!card) {
        break;
      }
      if (card.ofKind("action")) {
        player.sendMessage("Add card to hand or set aside:");
        const choice = await player.choose([card.name, "Set Aside"]);
        if (choice === "Set Aside") {
          aside.push(card);
          continue;
        }
      }
      player.hand.push(card);
    }
    Array.prototype.push.apply(player.discardPile, aside);
    player.sendHand();
    callback();
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
    this.cost = 4;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.money += 2;
    const attack = (p, attackDone) => {
      if (p.hand.length > 3) {
        const discardChoices = p.hand.map(c => c.name);
        p.sendMessage("Discard down to three cards:");
        p.sendChoice(discardChoices, choice => { // TODO p.choose() in loop skipping attack recursion
          p.discardPile.push(p.fromHand(choice));
          attack(p, attackDone);
        });
      } else {
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const trashChoices = player.hand
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Treasures to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a Treasure:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    game.trashPush(player, trash);
    const gainChoices = game.store
      .getAvailable(trash.cost + 3)
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a Treasure:");
    const gainChoice = await player.choose(gainChoices);
    game.gainCard(player, gainChoice, {toHand: true});
    callback();
  }
}

class Moat {
  constructor() {
    this.kind = ["action", "reaction"];
    this.cost = 2;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.draw(2);
    callback();
  }
}

class Moneylender {
  constructor() {
    this.kind = "action";
    this.cost = 4;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    if (player.hand.some(c => c.name === "Copper")) {
      const choice = await player.choose(["Trash a Copper", "Do Nothing"]);
      if (choice === "Trash a Copper") {
        player.money += 3;
        game.trashPush(player, player.fromHand("Copper"));
      }
      callback();
    } else {
      callback();
    }
  }
}

class Remodel {
  constructor() {
    this.kind = "action";
    this.cost = 4;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const trashChoices = player.hand
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Cards to trash");
      callback();
      return;
    }
    player.sendMessage("Trash a card:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    game.trashPush(player, trash);
    const gainChoices = game.store
      .getAvailable(trash.cost + 2)
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    game.gainCard(player, gainChoice);
    callback();
  }
}

class Sentry {
  constructor() {
    this.kind = "action";
    this.cost = 5;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.draw();
    player.actions += 1;

    const toDecide = [];
    for (let i = 0; i < 2; ++i) {
      const draw = player.fromDraw();
      if (!draw) {
        break;
      }
      toDecide.push(draw.name);
    }

    while (toDecide.length) {
      const choices = toDecide.flatMap(c => ["Trash", "Discard", "To Deck"].map(choice => `${choice}: ${c}`));
      player.sendMessage("Trash, discard, and/or place on top of deck:");
      const choice = await player.choose(choices);
      const [action, cardName] = choice.split(": ");
      const card = cards[cardName];

      toDecide.splice(toDecide.indexOf(cardName), 1);
      switch (action) {
      case "Trash":
        game.trashPush(player, card);
        break;
      case "Discard":
        player.discardPile.push(card);
        break;
      case "To Deck":
        player.drawPile.push(card);
      }
    }

    callback();
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
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
        } else {
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    game.sequentialAttack(player, (p, attackDone) => {
      const drawn = [];
      let card = p.fromDraw();
      if (card) {
        drawn.push(card);
      }
      card = p.fromDraw();
      if (card) {
        drawn.push(card);
      }
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
        } else {
          chosen = treasures.splice(1, 1)[0];
        }
        chosen = cards[chosen];
        if (steal) {
          player.discardPile.push(chosen);
        } else {
          game.trashPush(player, chosen);
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action card to double:");
    const actionName = await player.choose(actions);
    game.allLog(player.name + " played " + actionName + " doubled!");
    const action = player.fromHand(actionName);
    action.play(player, () => {
      action.play(player, () => {
        player.afterPlay(action);
        callback();
      }, game);
    }, game);
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    player.draw(2);
    game.parallelAttack(player, (p, attackDone) => {
      game.tryGainCard(p, "Curse");
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

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const gainChoices = game.store
      .getAvailable(4)
      .map(c => c.name);
    if (!gainChoices.length) {
      callback();
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    game.gainCard(player, gainChoice);
    callback();
  }
}

class KingsCourt {
  constructor() {
    this.kind = "action";
    this.cost = 7;
  }

  /**
   * @param {Player} player
   * @param {function} callback
   * @param {Game} game
   */
  async play(player, callback, game) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      callback();
      return;
    }
    player.sendMessage("Pick an Action card to triple:");
    const actionName = await player.choose(actions);
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
  }
}

const cards = {
  // Core game
  Copper: new Treasure(0, 1),
  Silver: new Treasure(3, 2),
  Gold: new Treasure(6, 3),

  Estate: new Property(2, 1),
  Duchy: new Property(5, 3),
  Province: new Property(8, 6),
  Curse: new Curse(),

  // Base deck
  Adventurer: Adventurer,
  Bureaucrat: new Bureaucrat(),
  Cellar: new Cellar(),
  Chancellor: new Chancellor(),
  Chapel: new Chapel(),
  CouncilRoom: CouncilRoom,
  Feast: new Feast(),
  Festival: Festival,
  Gardens: new Gardens(),
  Laboratory: Laboratory,
  Library: new Library(),
  Market: Market,
  Mine: new Mine(),
  Militia: new Militia(),
  Moat: new Moat(),
  Moneylender: new Moneylender(),
  Remodel: new Remodel(),
  Smithy: Smithy,
  Spy: new Spy(),
  Thief: new Thief(),
  ThroneRoom: new ThroneRoom(),
  Village: Village,
  Witch: new Witch(),
  Woodcutter: Woodcutter,
  Workshop: new Workshop(),

  // Base.2
  Sentry: new Sentry,

  // Prosperity
  Platinum: new Treasure(9, 5),
  Colony: new Property(11, 10),
  KingsCourt: new KingsCourt(),
};

const colorMap = {
  treasure: "darkorange",
  property: "green",
  action: "blue",
  curse: "purple",
};

const kindOrder = {
  treasure: 0,
  property: 1,
  curse: 2,
  action: 3,
};

function compareTo(other) {
  return kindOrder[this.kind[0]] - kindOrder[other.kind[0]]
    || this.cost - other.cost
    || this.name.localeCompare(other.name);
}

for (const name in cards) {
  const card = cards[name];

  card.name = name;
  card.compareTo = compareTo;

  if (card.kind) {
    if (typeof card.kind === "string") {
      card.kind = [card.kind];
    }
    if (Array.isArray(card.kind)) {
      card.ofKind = other => card.kind.includes(other);
    } else {
      throw new Error("Card " + name + " kind type not defined");
    }
    card.color = colorMap[card.kind[0]];
  } else {
    throw new Error("Card " + name + " kind not defined");
  }

  if (typeof card.cost === "undefined") {
    throw new Error("Card " + name + " cost not defined");
  }
}

module.exports = cards;
