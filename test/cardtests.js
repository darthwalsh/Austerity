
var defaultTest = {
  dMoney: 0,
  dActions: 0,
  dBuys: 0,
  points: 0,
  draw: [],
  discard: [],
  hand: [],
  interactions: [],
  drawAfter: [],
  discardAfter: [],
  handAfter: []
};

var tests = {
  Copper: {
    dMoney: 1
  },
  Silver: {
    dMoney: 2
  },
  Gold: {
    dMoney: 3
  },

  Estate: {
    points: 1
  },
  Duchy: {
    points: 3
  },
  Province: {
    points: 6
  },

  Cellar: {
    dActions: 1,
    draw: ["Silver", "Village"],
    discard: [],
    hand: ["Copper", "Gold"],
    interactions: [
      "Discard cards:",
      ["Copper", "Gold", "Done Discarding"],
      "Copper",
      "Discard cards:",
      ["Gold", "Done Discarding"],
      "Gold"
    ],
    drawAfter: [],
    discardAfter: ["Copper", "Gold"],
    handAfter: ["Village", "Silver"]
  },

  Cellar_Done: {
    dActions: 1,
    draw: ["Silver"],
    discard: [],
    hand: ["Copper"],
    interactions: [
      "Discard cards:",
      ["Copper", "Done Discarding"],
      "Done Discarding"
    ],
    drawAfter: ["Silver"],
    discardAfter: [],
    handAfter: ["Copper"]
  },

  Festival: {
    dActions: 2,
    dBuys: 1,
    dMoney: 2
  }
};

var game = {trash: []};

describe("cards", function () {
  for(var tName in tests) {
    it("plays " + tName, function(tName) { return function() {
      var that = this;
      var test = tests[tName];

      if (tName.indexOf("_") != -1) {
        tName = tName.substring(0, tName.indexOf("_"));
      }
      var card = cards[tName];

      for(var key in defaultTest) {
        test[key] = test[key] || defaultTest[key];
      }

      var init = {
        actions: 3,
        buys: 3,
        money: 3
      };

      var interactionIndex = 0;

      var p = new Player("Bot", {send: function(message) {
        var o = JSON.parse(message);
        if (o.message && o.message.substring(0, 4) == "Hand")
          return;

        var expected = test.interactions[interactionIndex++];

        if (o.message) {
          expect(o.message).toEqual(expected);
        } else if (o.choices) {
          expect(o.choices).toEqual(expected);
          p.onChoice(test.interactions[interactionIndex++]);
        } else {
          that.fail(Error("Not implemented: " + message));  //TODO
        }
      }});

      p.money = init.money;
      p.actions = init.actions;
      p.buys = init.buys;

      p.drawPile = test.draw.map(function(n) { return cards[n]; });
      p.discardPile = test.discard.map(function(n) { return cards[n]; });
      p.hand = test.hand.map(function(n) { return cards[n]; });

      var called = false;

      if(card.kind == "action" || card.kind == "treasure") {
        card.play(p, function() {
          expect(p.actions - init.actions).toEqual(test.dActions, "dActions");
          expect(p.buys - init.buys).toEqual(test.dBuys, "dBuys");
          expect(p.money - init.money).toEqual(test.dMoney, "dMoney");

          expect(p.drawPile.map(function(c) {return c.name;}))
            .toEqual(test.drawAfter, "drawAfter");
          expect(p.discardPile.map(function(c) {return c.name;}))
            .toEqual(test.discardAfter, "discardAfter");
          expect(p.hand.map(function(c) {return c.name;}))
            .toEqual(test.handAfter, "handAfter");

          called = true;
        });

        expect(called).toBeTruthy("called");
      } else if(card.kind == "property") {
        expect(card.points).toEqual(test.points, "points");
      } else {
        this.fail(Error("Not implemented: " + card.kind));
      }
    };}(tName));
  }
});