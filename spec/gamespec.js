/* global describe it expect */

import cards from "../server/cards.js";
import Game from "../server/game.js";

describe("game", () => {
  it("displays endgame", () => {
    const deck = [
      cards.Copper,
      cards.Copper,
      cards.Copper,
      cards.Estate,
      cards.Estate,
      cards.Curse,
      cards.Province,
      cards.Smithy,
      cards.Gardens,
    ];

    expect(new Game().getEndGame(deck)).toEqual(
      "Estate (2), Gardens (1), Province (1), Curse (1), Copper (3), Smithy (1)"
    );
  });
});
