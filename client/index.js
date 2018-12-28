function $(id) {
  return document.getElementById(id);
}

function log(text) {
  $("log").value += text + "\n";
  $("log").scrollTop = $("log").scrollHeight;
}

const port = 8888;
let isServer = false;

if (typeof http !== "undefined" && http.Server && http.WebSocketServer) {
  isServer = true;

  const server = new http.Server();
  const wsServer = new http.WebSocketServer(server);
  server.listen(port);

  server.addEventListener("request", util.wrapErrors(function(req) {
    let url = req.headers.url;
    if (url == "/")
      url = "/index.html";
    req.serveUrl(url);
    return true;
  }));

  wsServer.addEventListener("request", util.wrapErrors(function(req) {
    game.addConnection(req.accept());
    return true;
  }));
}


window.onload = function() {
  if(isServer) {
    const manageDiv = $("manage");

    const options = game.store.optional();
    for(let i = 0; i < options.length; ++i) {
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
    startButton.disabled = true;
    startButton.id = "startButton";
    startButton.onclick = function() {
      game.store.setIncluded(game.store.optional().filter(function(n) {
        return $("optional" + n).checked;
      }).map(function(n) {
        return cards[n];
      }));

      const debugMode = $("debugMode").checked;
      while (manageDiv.firstChild !== manageLog)
        manageDiv.removeChild(manageDiv.firstChild);
      game.start(debugMode);
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

  const address = isServer ?
    "ws://localhost:" + port + "/" :
    window.location.href.replace("http", "ws");
  const name = $("name");
  const connectButton = $("connectButton");
  const connect = function() {
    ws.send(JSON.stringify({connect: name.value}));
    name.disabled = true;
    connectButton.disabled = true;
    input.disabled = false;
  };

  name.addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
      connect();
    }
  });
  connectButton.onclick = connect;

  let turnAlert;
  const input = $("input");
  const ws = new WebSocket(address);
  ws.addEventListener("open", () => log("Connected to Server"));
  ws.addEventListener("close", () => {
    log("Connection to Server lost");
    input.disabled = true;
  });
  ws.addEventListener("message", (e) => {
    let data = JSON.parse(e.data);
    const type = Object.keys(data)[0];
    data = data[type];

    const choicesDiv = $("choices");
    const choiceOnClick = function() {
      ws.send(JSON.stringify({choice: this.innerHTML}));
      while(cDiv.firstChild)
        cDiv.removeChild(cDiv.firstChild);
    };

    switch(type) {
    case "message":
      log(data);
      break;
    case "choices":
      for(let i = 0; i < data.length; ++i) {
        if(data[i] === "\n") {
          choicesDiv.appendChild(document.createElement("br"));
        }
        else {
          const button = document.createElement("button");
          button.innerHTML = data[i];
          button.onclick = choiceOnClick;
          choicesDiv.appendChild(button);
        }
      }
      $("log").scrollTop = $("log").scrollHeight;
      if(document.hasFocus && !document.hasFocus()) {
        if (!turnAlert) {
          turnAlert = new Audio("Computer Error Alert from SoundBible.com.mp3");
        }
        // Audio need to reload sound before each play
        // http://stackoverflow.com/a/8959342/771768
        turnAlert.load();
        turnAlert.play();
      }
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
