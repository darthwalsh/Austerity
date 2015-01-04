function Game(log, store) {
  this.log = log;
  this.store = new Store();
  this.players = {}; // socketId -> Player
  this.playersChanged = null;
  this.trash = [];
}

Game.prototype = {
  canStart: function() {
    //TODO Game of 1 is only fun for debugging
    return Object.keys(this.players).length >= 1;
  },

  start: function(debugMode) {
    var t = this;
    ps = Object.keys(this.players).map(function(n){return t.players[n]});

    if(debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.alllog("!!!!!!\n" + ps[0].name + " IS CHEATING\n!!!!!!");
    }

    var turn = 0;
    var nextTurn = function() {
      if (t.store.gameOver()) {
        var result = "GAME OVER!!!\r\n";
        result += ps
          .sort(function(a, b) { return b.getPoints() - a.getPoints() }) //descending
          .map(function(p){ return p.name + ": " + p.getPoints();})
          .join("\r\n");
        t.alllog(result);
        return;
      }

      ++turn;
      ps[turn % ps.length].takeTurn(nextTurn);
    };

    ps[turn].takeTurn(nextTurn);
  },

  addConnection: function(socket) {
    var me;
    socket.addEventListener('message', util.wrapErrors(function(e) {
      var data = JSON.parse(e.data);
      var type = Object.keys(data)[0];
      data = data[type];
      switch(type) {
      case "connect":
          //TODO what if name already signed in?
          me = new Player(data, socket);
          this.players[socket.socketId_] = me;
          this.log(data + " connected");
          this.playersChanged();
          break;
        case "choice":
          me.onChoice(data);
          break;
        case "chat":
          this.alllog(me.name + ": " + data);
          break;
        default:
          console.error("Not implemenented: " + type);
      }
    }.bind(this)));

    socket.addEventListener('close', util.wrapErrors(function() {
      var player = this.players[socket.socketId_];
      if (player) {
        this.log(player.name + " disconnected");
        delete this.players[socket.socketId_];
        this.playersChanged();
      }
    }.bind(this)));
  },

  alllog: function(text) {
    for(var id in this.players) {
      this.players[id].sendMessage(text);
    }
  }
}

for(var name in Game.prototype)
  Game.prototype[name] = util.wrapErrors(Game.prototype[name]);