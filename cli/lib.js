const WebSocket = require("ws");

class lib {
  /**
   * @param {string} url
   * @param {function(string): Promise<string>} readline
   * @param {function(string): void} log
   */
  constructor(url, readline, log) {
    this.ws = new WebSocket(url);
    this.log = log;
    this.open = false;

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
      let data = JSON.parse(e.data);
      const type = Object.keys(data)[0];
      data = data[type];

      // TODO handle "isLeader" choice to send gameStart
      switch (type) {
      case "choices":
        // TODO fix this for all case blocks
        // eslint-disable-next-line no-case-declarations
        const choice = await readline(data.join(" / ") + ":\n");
        this.send({choice});
        break;
      default:
        this.log(`${type}: ${data}`);
      }
    });
  }
  async connect(name) {
    if (this.open) {
      throw new Error("Already open");
    }
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
