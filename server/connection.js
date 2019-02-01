class Connection {
  constructor(ws) {
    this.ws = ws;
    this.name = "NoName";

    this.messageHandlers = {};
    this.messageHandlers.choice = data => this.onChoice(data);
    this.messageHandlers.name = data => this.name = data;

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
  }

  /**
   * @param {object} data
   */
  send(data) {
    if (data.choices) {
      throw new Error("Use sendChoices instead!");
    }
    this.ws.send(JSON.stringify(data));
  }

  /**
   * @param {string[]} choices
   * @param {function} handleChoice
   */
  sendChoice(choices, handleChoice) {
    if (!choices.length) {
      console.error("EMPTY CHOICE!!!");
    }
    if (this.onChoice) {
      console.error("onChoice wasn't empty!!!");
    }
    this.onChoice = choice => {
      this.onChoice = null;
      handleChoice(choice);
    };
    this.ws.send(JSON.stringify({choices: choices}));
  }
}

exports.Connection = Connection;
