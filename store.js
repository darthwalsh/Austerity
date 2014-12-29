function Store() {
  var DEFAULT_TREASURE_COUNT = 30;
  var DEFAULT_PROPERTY_COUNT = 8;

  this.default = [
    cards.Copper, cards.Silver, cards.Gold,
    cards.Estate, cards.Duchy, cards.Province];
  this.counts = this.default.reduce(function(o, c) {
    o[c.name] = c.kind == "treasure" ? DEFAULT_TREASURE_COUNT : DEFAULT_PROPERTY_COUNT;
    return o;
  }, {});
  this.included = null;
} 

Store.prototype = {
  optional: function() {
    var t = this;
    return Object.keys(cards).filter(function(n){return t.default.indexOf(cards[n]) == -1});
  },

  setIncluded: function(cards) {
    this.included = cards;
    this.counts = cards.reduce(function(o, c){
      o[c.name] = 10;
      return o;
    }, this.counts);
  },

  getAvailable: function(price) {
    var t = this;
    return this.default.concat(this.included)
      .filter(function(c){return c.cost <= price && t.counts[c.name];});
  }
}