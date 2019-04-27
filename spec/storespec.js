/* global describe it expect */

const cards = require("../server/cards");
const Store = require("../server/store");

describe("store", () => {
  it("initial counts", () => {
    const tests = [
      {playerCount: 1, expectedCounts: {Village: 10, Gardens: 8, Curse: 10, Province: 8, Copper: 30}},
      {playerCount: 2, expectedCounts: {Village: 10, Gardens: 8, Curse: 10, Province: 8, Copper: 30}},
      {playerCount: 3, expectedCounts: {Village: 10, Gardens: 12, Curse: 20, Province: 12, Copper: 30}},
      {playerCount: 4, expectedCounts: {Village: 10, Gardens: 12, Curse: 30, Province: 12, Copper: 30}},
    ];

    for (const test of tests) {
      const store = new Store();
      store.init([cards.Village, cards.Gardens], test.playerCount);
      for (const card in test.expectedCounts) {
        expect(store.counts[card]).toEqual(test.expectedCounts[card]);
      }
    }
  });
});
