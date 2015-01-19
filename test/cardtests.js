
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
  handAfter: [],

  others: [],

  store: [],
  trashAfter: []
};

var defaultOthers = {
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
  Platinum: {
    dMoney: 5
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
  Curse: {
    points: -1
  },


  Adventurer: {
    draw: ["Copper", "Village", "Silver"],
    hand: [],
    discardAfter: ["Village"],
    handAfter: ["Silver", "Copper"],
  },

  Adventurer_None: {
    draw: ["Village", "Estate", "Duchy"],
    hand: [],
    discardAfter: ["Duchy", "Estate", "Village"],
    handAfter: [],
  },

  Adventurer_Discard: {
    draw: [],
    discard: ["Copper"],
    hand: [],
    discardAfter: [],
    handAfter: ["Copper"],
  },

  Adventurer_Extra: {
    draw: ["Estate", "Copper", "Village", "Silver"],
    hand: [],
    drawAfter: ["Estate"],
    discardAfter: ["Village"],
    handAfter: ["Silver", "Copper"],
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

  Chapel: {
    hand: ["Copper", "Silver", "Gold", "Village", "Chapel"],
    interactions: [
      "Trash up to 4 cards:",
      ["Copper", "Silver", "Gold", "Village", "Chapel", "Done Trashing"],
      "Copper",
      "Trash up to 3 cards:",
      ["Silver", "Gold", "Village", "Chapel", "Done Trashing"],
      "Gold",
      "Trash up to 2 cards:",
      ["Silver", "Village", "Chapel", "Done Trashing"],
      "Village",
      "Trash up to 1 cards:",
      ["Silver", "Chapel", "Done Trashing"],
      "Chapel"
    ],
    handAfter: ["Silver"],
    trashAfter: ["Copper", "Gold", "Village", "Chapel"]
  },

  Chapel_Done: {
    hand: ["Copper"],
    interactions: [
      "Trash up to 4 cards:",
      ["Copper", "Done Trashing"],
      "Done Trashing"
    ],
    handAfter: ["Copper"],
    trashAfter: []
  },

  CouncilRoom: {
    dBuys: 1,
    draw: ["Village", "Estate", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Gold", "Silver", "Copper", "Estate"],

    others: [{
      draw: ["Copper", "Silver"],
      hand: [],
      drawAfter: ["Copper"],
      handAfter: ["Silver"]
    }]
  },

  CouncilRoom_Self: {
    dBuys: 1,
    draw: ["Village", "Estate", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Gold", "Silver", "Copper", "Estate"],

    others: []
  },

  Festival: {
    dActions: 2,
    dBuys: 1,
    dMoney: 2
  },

  Gardens: {
    points: 1,
    hand: ["Copper", "Silver", "Gold", "Village"],
    draw: ["Copper", "Silver", "Gold"],
    discard: ["Copper", "Silver", "Gold"]
  },

  Gardens_Rounding: {
    points: 0,
    hand: [
      "Copper", "Silver", "Gold", "Village", "Smithy",
      "Copper", "Silver", "Gold", "Village"
    ]
  },

  Laboratory: {
    dActions: 1,
    draw: ["Copper", "Silver"],
    hand: [],
    handAfter: ["Silver", "Copper"],
  },

  Market: {
    dActions: 1,
    dBuys: 1,
    dMoney: 1,
    draw: ["Copper"],
    hand: [],
    handAfter: ["Copper"],
  },

  Mine: {
    hand: ["Copper", "Silver"],
    interactions: [
      "Trash a Treasure:",
      ["Copper", "Silver"],
      "Silver",
      "Gain a Treasure:",
      ["Copper", "Silver", "Gold"],
      "Gold"
    ],
    handAfter: ["Copper", "Gold"],
    trashAfter: ["Silver"]
  },

  Mine_NoMoney: {
    hand: [],
    interactions: [
      "No Treasures to trash"
    ],
    handAfter: []
  },

  Moat: {
    draw: ["Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Copper"],
    handAfter: ["Gold", "Silver"]
  },

  Witch_Moat: {
    store: ["Curse"],
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    others: [{
      hand: ["Moat"],
      discard: [],
      interactions: [
        ["Moat", "Get Attacked"],
        "Moat"
      ],
      handAfter: ["Moat"],
      discardAfter: []
    }]
  },

  Witch_MoatAttacked: {
    store: ["Curse"],
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    others: [{
      hand: ["Moat"],
      discard: [],
      interactions: [
        ["Moat", "Get Attacked"],
        "Get Attacked"
      ],
      handAfter: ["Moat"],
      discardAfter: ["Curse"]
    }]
  },

  Moneylender: {
    dMoney: 3,
    hand: ["Copper", "Copper"],
    handAfter: ["Copper"],
    trashAfter: ["Copper"]
  },

  Moneylender_NoCopper: {
    dMoney: 0,
    hand: ["Silver"],
    handAfter: ["Silver"],
    trashAfter: []
  },

  Remodel: {
    hand: ["Copper", "Silver"],
    interactions: [
      "Trash a card:",
      ["Copper", "Silver"],
      "Copper",
      "Gain a card:",
      ["Copper", "Estate"],
      "Estate"
    ],
    handAfter: ["Silver"],
    discardAfter: ["Estate"],
    trashAfter: ["Copper"]
  },

  Smithy: {
    draw: ["Village", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Gold", "Silver", "Copper"],
  },

  Smithy_DoneDraw: {
    draw: ["Copper"],
    hand: [],
    drawAfter: [],
    handAfter: ["Copper"],
  },

  ThroneRoom: {
    hand: ["Copper", "Mine"],
    interactions: [
      "Pick an Action to double:",
      ["Mine"],
      "Mine",
      "ALL: Bot played Mine doubled!",
      "Trash a Treasure:",
      ["Copper"],
      "Copper",
      "Gain a Treasure:",
      ["Copper", "Silver"],
      "Silver",
      "Trash a Treasure:",
      ["Silver"],
      "Silver",
      "Gain a Treasure:",
      ["Copper", "Silver", "Gold"],
      "Gold"
    ],
    handAfter: ["Gold"],
    trashAfter: ["Copper", "Silver"]
  },

  ThroneRoom_None: {
    hand: ["Copper", "Silver"],
    interactions: [
      "No Actions to play"
    ],
    handAfter: ["Copper", "Silver"]
  },

  Village: {
    dActions: 2,
    draw: ["Copper"],
    hand: [],
    handAfter: ["Copper"],
  },

  Witch: {
    store: ["Curse"],
    draw: ["Village", "Estate", "Copper"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: ["Curse"]
    }]
  },

  Witch_NoCurse: {
    store: [],
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: []
    }]
  },

  Witch_Self: {
    draw: ["Village", "Estate", "Copper"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: []
  },

  Witch_Many: {
    store: ["Curse"],
    draw: ["Village", "Estate", "Copper"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: ["Curse"]
    }, {
      discard: [],
      discardAfter: ["Curse"]
    }]
  },

  Woodcutter: {
    dBuys: 1,
    dMoney: 2
  },

  Workshop: {
    interactions: [
      "Gain a card:",
      ["Copper", "Silver", "Estate"],
      "Estate"
    ],
    discardAfter: ["Estate"]
  },

  KingsCourt: {
    hand: ["Woodcutter", "Woodcutter"],
    dBuys: 3,
    dMoney: 6,
    interactions: [
      "Pick an Action to triple:",
      ["Woodcutter", "Woodcutter"],
      "Woodcutter",
      "ALL: Bot played Woodcutter tripled!!",
    ],
    handAfter: ["Woodcutter"]
  }
};

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
      for(var i = 0; i < test.others.length; ++i) {
        for(var oKey in defaultOthers) {
          test.others[i][oKey] = test.others[i][oKey] || defaultOthers[oKey];
        }
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
          that.fail(Error("Not implemented: " + message));
        }
      }});

      var otherCount = 0;
      var others = test.others.map(function(testOther) {
        var oInterationIndex = 0;
        var oP = new Player("Other#" + otherCount++, {send: function(message) {
          var o = JSON.parse(message);
          if (o.message && o.message.substring(0, 4) == "Hand")
            return;

          var expected = testOther.interactions[oInterationIndex++];

          if (o.message) {
            expect(o.message).toEqual(expected);
          } else if (o.choices) {
            expect(o.choices).toEqual(expected);

            oP.onChoice(testOther.interactions[oInterationIndex++]);
          } else {
            that.fail(Error("Not implemented: " + message));
          }
        }});
        oP.TestIndex = otherCount - 1;
        oP.drawPile = testOther.draw.map(function(n) { return cards[n]; });
        oP.discardPile = testOther.discard.map(function(n) { return cards[n]; });
        oP.hand = testOther.hand.map(function(n) { return cards[n]; });
        return oP;
      });

      game = {trash: [], store: new Store()};
      game.store.setIncluded(test.store.map(function(n) { return cards[n]; }));
      game.alllog = function(message) {
        var expected = test.interactions[interactionIndex++];
        expect("ALL: " + message).toEqual(expected, "all log");
      };
      game.otherPlayers = function(player) { return others; };

      p.money = init.money;
      p.actions = init.actions;
      p.buys = init.buys;
      p.played = [];

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

          expect(game.trash.map(function(c) {return c.name;}))
            .toEqual(test.trashAfter, "trashAfter");

          expect(interactionIndex).toEqual(test.interactions.length, "all interactions used");

          others.forEach(function(o) {
            expect(o.drawPile.map(function(c) {return c.name;}))
              .toEqual(test.others[o.TestIndex].drawAfter, o.name + " drawAfter");
            expect(o.discardPile.map(function(c) {return c.name;}))
              .toEqual(test.others[o.TestIndex].discardAfter, o.name + " discardAfter");
            expect(o.hand.map(function(c) {return c.name;}))
              .toEqual(test.others[o.TestIndex].handAfter, o.name + " handAfter");
          });

          called = true;
        });

        expect(called).toBeTruthy("called");
      } else if(card.kind == "property" || card.kind == "curse") {
        expect(card.getPoints(p)).toEqual(test.points, "points");
      } else {
        this.fail(Error("Not implemented: " + card.kind));
      }
    };}(tName));
  }

  it("tests all", function() {
    for (var cardName in cards) {
      expect(tests[cardName]).toBeDefined("tests " + cardName);
    }
  });
});