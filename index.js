function log(text) {
  document.getElementById("log").value += text + "\n";
}

var port = 8888;
var isServer = false;

var Player = function (name, socket) {
  this.name = name;
  this.socket = socket;
  this.cards = [];
}

if (http.Server && http.WebSocketServer) {
  isServer = true;
  
  var server = new http.Server();
  var wsServer = new http.WebSocketServer(server);
  server.listen(port);
  
  server.addEventListener('request', function(req) {
    var url = req.headers.url;
    if (url == '/')
      url = '/index.html'; //TODO needed?
    req.serveUrl(url);
    return true;
  });
  
  var players = {}; // id -> Player

  wsServer.addEventListener('request', function(req) {
    var socket = req.accept();
    
    var updateStartButton = function() {
      document.getElementById("startButton").disabled = 
        Object.keys(players).length < 2;
    } 

    socket.addEventListener('message', function(e) {
      var data = JSON.parse(e.data)
      switch (data.type) {
        case "connect":
          players[socket.socketId_] = new Player(data.name, socket);
          log(data.name + " connected");
          updateStartButton();
          break;
        case "choose":
          log(data.choice);
          break
        default:
          console.error("Not implemenented: " + data.type);
      }
    });

    socket.addEventListener('close', function() {
      var player = players[socket.socketId_];
      if (player) {
        log(player.name + " disconnected");
        delete players[socket.socketId_];
        updateStartButton();
      } else {
        log("Unknown left!");
      }
    });
    return true;
  });
}


document.addEventListener('DOMContentLoaded', function() {
  if(isServer) {
    var manageDiv = document.getElementById("manage");
    var startButton = document.createElement("button");
    startButton.innerHTML = "Start";
    startButton.disabled = true;
    startButton.id = "startButton";
    startButton.onclick = function() {
      log("Starting!!!")
    }
    manageDiv.appendChild(startButton);
  }
  
  setTimeout(function() { 
  log("Port " + port);
  var address = isServer ? 
    "ws://localhost:" + port + "/" : //TODO works?
    window.location.href.replace("http", "ws");
  var name = document.getElementById("name");
  name.addEventListener('keydown', function(e) {
    if (e.keyCode == 13) {
      var data = {type: "connect", name: name.value};
      ws.send(JSON.stringify(data));
      name.disabled = true;
    }
  });
  
  var input = document.getElementById("input");
  var ws = new WebSocket(address);
  ws.addEventListener("open", function() {
    log("Connected to Server");
  });
  ws.addEventListener('close', function() {
    log('Connection to Server lost');
    input.disabled = true;
  });
  ws.addEventListener('message', function(e) {
    log(e.data);
  });
  input.addEventListener('keydown', function(e) {
    if (ws && ws.readyState == 1 && e.keyCode == 13) {
      var data = {type: "choose", choice: input.value};
      ws.send(JSON.stringify(data));
      input.value = '';
    }
  });
}, isServer ? 1000 : 0)}); //Mitigate race condition in starting webServer?
