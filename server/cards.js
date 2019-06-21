/**
 * @typedef { import("./game") } Game
 * @typedef { import("./player") } Player
 */

const cardsTable = require("./cardsTable");

if (!Array.prototype.flatMap) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.flatMap = function(selector) {
    return [].concat(...this.map(selector));
  };
}

function money(provides) {
  return /** @param {Player} player */ async player =>
    player.money += provides;
}

function points(points) {
  return {
    getPoints: /** @param {Player} player */ player => points,
  };
}

/** @param {Player} other */
async function discardToThree(other) {
  const toDiscard = [];
  while (other.hand.length > 3) {
    const discardChoices = other.hand.map(c => c.name);
    other.sendMessage("Discard down to three cards:");
    const choice = await other.choose(discardChoices);
    toDiscard.push(other.fromHand(choice));
  }
  other.discardPush(toDiscard);
}

const kingdom = {
  /* Base Deck */
  Copper: money(1),
  Silver: money(2),
  Gold: money(3),

  Estate: points(1),
  Duchy: points(3),
  Province: points(6),
  Curse: points(-1),

  Adventurer: /** @param {Player} player */ async player => {
    let treasures = 0;
    const drawn = [];
    while (treasures < 2) {
      const card = player.fromDraw({reveal: true});
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
    player.discardPush(drawn);
  },

  Artisan: /** @param {Player} player */ async player => {
    const gainChoices = player.game.store
      .getAvailable(5, player)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card to your hand:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice, {toHand: true});

    player.sendMessage("Put a card from your hand back to your deck:");
    const deckChoice = await player.choose(player.hand.map(c => c.name));
    player.drawPile.push(player.fromHand(deckChoice));
  },

  Bandit: /** @param {Player} player */ async player => {
    player.game.tryGainCard(player, "Gold");

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      const drawn = other.multiFromDraw(2, {reveal: true});
      const goodTreasures = drawn.filter(c => c.ofKind("treasure") && c.name !== "Copper").map(t => t.name);
      if (goodTreasures.length) {
        other.sendMessage("Choose a treasure to trash:");
        const toTrash = await other.choose(goodTreasures);
        const trashed = drawn.splice(drawn.indexOf(cards[toTrash]), 1)[0];
        other.trashPush(trashed);
      }
      other.discardPush(drawn);
    });
  },

  Bureaucrat: /** @param {Player} player */ async player => {
    player.game.tryGainCard(player, "Silver");

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      const discardChoices = other.hand
        .filter(c => c.ofKind("victory"))
        .map(c => c.name);
      if (discardChoices.length) {
        other.sendMessage("Put a Victory card onto your deck:");
        const choice = await other.choose(discardChoices);
        player.game.allLog(`${other.name} revealed ${choice} and put it onto their deck`);
        other.drawPile.push(other.fromHand(choice));
      } else {
        const hand = other.hand.map(c => c.name).join(", ");
        player.game.allLog(`${other.name} revealed ${hand}`);
      }
    });
  },

  Cellar: /** @param {Player} player */ async player => {
    player.actions += 1;
    const toDiscard = [];

    for (;;) {
      const choices = player.hand.map(c => c.name);
      if (!choices.length) {
        break;
      }

      choices.push("Done Discarding");
      player.sendMessage("Discard cards:");
      const choice = await player.choose(choices);
      if (choice === "Done Discarding") {
        break;
      }

      toDiscard.push(player.fromHand(choice));
    }

    player.discardPush(toDiscard);
    player.draw(toDiscard.length);
  },

  Chancellor: /** @param {Player} player */ async player => {
    player.money += 2;
    player.sendMessage("Discard your draw pile?");
    const choice = await player.choose(["No", "Discard"]);
    if (choice === "Discard") {
      player.discardPush(player.drawPile.splice(0));
    }
  },

  Chapel: /** @param {Player} player */ async player => {
    for (let canTrash = 4; canTrash; --canTrash) {
      const trashChoices = player.hand.map(c => c.name);
      if (!trashChoices.length) {
        return;
      }
      trashChoices.push("Done Trashing");
      player.sendMessage(`Trash up to ${canTrash} cards:`);
      const choice = await player.choose(trashChoices);
      if (choice === "Done Trashing") {
        return;
      }
      const trash = player.fromHand(choice);
      player.trashPush(trash);
    }
  },

  CouncilRoom: /** @param {Player} player */ async player => {
    player.buys += 1;
    player.draw(4);
    player.game.otherPlayers(player).forEach(p => {
      p.draw();
    });
  },

  Feast: {
    /**
     * @param {Player} player
     */
    async play(player) {
      const gainChoices = player.game.store
        .getAvailable(5, player)
        .map(c => c.name);
      if (!gainChoices.length) {
        return;
      }
      player.sendMessage("Gain a card:");
      const gainChoice = await player.choose(gainChoices);
      player.game.gainCard(player, gainChoice);
    },

    /**
     * @param {Player} player
     */
    afterPlay(player) {
      player.trashPush(cards.Feast);
    },
  },

  Festival: /** @param {Player} player */ async player => {
    player.actions += 2;
    player.buys += 1;
    player.money += 2;
  },

  Gardens: {
    getPoints(player) {
      return Math.floor(player.allCards().length / 10);
    },
  },

  Harbinger: /** @param {Player} player */ async player => {
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
  },

  Laboratory: /** @param {Player} player */ async player => {
    player.draw(2);
    player.actions += 1;
  },

  Library: /** @param {Player} player */ async player => {
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
    player.discardPush(aside);
    player.sendHand();
  },

  Market: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 1;
    player.buys += 1;
    player.money += 1;
  },

  Merchant: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 1;
    let used = false;
    player.onPlayed.push(/** @param {Card} card */ card => {
      if (used || card !== cards.Silver) {
        return;
      }
      used = true;
      player.money += 1;
    });
  },

  Militia: /** @param {Player} player */ async player => {
    player.money += 2;
    await player.game.parallelAttack(player, discardToThree);
  },

  Mine: /** @param {Player} player */ async player => {
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
    player.trashPush(trash);
    const gainChoices = player.game.store
      .getAvailable(trash.getCost(player) + 3, player)
      .filter(c => c.ofKind("treasure"))
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a Treasure:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice, {toHand: true});
  },

  Moat: /** @param {Player} player */ async player => {
    player.draw(2);
  },

  Moneylender: /** @param {Player} player */ async player => {
    if (player.hand.some(c => c.name === "Copper")) {
      const choice = await player.choose(["Trash a Copper", "Do Nothing"]);
      if (choice === "Trash a Copper") {
        player.money += 3;
        player.trashPush(player.fromHand("Copper"));
      }
    }
  },

  Poacher: /** @param {Player} player */ async player => {
    player.money += 1;
    player.actions += 1;
    player.draw();

    const emptyCount = Object.values(player.game.store.counts).filter(n => !n).length;
    const toDiscard = [];
    for (let i = emptyCount; i > 0; --i) {
      player.sendMessage(`Discard ${i}:`);
      const choice = await player.choose(player.hand.map(c => c.name));
      toDiscard.push(player.fromHand(choice));
    }
    player.discardPush(toDiscard);
  },

  Remodel: /** @param {Player} player */ async player => {
    if (!player.hand.length) {
      player.sendMessage("No Cards to trash");
      return;
    }
    const trashChoices = player.hand.map(c => c.name);
    player.sendMessage("Trash a card:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    player.trashPush(trash);
    const gainChoices = player.game.store
      .getAvailable(trash.getCost(player) + 2, player)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  },

  Sentry: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 1;

    const toDecide = player.multiFromDraw(2).map(c => c.name);
    const toDiscard = [];
    while (toDecide.length) {
      const choices = toDecide.flatMap(c => ["Trash", "Discard", "To Deck"].map(choice => `${choice}: ${c}`));
      player.sendMessage("Trash, discard, and/or place on top of deck:");
      const choice = await player.choose(choices);
      const [action, cardName] = choice.split(": ");
      const card = cards[cardName];

      toDecide.splice(toDecide.indexOf(cardName), 1);
      switch (action) {
      case "Trash":
        player.trashPush(card);
        break;
      case "Discard":
        toDiscard.push(card);
        break;
      case "To Deck":
        player.game.allLog(`${player.name} placed a card back on their deck`);
        player.drawPile.push(card);
      }
    }
    player.discardPush(toDiscard);
  },

  Smithy: /** @param {Player} player */ async player => {
    player.draw(3);
  },

  // Actually valid jsdoc https://github.com/eslint/eslint/issues/11468
  // eslint-disable-next-line valid-jsdoc
  Spy: /** @param {Player} player */ async player => {
    player.actions += 1;
    player.draw();

    const attack = /** @param {Player} other */ async other => {
      const card = other.fromDraw({reveal: true});
      if (!card) {
        return;
      }
      const name = other.name === player.name ? "Your" : (other.name + "'s");
      player.sendMessage("Put back on deck or discard " + name + " " + card.name);
      const choice = await player.choose(["Put back", "Discard"]);
      if (choice === "Put back") {
        other.drawPile.push(card);
      } else {
        other.discardPush([card]);
      }
    };

    await player.game.sequentialAttack(player, attack);
    await attack(player);
  },

  Thief: /** @param {Player} player */ async player => {
    await player.game.sequentialAttack(player, /** @param {Player} other */ async other => {
      const drawn = other.multiFromDraw(2, {reveal: true});
      const treasures = drawn
        .filter(c => c.ofKind("treasure"))
        .map(c => c.name);
      if (!treasures.length) {
        other.discardPush(drawn);
        return;
      }
      const choices = treasures.flatMap(t => ["Trash: " + t, "Steal: " + t]);
      player.sendMessage("Trash or steal a Treasure:");
      let choice = await player.choose(choices);

      const isSteal = choice.substring(0, 7) === "Steal: ";
      choice = choice.substring(7);
      let chosen;
      if (choice === treasures[0]) {
        chosen = treasures.splice(0, 1)[0];
      } else {
        chosen = treasures.splice(1, 1)[0];
      }
      chosen = cards[chosen];

      if (isSteal) {
        player.game.allLog(`${player.name} stole ${other.name}'s ${chosen.name}`);
        player.discardPile.push(chosen);
      } else {
        player.trashPush(chosen);
      }
      const treasureCards = treasures.map(n => cards[n]);
      const notTreasures = drawn.filter(c => !c.ofKind("treasure"));
      other.discardPush(treasureCards.concat(notTreasures));
    });
  },

  ThroneRoom: /** @param {Player} player */ async player => {
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
  },

  Vassal: /** @param {Player} player */ async player => {
    const drawn = player.fromDraw();
    if (!drawn) {
      return;
    }
    if (!drawn.ofKind("action")) {
      player.discardPush([drawn]);
      return;
    }
    player.sendMessage(`What do you want to do with ${drawn.name}?`);
    if (await player.choose(["Play", "Discard"]) === "Play") {
      player.game.allLog(`${player.name} played ${drawn.name}`);
      await drawn.play(player);
      player.afterPlay(drawn);
    } else {
      player.discardPush([drawn]);
    }
  },

  Village: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 2;
  },

  Witch: /** @param {Player} player */ async player => {
    player.draw(2);

    await player.game.parallelAttack(player, /** @param {Player} other */ async other => {
      player.game.tryGainCard(other, "Curse");
    });
  },

  Woodcutter: /** @param {Player} player */ async player => {
    player.buys += 1;
    player.money += 2;
  },

  Workshop: /** @param {Player} player */ async player => {
    const gainChoices = player.game.store
      .getAvailable(4, player)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  },

  /* Prosperity Deck */

  Platinum: money(5),
  Colony: points(10),

  Bishop: /** @param {Player} player */ async player => {
    player.money += 1;
    let points = 1;
    const trashChoices = player.hand
      .map(c => c.name);
    if (!trashChoices.length) {
      player.sendMessage("No cards to trash");
    } else {
      player.sendMessage("Trash a card:");
      const trashChoice = await player.choose(trashChoices);
      const trash = player.fromHand(trashChoice);
      points += Math.floor(trash.getCost(player) / 2);
      player.trashPush(trash);
    }
    player.gainVictory(points);
    await Promise.all(player.game.otherPlayers(player).map(
      /** @param {Player} other */ async other => {
        const otherChoices = other.hand
          .map(c => c.name);
        if (!otherChoices.length) {
          other.game.allLog(`${other.name} could not trash a card`);
          return;
        }
        otherChoices.push("Don't Trash");
        other.sendMessage("Trash a card?");
        const otherChoice = await other.choose(otherChoices);
        if (otherChoice === "Don't Trash") {
          other.game.allLog(`${other.name} did not trash a card`);
          return;
        }
        other.trashPush(other.fromHand(otherChoice));
      }));
  },

  City: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 2;

    const emptyCount = Object.values(player.game.store.counts).filter(n => !n).length;
    if (emptyCount >= 1) {
      player.draw();
    }
    if (emptyCount >= 2) {
      player.buys += 1;
      player.money += 1;
    }
  },

  CountingHouse: /** @param {Player} player */ async player => {
    const coppers = player.discardPile.filter(c => c.name === "Copper").length;
    const choices = Array.from({length: coppers+1}, (v, k) => k.toString());
    player.sendMessage("Put Coppers from discard into hand:");
    const choice = await player.choose(choices);
    player.discardPile = player.discardPile.filter(c => c.name !== "Copper").concat(
      Array.from({length: coppers - +choice}, _ => cards.Copper));
    player.hand.push(...Array.from({length: +choice}, _ => cards.Copper));
    player.game.allLog(`${player.name} revealed ${choice} Copper from their discard and put into their hand`);
  },

  Expand: /** @param {Player} player */ async player => {
    if (!player.hand.length) {
      player.sendMessage("No Cards to trash");
      return;
    }
    const trashChoices = player.hand.map(c => c.name);
    player.sendMessage("Trash a card:");
    const trashChoice = await player.choose(trashChoices);
    const trash = player.fromHand(trashChoice);
    player.trashPush(trash);
    const gainChoices = player.game.store
      .getAvailable(trash.getCost(player) + 3, player)
      .map(c => c.name);
    if (!gainChoices.length) {
      return;
    }
    player.sendMessage("Gain a card:");
    const gainChoice = await player.choose(gainChoices);
    player.game.gainCard(player, gainChoice);
  },

  Forge: /** @param {Player} player */ async player => {
    let cost = 0;
    for (;;) {
      const trashChoices = player.hand.map(c => `Trash: ${c.name}`);
      const gainChoices = player.game.store
        .getAvailable(cost, player)
        .filter(c => c.getCost(player) === cost)
        .map(c => `Gain: ${c.name}`);
      player.sendMessage("Trash cards, or finish by gaining a card:");
      const trashChoice = await player.choose([...trashChoices, "\n", ...gainChoices]);
      const [kind, name] = trashChoice.split(" ");
      if (kind === "Trash:") {
        const trash = player.fromHand(name);
        player.trashPush(trash);
        cost += trash.getCost(player);
      } else {
        player.game.gainCard(player, name);
        return;
      }
    }
  },

  Goons: {
    /**
     * @param {Player} player
     */
    async play(player) {
      player.buys += 1;
      player.money += 2;
      await player.game.parallelAttack(player, discardToThree);
    },

    /**
     * @param {Player} player
     */
    afterPlay(player) {
      player.onBought.push(/** @param {Card} card */ card => {
        player.gainVictory(1);
      });
      player.played.push(cards.Goons);
    },
  },

  GrandMarket: {
    /**
     * @param {Player} player
     */
    async play(player) {
      player.draw();
      player.actions += 1;
      player.buys += 1;
      player.money += 2;
    },

    /**
     * @param {Player | null} player
     * @return {number}
     */
    getCost(player) {
      if (!player || player.phase !== "buy") {
        return 6;
      }

      return player.played.includes(cards.Copper) ? Infinity : 6;
    },
  },

  KingsCourt: /** @param {Player} player */ async player => {
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
  },

  Monument: /** @param {Player} player */ async player => {
    player.money += 2;
    player.gainVictory(1);
  },

  Peddler: {
    /**
     * @param {Player} player
     */
    async play(player) {
      player.draw();
      player.actions += 1;
      player.money += 1;
    },

    /**
     * @param {Player | null} player
     * @return {number}
     */
    getCost(player) {
      if (!player || player.phase !== "buy") {
        return 8;
      }

      const playedActions = player.played.filter(c => c.ofKind("action")).length;
      return Math.max(0, 8 - 2 * playedActions);
    },
  },

  Vault: /** @param {Player} player */ async player => {
    player.draw(2);

    const others = Promise.all(player.game.otherPlayers(player).map(
      /** @param {Player} other */ async other => {
        const discardChoices = other.hand.map(c => c.name);
        discardChoices.push("Don't Discard");

        other.sendMessage("You may discard two cards to draw a card:");
        const firstChoice = await other.choose(discardChoices);
        if (firstChoice === "Don't Discard") {
          other.game.allLog(`${other.name} chose not to discard`);
          return;
        }
        const toDiscard = [other.fromHand(firstChoice)];

        if (other.hand.length) {
          other.sendMessage("Discard another card:");
          const choice = await other.choose(other.hand.map(c => c.name));
          toDiscard.push(other.fromHand(choice));

          other.draw();
        } else {
          other.game.allLog(`${other.name} had only one card to discard`);
        }
        other.discardPush(toDiscard);
      }));

    const toDiscard = [];
    for (;;) {
      const choices = player.hand.map(c => c.name);
      if (!choices.length) {
        break;
      }

      choices.push("Done Discarding");
      player.sendMessage("Discard cards for Money:");
      const choice = await player.choose(choices);
      if (choice === "Done Discarding") {
        break;
      }

      toDiscard.push(player.fromHand(choice));
    }
    player.discardPush(toDiscard);
    player.money += toDiscard.length;

    await others;
  },

  WorkersVillage: /** @param {Player} player */ async player => {
    player.draw();
    player.actions += 2;
    player.buys += 1;
  },
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

/**
 * @param {{cost: string, name: string}} tableRow
 * @return {function(Player): number}
 */
function getCost(tableRow) {
  const match = /^\$(\d+)$/.exec(tableRow.cost);
  if (match) {
    return _ => +match[1];
  }
  throw new Error(`${tableRow.name}: Unknown cost string '${tableRow.cost}'`);
}

/**
 * @param {{types: string}} tableRow
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
    || this.getCost(null) - other.getCost(null) // Sorting is best-effort, so not knowing player is fine
    || this.name.localeCompare(other.name);
}

/**
 * Cards are defined here combined with info from cardsTable
 * Name should be valid JS identifiers, and match the real name s/[ ']//g
 * If the card is type function, then that is assumed to be play()
 *
 * When implementing, use caution to ensure proper bookkeeping:
 * - use player.store.gainCard() instead of directly adding copied cards
 * - revealed cards should use player.fromDraw({reveal: true})
 * - gaining VP tokens should use player.gainVictory
 * - "While this is in play" effects go in afterPlay() not play()
 *   - That way they trigger exactly once on ThroneRoom
 *   - It's assumed cards can't be removed early from In Play, otherwise the callback will need to be removed
 * - if a treasure card can detect the cost of Grand Market with Copper is infinity, there will need to be a canBuy predicate
 *
 * @typedef {object} Card
 * @property {string} name
 * @property {string[]} kind
 * @property {string} text
 * @property {string} set
 * @property {string} color
 *
 * @property {function(Player): Promise<void>} play
 * @property {function(Player): number} getCost
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

  const tableRow = cardsTable[name];
  if (!tableRow) {
    throw new Error(`Can't find ${name}`);
  }

  if (!card.getCost) {
    card.getCost = getCost(tableRow);
  }
  card.kind = getKinds(tableRow);
  card.text = tableRow.text;
  card.set = tableRow.set;

  card.ofKind = k => card.kind.includes(k);
  card.color = colorMap[card.kind[0]];

  o[name] = card;
  return o;
}, {});

module.exports = cards;
