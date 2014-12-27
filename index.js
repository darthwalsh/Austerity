function $(id) {
  return document.getElementById(id);
}

function log(text) {
  $("log").value += text + "\n";
}

function slog(text) {
  if(isServer){
    $("manageLog").value += text + "\n";
  }
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
      $("startButton").disabled = Object.keys(players).length < 2;
    } 

    socket.addEventListener('message', function(e) {
      var data = JSON.parse(e.data)
      switch (data.type) {
        case "connect":
          //TODO what if name already signed in?
          players[socket.socketId_] = new Player(data.name, socket);
          slog(data.name + " connected");
          updateStartButton();
          break;
        case "choose":
          slog(players[socket.socketId_].name + ": " + data.choice);
          break;
        case "chat":
          var message = { 
            type: "message",
            message: players[socket.socketId_].name + ": " + data.message
          }
          for(var id in players) {
            players[id].socket.send(JSON.stringify(message));
          }
          break;
        default:
          console.error("Not implemenented: " + data.type);
      }
    });

    socket.addEventListener('close', function() {
      var player = players[socket.socketId_];
      if (player) {
        slog(player.name + " disconnected");
        delete players[socket.socketId_];
        updateStartButton();
      } else {
        slog("Unknown left!");
      }
    });
    return true;
  });
}


document.addEventListener('DOMContentLoaded', function() {
  if(isServer) {
    var manageDiv = $("manage");
    
    var startButton = document.createElement("button");
    startButton.innerHTML = "Start";
    startButton.disabled = true;
    startButton.id = "startButton";
    startButton.onclick = function() {
      slog("Starting!!!");
      var choice = {
        type:"choice",
        choices: ["Copper", "Silver", "Curse"] 
      };
      for(var id in players) {
        players[id].socket.send(JSON.stringify(choice));
      }
    };
    
    var manageLog = document.createElement("textarea");
    manageLog.readOnly = true;
    manageLog.id = "manageLog";
    
    manageDiv.appendChild(startButton);
    manageDiv.appendChild(document.createElement("p"));
    manageDiv.appendChild(manageLog);
  }
  
  setTimeout(function() { 
  slog("Port " + port);
  var address = isServer ? 
    "ws://localhost:" + port + "/" : //TODO works?
    window.location.href.replace("http", "ws");
  var name = $("name");
  name.addEventListener('keydown', function(e) {
    if (e.keyCode == 13) {
      var data = {type: "connect", name: name.value};
      ws.send(JSON.stringify(data));
      name.disabled = true;
    }
  });
  
  var input = $("input");
  var ws = new WebSocket(address);
  ws.addEventListener("open", function() {
    log("Connected to Server");
  });
  ws.addEventListener('close', function() {
    log('Connection to Server lost');
    input.disabled = true;
  });
  ws.addEventListener('message', function(e) {
    var data = JSON.parse(e.data);
    switch(data.type) {
      case "message":
        log(data.message);
        break;
      case "choice":
        var cc = data.choices;
        var cDiv = $("choices");
        for(var i = 0; i < cc.length; ++i) {
          var button = document.createElement("button");
          button.innerHTML = cc[i];
          button.onclick = function() {
            var ans = {type:"choose",choice:this.innerHTML};
            ws.send(JSON.stringify(ans));
            log(this.innerHTML); // TODO send back and remove buttons
            while(cDiv.firstChild)
              cDiv.removeChild(cDiv.firstChild);
          };
          cDiv.appendChild(button);
        };
        break;
      default:
        console.error("Not implemenented: " + data.type); 
    }
  });
  input.addEventListener('keydown', function(e) {
    if (ws && ws.readyState == 1 && e.keyCode == 13) {
      var data = {type: "chat", message: input.value};
      ws.send(JSON.stringify(data));
      input.value = '';
    }
  });
}, isServer ? 1000 : 0)}); //Mitigate race condition in starting webServer?
