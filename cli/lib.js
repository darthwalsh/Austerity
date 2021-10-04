const WebSocket = require("ws");

class lib {
  /**
   * @param {string} url
   * @param {(choices: string[]) => Promise<string>} readline
   * @param {(line: string) => void} log
   */
  constructor(url, readline, log) {
    this.ws = new WebSocket(url);
    this.log = log;
    this.open = false;
    this.readline = readline;
    this.initWS();
  }

  initWS() {
    this.opened = new Promise((res, rej) => {
      this.ws.addEventListener("open", () => {
        this.open = true;
        res();
      });
    });

    this.ws.addEventListener("close", () => {
      this.open = false;
      this.log("Connection to Server lost");
    });

    this.ws.addEventListener("message", async e => {
      let data = JSON.parse(e.data.toString());
      const type = Object.keys(data)[0];
      data = data[type];

      switch (type) {
        case "choices":
          const choice = await this.readline(data);
          this.send({choice});
          break;
        case "isLeader":
          data = Object.values(data).flatMap(d => d);
          const included = (await this.readline(data)).split(" ");
          const debugMode = false;
          this.send({gameStart: {included, debugMode}});
          break;
        default:
          this.log(`${type}: ${data}`);
      }
    });
  }

  /**
   * @param {string} name
   */
  async connect(name) {
    if (this.open) {
      throw new Error("Already open");
    }
    this.name = name;
    await this.opened;
    this.send({name});
  }

  close() {
    this.ws.close();
  }

  /**
   * @param {object} o
   */
  send(o) {
    this.ws.send(JSON.stringify(o));
  }
}

module.exports = lib;
