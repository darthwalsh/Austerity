/* global describe it expect */

const Lib = require("../cli/lib");
require("../server/app");

describe("e2e", () => {
  it("plays a game", async () => {
    let output = "";
    const playGame = new Promise((res, rej) => {
      const url = "http://localhost:8080";
      const p1 = new Lib(url,
        line => { // TODO should be array //TODO hardcode to press New Game
          const x = line.split(" / ")[0];
          return Promise.resolve(x);
        },
        line => { //TODO should probably include {type, data}
          output += line;
          if (line.includes("GAME OVER!!!")) {
            res();
          }
        });
      p1.connect("p1");
    });

    await playGame;

    expect(output).toEqual("");
  });
});
