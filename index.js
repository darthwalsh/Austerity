function $(id) {
  return document.getElementById(id);
}

function log(text) {
  $("log").value += text + "\n";
  $("log").scrollTop = $("log").scrollHeight;
}

function slog(text) {
  if(isServer){
    $("manageLog").value += text + "\n";
    $("manageLog").scrollTop = $("manageLog").scrollHeight;
  }
}

var port = 8888;
var isServer = false;
var game = new Game(slog);
var store = new Store();

game.playersChanged = function() {
  $("startButton").disabled = !game.canStart();
};

if (http.Server && http.WebSocketServer) {
  isServer = true;

  var server = new http.Server();
  var wsServer = new http.WebSocketServer(server);
  server.listen(port);

  server.addEventListener('request', util.wrapErrors(function(req) {
    var url = req.headers.url;
    if (url == '/')
      url = '/index.html';
    req.serveUrl(url);
    return true;
  }));

  wsServer.addEventListener('request', util.wrapErrors(function(req) {
    game.addConnection(req.accept());
    return true;
  }));
}


document.addEventListener('DOMContentLoaded', function() {
  if(isServer) {
    var manageDiv = $("manage");

    var options = store.optional();
    for(var i = 0; i < options.length; ++i) {
      var id = "optional" + options[i];

      var box = document.createElement("input");
      box.setAttribute("type", "checkbox");
      box.setAttribute("id", id);
      manageDiv.appendChild(box);

      var label = document.createElement("label");
      label.innerText = options[i];
      label.htmlFor = id;
      manageDiv.appendChild(label);
    }

    manageDiv.appendChild(document.createElement("br"));

    var manageLog = document.createElement("textarea");
    manageLog.readOnly = true;
    manageLog.id = "manageLog";

    var startButton = document.createElement("button");
    startButton.innerHTML = "Start";
    startButton.disabled = true;
    startButton.id = "startButton";
    startButton.onclick = function() {
      store.setIncluded(store.optional().filter(function(n) {
        return $("optional" + n).checked;
      }).map(function(n) {
        return cards[n];
      }))

      while (manageDiv.firstChild !== manageLog)
        manageDiv.removeChild(manageDiv.firstChild);
      game.start();
    };

    manageDiv.appendChild(startButton);

    manageDiv.appendChild(document.createElement("br"));

    manageDiv.appendChild(manageLog);
  }

  setTimeout(function() {
  slog("Port " + port);
  var address = isServer ?
    "ws://localhost:" + port + "/" :
    window.location.href.replace("http", "ws");
  var name = $("name");
  name.addEventListener('keydown', function(e) {
    if (e.keyCode == 13) {
      ws.send(JSON.stringify({connect: name.value}));
      name.disabled = true;
    }
  });

  var input = $("input");
  var ws = new WebSocket(address);
  ws.addEventListener("open", util.wrapErrors(function() {
    log("Connected to Server");
  }));
  ws.addEventListener('close', util.wrapErrors(function() {
    log('Connection to Server lost');
    input.disabled = true;
  }));
  ws.addEventListener('message', util.wrapErrors(function(e) {
    var data = JSON.parse(e.data);
    var type = Object.keys(data)[0];
    data = data[type];
    switch(type) {
      case "message":
        log(data);
        break;
      case "choices":
        //TODO if server can send a stream of choices
        // then the client has to queue them
        var cc = data;
        var cDiv = $("choices");
        for(var i = 0; i < cc.length; ++i) {
          if(cc[i] === "\n") {
            cDiv.appendChild(document.createElement("br"));
          }
          else {
            var button = document.createElement("button");
            button.innerHTML = cc[i];
            button.onclick = function() {
              ws.send(JSON.stringify({choice:this.innerHTML}));
              while(cDiv.firstChild)
                cDiv.removeChild(cDiv.firstChild);
            };
            cDiv.appendChild(button);
          }
        }
        $("log").scrollTop = $("log").scrollHeight;
        break;
      default:
        console.error("Not implemenented: " + type);
    }
  }));
  input.addEventListener('keydown', util.wrapErrors(function(e) {
    if (ws && ws.readyState == 1 && e.keyCode == 13) {
      ws.send(JSON.stringify({chat: input.value}));
      input.value = '';
    }
  }));
}, isServer ? 100 : 0)}); //Mitigate race condition in starting webServer?
