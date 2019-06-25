const cards = require("./cards");

/**
 * @typedef { import("./cards").Card } Card
 * @typedef { import("./player") } Player
 */

class Store {
  constructor() {
    this.default = [
      cards.Copper, cards.Silver, cards.Gold,
      cards.Curse, cards.Estate, cards.Duchy, cards.Province,
    ];
  }

  /**
   * @return {Card[]}
   */
  optional() {
    return Object.values(cards).filter(c => !this.default.includes(c))
      .sort((a, b) => a.compareTo(b));
  }

  /**
   * @param {Card[]} included
   * @param {number} playerCount
   */
  init(included, playerCount) {
    this.included = included;
    this.playerCount = playerCount;
    this.allCards = this.default.concat(this.included).sort((a, b) => a.compareTo(b));

    const extraSize = playerCount > 4;

    const kinds = {
      victory: c => {
        let count = playerCount <= 2 ? 8 : 12;
        if (c.name === "Province" && extraSize) {
          count += (playerCount - 4) * 3;
        }
        return count;
      },
      curse: _ => 10 * Math.max(playerCount - 1, 1),
      treasure: c => {
        switch (c.name) {
        case "Copper": return (extraSize ? 120 : 60) - 7 * playerCount;
        case "Silver": return extraSize ? 80 : 40;
        case "Gold": return extraSize ? 60 : 30;
        case "Platinum": return extraSize ? 24 : 12;
        default: return 10;
        }
      },
      action: _ => 10,
    };

    /** @type {Object<string, number>} */
    this.counts = this.default.concat(this.included).reduce((o, c) => {
      const [[, func], extra] = Object.entries(kinds).filter(([kind, _]) => c.ofKind(kind));

      if (extra) {
        throw new Error(`${c.name} has a non-unique kind`);
      }

      o[c.name] = func(c);
      return o;
    }, {});
  }

  getAllCards() {
    return this.allCards;
  }

  /**
   * @param {number} price
   * @param {Player} player
   * @return {Card[]}
   */
  getAvailable(price, player) {
    return this.getAllCards().filter(c => c.getCost(player) <= price && this.counts[c.name]);
  }

  bought(card) {
    if (typeof(card.name) !== "string") {
      throw new Error("Invalid argument, not a card");
    }
    if (--this.counts[card.name] < 0) {
      throw new Error("Already out of card!");
    }
  }

  gameOver() {
    if (this.counts.Province === 0 || this.counts.Colony === 0) {
      return true;
    }
    const requiredPiles = this.playerCount > 4 ? 4 : 3;
    return this.getAllCards()
      .filter(c => this.counts[c.name] === 0).length >= requiredPiles;
  }
}

module.exports = Store;
