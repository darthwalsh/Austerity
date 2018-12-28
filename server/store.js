const util = require("./util");
const cards = require("./cards");

function Store() {
  const DEFAULT_TREASURE_COUNT = 30;
  const DEFAULT_PROPERTY_COUNT = 8; //TODO make correct

  this.default = [
    cards.Copper, cards.Silver, cards.Gold,
    cards.Estate, cards.Duchy, cards.Province];
  this.counts = this.default.reduce(function(o, c) {
    o[c.name] = c.ofKind("treasure") ? DEFAULT_TREASURE_COUNT : DEFAULT_PROPERTY_COUNT;
    return o;
  }, {});
  this.included = null;
}

Store.prototype = {
  optional: function() {
    const t = this;
    return Object.keys(cards).filter(function(n){
      return t.default.indexOf(cards[n]) == -1;
    });
  },

  setIncluded: function(cards) {
    this.included = cards;
    this.counts = cards.reduce(function(o, c){
      o[c.name] = 10;
      return o;
    }, this.counts);
  },

  getAvailable: function(price) {
    const t = this;
    return this.default.concat(this.included)
      .filter(function(c){return c.cost <= price && t.counts[c.name];});
  },

  bought: function(card) {
    if(--this.counts[card] < 0)
      console.error("Already out of card!");
  },

  gameOver: function() {
    const t = this;
    if(!this.counts[cards.Province])
      return true;
    return this.default.concat(this.included).filter(function(c) {
      return t.counts[c] === 0;
    }).length >= 3;
  },
};

for(const name in Store.prototype)
  Store.prototype[name] = util.wrapErrors(Store.prototype[name]);

module.exports.Store = Store;
