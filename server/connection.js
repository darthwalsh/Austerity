/**
 * @typedef { import("ws") } WebSocket
 */

class Connection {
  /**
   * @param {WebSocket} ws
   */
  constructor(ws) {
    this.ws = ws;
    /** @type {string} */
    this.name = "NoName";
    this.sentChoices = null;

    this.messageHandlers = {
      choice: /** @param {string} data */ data => this.onChoice(data),
      name: /** @param {string} data */ data => {
        this.name = data;
      },
      chat: /** @param {string} data */ data => {},
    };

    this.initListeners();
  }

  initListeners() {
    this.ws.addEventListener("message", data => {
      const o = JSON.parse(data.data);
      const type = Object.keys(o)[0];
      const content = o[type];
      const handler = this.messageHandlers[type];
      if (!handler) {
        throw new Error(`missing handler ${type}`);
      }
      handler(content);
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
    });
  }

  // TODO(E2E) should test disconnecting both during your turn, and during somebody else's turn
  /**
   * @param {WebSocket} ws
   */
  newConnection(ws) {
    ws.onmessage = null;
    ws.onclose = null;
    this.ws = ws;
    this.initListeners();
  }

  resendChoices() {
    if (this.onChoice) {
      this.ws.send(this.sentChoices);
    }
  }

  /**
   * @param {object} data
   */
  send(data) {
    if (!this.connected) {
      if (typeof data.message !== "undefined") {
        return;
      }
      throw new Error("Player is disconnected");
    }
    if (data.choices) {
      throw new Error("Use choose() instead!");
    }
    this.ws.send(JSON.stringify(data));
  }

  /**
   * @param {string[]} choices
   * @return {Promise<string>}
   */
  choose(choices) {
    return new Promise(resolve => {
      if (!choices.length) {
        throw new Error("EMPTY CHOICE!!!");
      }
      if (this.onChoice) {
        throw new Error("onChoice wasn't empty!!!");
      }

      this.sentChoices = JSON.stringify({choices});

      this.onChoice = /** @param {string} choice */ choice => {
        if (!choices.includes(choice)) {
          this.send({message: `"${choice}" not a valid choice of "${choices}"!!!`});
          this.resendChoices();
          return;
        }

        this.onChoice = null;
        resolve(choice);
      };

      if (this.connected) { // If player is disconnected, they will get choices sent if/when they reconnect
        this.ws.send(this.sentChoices);
      }
    });
  }

  get connected() {
    const READY_STATE_OPEN = 1;
    return this.ws && this.ws.readyState === READY_STATE_OPEN;
  }
}

module.exports = Connection;
