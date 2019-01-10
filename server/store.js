const cards = require("./cards");

class Store {
  constructor() {
    const DEFAULT_TREASURE_COUNT = 30;
    const DEFAULT_PROPERTY_COUNT = 8; // TODO make correct
    this.default = [
      cards.Copper, cards.Silver, cards.Gold,
      cards.Estate, cards.Duchy, cards.Province,
    ];
    this.counts = this.default.reduce((o, c) => {
      // @ts-ignore
      o[c.name] = c.ofKind("treasure") ? DEFAULT_TREASURE_COUNT : DEFAULT_PROPERTY_COUNT;
      return o;
    }, {});
    this.included = null;
  }

  optional() {
    return Object.keys(cards).filter(n => this.default.indexOf(cards[n]) == -1);
  }

  setIncluded(included) {
    this.included = included;
    this.counts = included.reduce((o, c) => {
      o[c.name] = 10;
      return o;
    }, this.counts);
  }

  /**
   * @return {any[]} widen type to avoid ts type complaints
   */
  getAllCards() {
    return this.default.concat(this.included);
  }

  getAvailable(price) {
    return this.getAllCards().filter(c => c.cost <= price && this.counts[c.name]);
  }

  bought(card) {
    if (--this.counts[card.name] < 0) {
      console.error("Already out of card!");
    }
  }

  gameOver() {
    if (!this.counts.Province) {
      return true;
    }
    return this.getAllCards()
      .filter(c => this.counts[c.name] === 0).length >= 3;
  }
}

module.exports.Store = Store;
