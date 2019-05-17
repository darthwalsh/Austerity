/* global describe afterEach it expect */

const fs = require("fs");
const path = require("path");

const Lib = require("../cli/lib");
const Server = require("../server/server");

const url = "http://localhost:8080";

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


class ManualPlayer {
  constructor(name = "p1") {
    this.name = name;
    this.lib = /** @type {Lib} */ (null);
  }

  /**
   * @param {(function(string[]): string | Promise<string>)[]} actions
   * @return {Promise<Lib>}
   */
  play(actions) {
    return new Promise((res, rej) => {
      let i = 0;
      this.lib = new Lib(url, choices => {
        if (i === actions.length) {
          res(this.lib);
          return new Promise((res, rej) => {/* black-hole lib instance */});
        }
        const action = actions[i++];

        const ret = action(choices);
        return typeof ret === "string" ? Promise.resolve(ret) : ret;
      }, _ => { });
      this.lib.connect(this.name);
    });
  }
}


describe("e2e", () => {
  const server = new Server();
  server.listen({trivialShuffle: true});
  afterEach(() => server.lobby.clearGames());

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
        return new Promise((res, rej) => {/* black-hole lib instance */}); // TODO manual player?
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

  it("p2 joins, leaves lobby", async done => {
    await p2JoinsThenLeaveLobby(done, true);
  });

  it("p2 joins, starts to leave lobby", async done => {
    await p2JoinsThenLeaveLobby(done, false);
  });
});

async function p2JoinsThenLeaveLobby(done, waitForClose) {
  const p1 = await new ManualPlayer().play([
    _ => "New Game",
    async _ => {
      await new Promise((res, rej) => {
        const p2 = new Lib(url, bigMoney, line => {
          if (line === "message: Waiting for the leader to start the game") {
            p2.close();
            if (waitForClose) {
              // Wait for close timeouts to run before game starts
              setTimeout(res, 10); // ugly hack, but as long as it works...
            } else {
              res();
            }
          }
        });
        p2.connect("p2");
      });
      return "Moat";
    },
    _ => "Play All Treasures",
  ]);
  p1.close();
  done();
}

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

