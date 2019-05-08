/* global describe it expect */

const fs = require("fs");
const path = require("path");

const Lib = require("../cli/lib");
const Server = require("../server/server");

/**
 * @param {string[]} choices
 */
async function bigMoney(choices) {
  const pickOrder = [
    "Play All Treasures",
    "Buy: Province",
    "Buy: Gold",
    "Buy: Silver",
    /'s game/,
    "New Game",
  ];

  for (const pick of pickOrder) {
    if (pick instanceof RegExp) {
      const filtered = choices.filter(c => c.match(pick));
      if (filtered.length) {
        expect(filtered.length).toEqual(1);
        return filtered[0];
      }
    } else if (choices.includes(pick)) {
      return pick;
    }
  }

  return choices[0];
}

describe("e2e", () => {
  new Server().listen({trivialShuffle: true});

  it("plays a game", async done => {
    let output = "";
    const playGame = new Promise((res, rej) => {
      const url = "http://localhost:8080";
      const p1 = new Lib(url, bigMoney, line => {
        output += line + "\n";
        if (line.includes("GAME OVER!!!")) {
          res();
        }
      });
      p1.connect("p1");
    });

    await playGame;

    const transcript = path.join(__dirname, "SoloBigMoney.txt");

    const expected = await fs.readFileSync(transcript, {encoding: "utf8"});
    expect(output).toEqual(expected);

    done();
  });
});