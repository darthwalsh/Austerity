class Connection {
  constructor(ws) {
    this.ws = ws;
    this.name = "NoName";
    this.listeners = {};
    this.initListener();
  }

  initListener() {
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
    this.addEventListener("message", socketHandler);
    this.close = () => this.removeEventListener("message", socketHandler);
  }

  addEventListener(method, listener) {
    if (this.listeners[method]) {
      throw new Error(`${method} already in listeners`);
    }
    this.listeners[method] = listener;
    this.ws.addEventListener(method, listener);
  }

  removeEventListener(method, listener) {
    if (!this.listeners[method]) {
      throw new Error(`${method} doesn't exist in listeners`);
    }
    this.ws.removeEventListener(method, listener);
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
