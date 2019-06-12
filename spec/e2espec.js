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
    "Platinum",
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

class CuriousBot {
  constructor() {
    this.seen = /** @type {Map<string, number>} */ (new Map());

    // Limit buying cheap cards
    this.limitChoice = [
      "Buy: Copper",
      "Buy: Estate",
      "Buy: Chapel",
      "Buy: Moat",
    ];
  }

  count(choice) {
    return this.seen.get(choice) || 0;
  }

  /**
   * @param {string[]} choices
   */
  async choose(choices) {
    choices = choices.filter(c => c !== "\n");
    choices = choices.filter(c => !(this.limitChoice.includes(c) && this.count(c) > 0));
    choices.sort((a, b) => this.count(a) - this.count(b));
    const choice = choices[0];

    this.seen.set(choice, this.count(choice) + 1);
    return choice;
  }
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
      const p1 = new Lib(url,
        wrapWithLogging(bigMoney, output),
        logUntilGameOver(output, res));
      p1.connect("p1");
    });

    checkOutput("SoloBigMoney.txt", output);
    done();
  });

  it("multiplayer", async done => {
    const output = [];

    await new Promise((res, rej) => {
      let joined = false;
      let p1 = null, p2 = null;
      const dedupedStrategy = new CuriousBot(); // Use same backing storage for p1 and p2
      const strategy = wrapWithLogging(choices => dedupedStrategy.choose(choices), output);
      const joiningStrategy = async choices => {
        if (!joined && choices.length > 20) {
          await new Promise((rr, _) => {
            p2 = new Lib(url, wrapWithLogging(choices => {
              const joinGame = choices.filter(c => c.endsWith("'s game"))[0];
              if (joinGame) {
                // Ugly hack, but as long as it works...
                setTimeout(() => {
                  bypassSockets(server, [p1, p2]);
                  rr();
                }, 10);
                return Promise.resolve(joinGame);
              }
              return dedupedStrategy.choose(choices);
            }, output), logUntilGameOver(output, res));
            p2.connect("Ape");
            joined = true;
          });

          return choices.join(" ");
        }
        return strategy(choices);
      };

      p1 = new Lib(url, joiningStrategy, logUntilGameOver(output, res));
      p1.connect("Monkey");
    });

    fs.writeFileSync(path.join(__dirname, "Multiplayer.txt"), output.join("\r\n"));
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

/**
 * @param {function(string[]): Promise<string>} strategy
 * @param {string[]} output
 * @return {function(string[]): Promise<string>}
 */
function wrapWithLogging(strategy, output) {
  return /** @param {string[]} choices */ async choices => {
    const result = await strategy(choices);
    if (choices.length > 30) {
      choices = ["SNIP_FOR_STABILITY!"];
    }
    output.push(`Choices: ${choices.map(c => c === "\n" ? "\\n" : c).join(", ")}`);
    output.push(`Chose: ${result}`);
    return result;
  };
}

function logUntilGameOver(output, res) {
  return line => {
    expect(line.includes("\n")).toBeFalsy();
    if (line.startsWith("included:")) {
      line = "included: SNIP_FOR_STABILITY!";
    }
    output.push(line);
    if (line.includes("GAME OVER!!!")) {
      res();
    }
  };
}

function checkOutput(name, output) {
  const transcript = path.join(__dirname, name);
  output.push(""); // trailing new line
  const expected = fs.existsSync(transcript) ?
    fs.readFileSync(transcript, {encoding: "utf8"}).split(/\r?\n/) :
    ["<File didn't exist>"];
  if (output !== expected) {
    fs.writeFileSync(transcript, output.join("\r\n")); // re-baseline the test data for next run
  }
  expectArrayEqual(output, expected);
}

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

class MockWebSocket {
  constructor() {
    this.readyState = 1;
    this.handlers = [];
    this.otherHandlers = [];
  }

  addEventListener(name, handler) {
    switch (name) {
    case "message": this.handlers.push(handler); return;
    case "open": setTimeout(handler, 0);
    }
  }

  removeEventListener(name, handler) {
    if (name !== "message") {
      throw new Error(name);
    }
    this.handlers.splice(this.handlers.indexOf(handler), 1);
  }

  send(data) {
    if (typeof data !== "string") {
      throw new Error(data);
    }
    this.otherHandlers.forEach(f => f({data}));
  }

  static newPair() {
    const a = new MockWebSocket(), b = new MockWebSocket;
    [a.otherHandlers, b.otherHandlers] = [b.handlers, a.handlers];
    return [a, b];
  }
}

/**
 * @param {Server} server
 * @param {Lib[]} clients
 */
function bypassSockets(server, clients) {
  const names = Object.keys(server.lobby.games);
  if (names.length !== 1) {
    throw new Error("not single game");
  }
  const game = server.lobby.games[names[0]];
  for (const client of clients) {
    client.ws.close();
    const conn = game.players[client.name].connection;
    conn.ws.close();
    const [clientMock, serverMock] = /** @type {any[]} */ (MockWebSocket.newPair());
    conn.newConnection(serverMock);
    client.ws = clientMock;
    client.initWS();
  }
}

/**
 * @param {any[]} output
 * @param {any[]} expected
 */
function expectArrayEqual(output, expected) {
  for (let i = 0; i < Math.min(output.length, expected.length); ++i) {
    if (output[i] !== expected[i]) { // Quick check for perf
      expect(`[${i+1}] ${output[i]}`).toEqual(`[${i+1}] ${expected[i]}`);
    }
  }
  expect(output.length).toEqual(expected.length);
}

