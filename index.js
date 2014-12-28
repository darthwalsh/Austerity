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
      $("startButton").disabled = Object.keys(players).length < 1;
      //TODO Game of 1 is only fun for debugging
    } 

    var alllog = function(text) {
      for(var id in players) {
        players[id].send({message: text});
      } 
    }

    var me;
    socket.addEventListener('message', function(e) {
      var data = JSON.parse(e.data);
      var type = Object.keys(data)[0];
      data = data[type];
      switch(type) {
      case "connect":
          //TODO what if name already signed in?
          me = new Player(data, socket);
          players[socket.socketId_] = me;
          slog(data + " connected");
          updateStartButton();
          break;
        case "choice":
          me.onChoice(data);
          break;
        case "chat":
          alllog(me.name + ": " + data);
          break;
        default:
          console.error("Not implemenented: " + type);
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
      startButton.disabled = true;
      for(var id in players) {
        players[id].takeTurn();
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
  ws.addEventListener("open", function() {
    log("Connected to Server");
  });
  ws.addEventListener('close', function() {
    log('Connection to Server lost');
    input.disabled = true;
  });
  ws.addEventListener('message', function(e) {
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
          var button = document.createElement("button");
          button.innerHTML = cc[i];
          button.onclick = function() {
            ws.send(JSON.stringify({choice:this.innerHTML}));
            while(cDiv.firstChild)
              cDiv.removeChild(cDiv.firstChild);
          };
          cDiv.appendChild(button);
        };
        break;
      default:
        console.error("Not implemenented: " + type); 
    }
  });
  input.addEventListener('keydown', function(e) {
    if (ws && ws.readyState == 1 && e.keyCode == 13) {
      ws.send(JSON.stringify({chat: input.value}));
      input.value = '';
    }
  });
}, isServer ? 1000 : 0)}); //Mitigate race condition in starting webServer?
