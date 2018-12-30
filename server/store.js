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
      o[c.name] = c.ofKind("treasure") ? DEFAULT_TREASURE_COUNT : DEFAULT_PROPERTY_COUNT;
      return o;
    }, {});
    this.included = null;
  }

  optional() {
    const t = this;
    return Object.keys(cards).filter(n => t.default.indexOf(cards[n]) == -1);
  }

  setIncluded(cards) {
    this.included = cards;
    this.counts = cards.reduce((o, c) => {
      o[c.name] = 10;
      return o;
    }, this.counts);
  }

  getAvailable(price) {
    const t = this;
    return this.default.concat(this.included)
      .filter(c => c.cost <= price && t.counts[c.name]);
  }

  bought(card) {
    if (--this.counts[card] < 0) {
      console.error("Already out of card!");
    }
  }

  gameOver() {
    const t = this;
    if (!this.counts[cards.Province]) {
      return true;
    }
    return this.default.concat(this.included)
      .filter(c => t.counts[c] === 0).length >= 3;
  }
}

module.exports.Store = Store;
