/* global describe it expect */
/* eslint-disable key-spacing */

const cards = require("../server/cards");
const Store = require("../server/store");

describe("store", () => {
  it("initial counts", () => {
    const tests = [
      {playerCount: 1, expectedCounts: {Village: 10, Gardens:  8, Curse: 10, Duchy:  8, Province:  8, Colony:  8, Copper:  60 - 1 * 7, Silver: 40, Gold: 30, Platinum: 12}},
      {playerCount: 2, expectedCounts: {Village: 10, Gardens:  8, Curse: 10, Duchy:  8, Province:  8, Colony:  8, Copper:  60 - 2 * 7, Silver: 40, Gold: 30, Platinum: 12}},
      {playerCount: 3, expectedCounts: {Village: 10, Gardens: 12, Curse: 20, Duchy: 12, Province: 12, Colony: 12, Copper:  60 - 3 * 7, Silver: 40, Gold: 30, Platinum: 12}},
      {playerCount: 4, expectedCounts: {Village: 10, Gardens: 12, Curse: 30, Duchy: 12, Province: 12, Colony: 12, Copper:  60 - 4 * 7, Silver: 40, Gold: 30, Platinum: 12}},
      {playerCount: 5, expectedCounts: {Village: 10, Gardens: 12, Curse: 40, Duchy: 12, Province: 15, Colony: 12, Copper: 120 - 5 * 7, Silver: 80, Gold: 60, Platinum: 24}},
      {playerCount: 6, expectedCounts: {Village: 10, Gardens: 12, Curse: 50, Duchy: 12, Province: 18, Colony: 12, Copper: 120 - 6 * 7, Silver: 80, Gold: 60, Platinum: 24}},
    ];

    for (const test of tests) {
      const store = new Store();
      store.init([cards.Village, cards.Gardens, cards.Colony, cards.Platinum], test.playerCount);
      for (const card in test.expectedCounts) {
        expect(store.counts[card])
          .withContext(JSON.stringify({p: test.playerCount, card}))
          .toEqual(test.expectedCounts[card]);
      }
    }
  });

  it("gameOver", () => {
    const store = new Store();
    store.init([cards.Village, cards.Smithy, cards.Woodcutter, cards.City], 2);
    expect(store.gameOver()).toBeFalsy();
    store.counts.Village = 0;
    expect(store.gameOver()).toBeFalsy();
    store.counts.Smithy = 0;
    expect(store.gameOver()).toBeFalsy();
    store.counts.Woodcutter = 0;
    expect(store.gameOver()).toBeTruthy();

    store.counts.Woodcutter = 10;
    store.counts.Province = 0;
    expect(store.gameOver()).toBeTruthy();

    store.init([cards.Village, cards.Smithy, cards.Woodcutter, cards.City, cards.Colony], 5);
    store.counts.Village = 0;
    store.counts.Smithy = 0;
    store.counts.Woodcutter = 0;
    expect(store.gameOver()).toBeFalsy();
    store.counts.City = 0;
    expect(store.gameOver()).toBeTruthy();

    store.init([cards.Village, cards.Smithy, cards.Woodcutter, cards.City, cards.Colony], 5);
    store.counts.Province = 0;
    expect(store.gameOver()).toBeTruthy();

    store.init([cards.Village, cards.Smithy, cards.Woodcutter, cards.City, cards.Colony], 5);
    store.counts.Colony = 0;
    expect(store.gameOver()).toBeTruthy();
  });
});
