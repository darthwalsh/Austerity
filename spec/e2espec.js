/* global describe it expect */

const Lib = require("../cli/lib");
require("../server/app");

describe("e2e", () => {
  it("plays a game", async done => {
    let output = "";
    const playGame = new Promise((res, rej) => {
      const url = "http://localhost:8080";
      const p1 = new Lib(url,
        async choices => {
          if (choices.includes("New Game")) {
            return "New Game";
          }
          return choices[0];
        },
        line => {
          output += line;
          if (line.includes("GAME OVER!!!")) {
            res();
          }
        });
      p1.connect("p1");
    });

    await playGame;

    expect(output).toEqual("");

    done();
  });
});
