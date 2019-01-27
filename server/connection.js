class Connection {
  constructor(ws) {
    this.ws = ws;
    this.name = "NoName";
    const socketHandler = data => {
      data = JSON.parse(data.data);
      const type = Object.keys(data)[0];
      data = data[type];
      switch (type) {
      case "name":
        this.name = data;
        return;
      case "choice":
        this.onChoice(data);
        return;
      }
    };
    this.ws.addEventListener("message", socketHandler);
    this.close = () => this.ws.removeEventListener("message", socketHandler);
  }

  // TODO maybe merge into Player's implementation of sendChoice?
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
      handleChoice.call(this, choice);
    };
    this.ws.send(JSON.stringify({choices: choices}));
  }
}

exports.Connection = Connection;
