/* global describe it expect */

const cards = require("../server/cards");
const Game = require("../server/game");

describe("game", () => {
  it("displays endgame", () => {
    const deck = [
      cards.Copper, cards.Copper, cards.Copper,
      cards.Estate, cards.Estate,
      cards.Curse,
      cards.Province,
      cards.Smithy,
      cards.Gardens,
    ];

    expect(new Game().getEndGame(deck)).toEqual("Estate (2), Gardens (1), Province (1), Curse (1), Copper (3), Smithy (1)");
  });
});
