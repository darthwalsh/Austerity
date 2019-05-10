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
    const output = [];
    const playGame = new Promise((res, rej) => {
      const url = "http://localhost:8080";
      const p1 = new Lib(url, async choices => {
        const result = await bigMoney(choices);
        output.push(`Choices: ${choices.map(c => c === "\n" ? "\\n" : c).join(", ")}`);
        output.push(`Chose: ${result}`);
        return result;
      }, line => {
        expect(line.includes("\n")).toBeFalsy();
        output.push(line);
        if (line.includes("GAME OVER!!!")) {
          res();
        }
      });
      p1.connect("p1");
    });

    await playGame;

    const transcript = path.join(__dirname, "SoloBigMoney.txt");

    output.push(""); // trailing new line
    const expected = fs.readFileSync(transcript, {encoding: "utf8"}).split(/\r?\n/);
    if (output !== expected) {
      fs.writeFileSync(transcript, output.join("\r\n")); // re-baseline the test data for next run
    }

    expectArrayEqual(output, expected);

    done();
  });
});

/**
 * @param {any[]} output
 * @param {any[]} expected
 */
function expectArrayEqual(output, expected) {
  for (let i = 0; i < Math.min(output.length, expected.length); ++i) {
    expect(`[${i+1}] ${output[i]}`).toEqual(`[${i+1}] ${expected[i]}`);
  }
  expect(output.length).toEqual(expected.length);
}

