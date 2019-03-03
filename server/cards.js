/**
 * @typedef { import("./game").Game } Game
 * @typedef { import("./player").Player } Player
 */

const csvParse = /** @type {function(string|Buffer, object): Array} */
  (require("csv-parse/lib/sync"));
const fs = require("fs");
const path = require("path");

if (!Array.prototype.flatMap) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.flatMap = function(selector) {
    return [].concat(...this.map(selector));
  };
}

class Treasure {
  constructor(money) {
    this.money = money;
  }

  /**
   * @param {Player} player
   */
  async play(player) {
    player.money += this.money;
  }
}

class Victory {
  constructor(points) {
    this.points = points;
  }

  getPoints(player) {
    return this.points;
  }
}

class Curse {
  getPoints(player) {
    return -1;
  }
}

const Adventurer = async player => {
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
  player.discardPile.push(...drawn);
};

class Bureaucrat {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.game.tryGainCard(player, "Silver");

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      const discardChoices = other.hand
        .filter(c => c.ofKind("victory"))
        .map(c => c.name);
      if (discardChoices.length) {
        other.sendMessage("Put a Victory card onto your deck:");
        const choice = await other.choose(discardChoices);
        other.drawPile.push(other.fromHand(choice));
      }
    });
  }
}

class Cellar {
  /**
   * @param {Player} player
   */
  async play(player) {
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
  }
}

class Chancellor {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.money += 2;
    player.sendMessage("Discard your draw pile?");
    const choice = await player.choose(["No", "Discard"]);
    if (choice == "Discard") {
      player.discardPile.push(...player.drawPile.splice(0));
    }
  }
}

class Chapel {
  /**
   * @param {Player} player
   */
  async play(player) {
    for (let canTrash = 4; canTrash; --canTrash) {
      const trashChoices = player.hand.map(c => c.name);
      if (!trashChoices.length) {
        return;
      }
      trashChoices.push("Done Trashing");
      player.sendMessage(`Trash up to ${canTrash} cards:`);
      const choice = await player.choose(trashChoices);
      if (choice == "Done Trashing") {
        return;
      }
      const trash = player.fromHand(choice);
      player.game.trashPush(player, trash);
    }
  }
}

const CouncilRoom = async player => {
  player.buys += 1;
  player.draw(4);
  player.game.otherPlayers(player).forEach(p => {
    p.draw();
  });
};

class Feast {
  /**
   * @param {Player} player
   */
  async play(player) {
    const gainChoices = player.game.store
      .getAvailable(5)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  }

  afterPlay(player) {
    player.game.trashPush(player, this);
  }
}

const Festival = /** @param {Player} player */ async player => {
  player.actions += 2;
  player.buys += 1;
  player.money += 2;
};

class Gardens {
  getPoints(player) {
    return Math.floor(player.allCards().length / 10);
  }
}

class Harbinger {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.draw();
    player.actions += 1;

    player.sendMessage("Choose a card from your discard to put on your deck:");
    const choices = [...player.discardPile.map(c => c.name), "None of these"];
    const choice = await player.choose([...new Set(choices)]);
    if (choice === "None of these") {
      return;
    }
    const picked = player.discardPile.splice(choices.indexOf(choice), 1)[0];
    player.drawPile.push(picked);
  }
}

const Laboratory = async player => {
  player.draw(2);
  player.actions += 1;
};

class Library {
  /**
   * @param {Player} player
   */
  async play(player) {
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
    player.discardPile.push(...aside);
    player.sendHand();
  }
}

const Market = async player => {
  player.draw();
  player.actions += 1;
  player.buys += 1;
  player.money += 1;
};

class Militia {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.money += 2;

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      while (other.hand.length > 3) {
        const discardChoices = other.hand.map(c => c.name);
        other.sendMessage("Discard down to three cards:");
        const choice = await other.choose(discardChoices);
        other.discardPile.push(other.fromHand(choice));
      }
    });
  }
}

class Mine {
  /**
   * @param {Player} player
   */
  async play(player) {
    const trashChoices = player.hand
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Treasures to trash");
      return;
    }
    player.sendMessage("Trash a Treasure:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    player.game.trashPush(player, trash);
    const gainChoices = player.game.store
      .getAvailable(trash.cost + 3)
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a Treasure:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice, {toHand: true});
  }
}

class Moat {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.draw(2);
  }
}

class Moneylender {
  /**
   * @param {Player} player
   */
  async play(player) {
    if (player.hand.some(c => c.name === "Copper")) {
      const choice = await player.choose(["Trash a Copper", "Do Nothing"]);
      if (choice === "Trash a Copper") {
        player.money += 3;
        player.game.trashPush(player, player.fromHand("Copper"));
      }
    }
  }
}

class Remodel {
  /**
   * @param {Player} player
   */
  async play(player) {
    const trashChoices = player.hand
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No Cards to trash");
      return;
    }
    player.sendMessage("Trash a card:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    player.game.trashPush(player, trash);
    const gainChoices = player.game.store
      .getAvailable(trash.cost + 2)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  }
}

class Sentry {
  /**
   * @param {Player} player
   */
  async play(player) {
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
        player.game.trashPush(player, card);
        break;
      case "Discard":
        player.discardPile.push(card);
        break;
      case "To Deck":
        player.drawPile.push(card);
      }
    }
  }
}

const Smithy = async player => {
  player.draw(3);
};

class Spy {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.actions += 1;
    player.draw();

    const attack = /** @param {Player} other */ async other => {
      const card = other.fromDraw();
      if (!card) {
        return;
      }
      const name = other.name == player.name ? "Your" : (other.name + "'s");
      player.sendMessage("Put back on deck or discard " + name + " " + card.name);
      const choice = await player.choose(["Put back", "Discard"]);
      if (choice == "Put back") {
        other.drawPile.push(card);
      } else {
        other.discardPile.push(card);
      }
    };

    await player.game.sequentialAttack(player, attack);
    await attack(player);
  }
}

class Thief {
  /**
   * @param {Player} player
   */
  async play(player) {
    await player.game.sequentialAttack(player, /** @param {Player} other */ async other => {
      const drawn = [];
      let card = other.fromDraw();
      if (card) {
        drawn.push(card);
      }
      card = other.fromDraw();
      if (card) {
        drawn.push(card);
      }
      const treasures = drawn
        .filter(c => c.ofKind("treasure"))
        .map(c => c.name);
      if (!treasures.length) {
        other.discardPile.push(...drawn);
        return;
      }
      const choices = treasures.flatMap(t => ["Trash: " + t, "Steal: " + t]);
      player.sendMessage("Trash or steal a Treasure:");
      let choice = await player.choose(choices);

      const isSteal = choice.substring(0, 7) == "Steal: ";
      choice = choice.substring(7);
      let chosen;
      if (choice == treasures[0]) {
        chosen = treasures.splice(0, 1)[0];
      } else {
        chosen = treasures.splice(1, 1)[0];
      }
      chosen = cards[chosen];

      if (isSteal) {
        player.discardPile.push(chosen);
      } else {
        player.game.trashPush(player, chosen);
      }
      const treasureCards = treasures.map(n => cards[n]);
      other.discardPile.push(...treasureCards);
      const notTreasures = drawn.filter(c => !c.ofKind("treasure"));
      other.discardPile.push(...notTreasures);
    });
  }
}

class ThroneRoom {
  /**
   * @param {Player} player
   */
  async play(player) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      return;
    }
    player.sendMessage("Pick an Action card to double:");
    const actionName = await player.choose(actions);
    player.game.allLog(player.name + " played " + actionName + " doubled!");
    const action = player.fromHand(actionName);
    await action.play(player);
    await action.play(player);
    player.afterPlay(action);
  }
}

const Village = async player => {
  player.draw();
  player.actions += 2;
};

class Witch {
  /**
   * @param {Player} player
   */
  async play(player) {
    player.draw(2);

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      player.game.tryGainCard(other, "Curse");
    });
  }
}

const Woodcutter = async player => {
  player.buys += 1;
  player.money += 2;
};

class Workshop {
  /**
   * @param {Player} player
   */
  async play(player) {
    const gainChoices = player.game.store
      .getAvailable(4)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  }
}

class KingsCourt {
  /**
   * @param {Player} player
   */
  async play(player) {
    const actions = player.hand
      .filter(c => c.ofKind("action"))
      .map(c => c.name);
    if (!actions.length) {
      player.sendMessage("No Action cards to play");
      return;
    }
    player.sendMessage("Pick an Action card to triple:");
    const actionName = await player.choose(actions);
    player.game.allLog(player.name + " played " + actionName + " tripled!!");
    const action = player.fromHand(actionName);
    await action.play(player);
    await action.play(player);
    await action.play(player);
    player.afterPlay(action);
  }
}

const kingdom = {
  // Core game
  Copper: new Treasure(1),
  Silver: new Treasure(2),
  Gold: new Treasure(3),

  Estate: new Victory(1),
  Duchy: new Victory(3),
  Province: new Victory(6),
  Curse: new Curse(),

  // Base deck
  Adventurer,
  Bureaucrat: new Bureaucrat(),
  Cellar: new Cellar(),
  Chancellor: new Chancellor(),
  Chapel: new Chapel(),
  CouncilRoom,
  Feast: new Feast(),
  Festival,
  Gardens: new Gardens(),
  Harbinger: new Harbinger(),
  Laboratory,
  Library: new Library(),
  Market,
  Mine: new Mine(),
  Militia: new Militia(),
  Moat: new Moat(),
  Moneylender: new Moneylender(),
  Remodel: new Remodel(),
  Smithy,
  Spy: new Spy(),
  Thief: new Thief(),
  ThroneRoom: new ThroneRoom(),
  Village,
  Witch: new Witch(),
  Woodcutter,
  Workshop: new Workshop(),

  // Base.2
  Sentry: new Sentry,

  // Prosperity
  Platinum: new Treasure(5),
  Colony: new Victory(10),
  KingsCourt: new KingsCourt(),
};

const knownKinds = new Set(["action", "attack", "curse", "reaction", "treasure", "victory"]);

const colorMap = {
  treasure: "darkorange",
  victory: "green",
  action: "blue",
  curse: "purple",
};

const kindOrder = {
  treasure: 0,
  victory: 1,
  curse: 2,
  action: 3,
};

function getTable() {
  const csv = fs.readFileSync(path.join(__dirname, "AusterityWiki.csv"));
  const table = csvParse(csv, {columns: h => h.map(c => c.toLowerCase())});
  return table.reduce((o, row) => {
    const name = row.name.replace(/[ ']/g, "");
    if (o[name]) {
      throw new Error(`${row.name} overlaps with ${o[row.name].name}`);
    }
    o[name] = row;
    return o;
  }, {});
}

const table = getTable();

/**
 * @param {{cost: string, name: string}} tableRow
 * @return {number}
 */
function getCost(tableRow) {
  const match = /^\$(\d+)$/.exec(tableRow.cost);
  if (match) {
    return +match[1];
  }
  throw new Error(`${tableRow.name}: Unknown cost string '${tableRow.cost}'`);
}

/**
 * @param {{types: string, name: string}} tableRow
 * @return {string[]}
 */
function getKinds(tableRow) {
  const kinds = tableRow.types.split(" - ").map(k => k.toLowerCase()).sort();
  if (!kinds.every(k => knownKinds.has(k))) {
    throw new Error(`Unknown kind in ${tableRow.types}`);
  }
  return kinds;
}

/**
 * @this {Card}
 * @param {Card} other
 * @return {number}
 */
function compareTo(other) {
  return kindOrder[this.kind[0]] - kindOrder[other.kind[0]]
    || this.cost - other.cost
    || this.name.localeCompare(other.name);
}

/**
 * @typedef {object} Card
 * @property {string} name
 * @property {number} cost
 * @property {string[]} kind
 * @property {string} color
 *
 * @property {function(Player): Promise<void>} play
 * @property {function(string): boolean} ofKind
 * @property {function(Card): number} compareTo
 * @property {function(Player): number} [getPoints]
 * @property {function(Player): void} [afterPlay]
 */

/**
 * @type {Object.<string, Card>}
 */
const cards = Object.keys(kingdom).reduce((o, name) => {
  const k = kingdom[name];
  const card = typeof k === "function" ? {play: k} : k;

  card.name = name;
  card.compareTo = compareTo;

  const tableRow = table[name];
  if (!tableRow) {
    throw new Error(`Can't find ${name}`);
  }

  card.cost = getCost(tableRow);

  card.kind = getKinds(tableRow);
  card.ofKind = k => card.kind.includes(k);
  card.color = colorMap[card.kind[0]];

  o[name] = card;
  return o;
}, {});

module.exports = cards;
