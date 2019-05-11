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
  const url = "http://localhost:8080";

  it("plays a game", async done => {
    const output = [];
    await new Promise((res, rej) => {
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

    const transcript = path.join(__dirname, "SoloBigMoney.txt");

    output.push(""); // trailing new line
    const expected = fs.readFileSync(transcript, {encoding: "utf8"}).split(/\r?\n/);
    if (output !== expected) {
      fs.writeFileSync(transcript, output.join("\r\n")); // re-baseline the test data for next run
    }

    expectArrayEqual(output, expected);

    done();
  });

  async function closeReopenAt(choice, done) {
    await new Promise((res, rej) => {
      const p1 = new Lib(url, choices => {
        if (!choices.includes(choice)) {
          return bigMoney(choices);
        }
        p1.close();
        res();
        return new Promise((res, rej) => {/* black-hole lib instance */});
      }, _ => { });
      p1.connect("p1");
    });

    await new Promise((res, rej) => {
      const p1 = new Lib(url, bigMoney, line => {
        if (line.includes("GAME OVER!!!")) {
          res();
        }
      });
      p1.connect("p1");
    });

    done();
  }

  // TODO what should the behavior be? Just delete the game and start over? -- see keep note
  // it("handles lobby close/reopen", async done => {
  //   closeReopenAt("Platinum", done);
  // });

  it("handles gameplay close/reopen", async done => {
    closeReopenAt("Buy: Copper", done);
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

