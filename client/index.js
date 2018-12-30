function $(id) {
  return document.getElementById(id);
}

function $input(id) {
  return /** @type {HTMLInputElement} */ ($(id));
}

function log(text) {
  $("log").textContent += text + "\n";
  $("log").scrollTop = $("log").scrollHeight;
}

function addManage(options, ws) {
  const manageDiv = $("manage");

  for (let i = 0; i < options.length; ++i) {
    const id = "optional" + options[i];

    const box = document.createElement("input");
    box.setAttribute("type", "checkbox");
    box.setAttribute("id", id);
    manageDiv.appendChild(box);

    const label = document.createElement("label");
    label.innerText = options[i];
    label.htmlFor = id;
    manageDiv.appendChild(label);
  }

  manageDiv.appendChild(document.createElement("br"));

  const manageLog = document.createElement("textarea");
  manageLog.readOnly = true;
  manageLog.id = "manageLog";

  const startButton = document.createElement("button");
  startButton.innerHTML = "Start";
  // startButton.disabled = true; //TODO(NODE) figure out players / game.playersChanged
  startButton.id = "startButton";
  startButton.onclick = () => {
    const included = options.filter(n => $input("optional" + n).checked);
    const debugMode = $input("debugMode").checked;

    while (manageDiv.firstChild !== manageLog)
      manageDiv.removeChild(manageDiv.firstChild);

    ws.send(JSON.stringify({gameStart: {included, debugMode}}));
  };

  manageDiv.appendChild(startButton);

  const debugBox = document.createElement("input");
  debugBox.setAttribute("type", "checkbox");
  debugBox.setAttribute("id", "debugMode");
  manageDiv.appendChild(debugBox);

  const debugLabel = document.createElement("label");
  debugLabel.innerText = "Debug";
  debugLabel.htmlFor = "debugMode";
  manageDiv.appendChild(debugLabel);

  manageDiv.appendChild(document.createElement("br"));

  manageDiv.appendChild(manageLog);
}

window.onload = () => {
  const address = window.location.href.replace("http", "ws");
  const name = $input("name");
  const connectButton = $input("connectButton");
  const connect = () => {
    ws.send(JSON.stringify({connect: name.value}));
    name.disabled = true;
    connectButton.disabled = true;
    input.disabled = false;
  };

  name.addEventListener("keydown", e => {
    if (e.keyCode == 13) {
      connect();
    }
  });
  connectButton.onclick = connect;

  let turnAlert;
  const input = $input("input");
  const ws = new WebSocket(address);
  ws.addEventListener("open", () => log("Connected to Server"));
  ws.addEventListener("close", () => {
    log("Connection to Server lost");
    input.disabled = true;
  });
  ws.addEventListener("message", e => {
    let data = JSON.parse(e.data);
    const type = Object.keys(data)[0];
    data = data[type];

    const choicesDiv = $("choices");
    const choiceOnClick = function() {
      ws.send(JSON.stringify({choice: this.innerHTML}));
      while (choicesDiv.firstChild)
        choicesDiv.removeChild(choicesDiv.firstChild);
    };

    switch (type) {
    case "message":
      log(data);
      break;
    case "choices":
      for (let i = 0; i < data.length; ++i) {
        if (data[i] === "\n") {
          choicesDiv.appendChild(document.createElement("br"));
        } else {
          const button = document.createElement("button");
          button.innerHTML = data[i];
          button.onclick = choiceOnClick;
          choicesDiv.appendChild(button);
        }
      }
      $("log").scrollTop = $("log").scrollHeight;
      if (document.hasFocus && !document.hasFocus()) {
        if (!turnAlert) {
          turnAlert = new Audio("Computer Error Alert from SoundBible.com.mp3");
        }
        // Audio need to reload sound before each play
        // http://stackoverflow.com/a/8959342/771768
        turnAlert.load();
        turnAlert.play();
      }
      break;
    case "isLeader":
      addManage(data, ws);
      break;
    default:
      console.error("Not implemented: " + type);
    }
  });
  input.addEventListener("keydown", e => {
    if (ws && ws.readyState == 1 && e.keyCode == 13) {
      ws.send(JSON.stringify({chat: input.value}));
      input.value = "";
    }
  });
};
