function Game(log) {
  this.players = {}; // socketId -> Player
  this.log = log;
  this.playersChanged = null;
}

Game.prototype = {
  canStart: function() {
    //TODO Game of 1 is only fun for debugging
    return Object.keys(this.players).length >= 1;
  },

  start: function() {
    var t = this;
    ps = Object.keys(this.players).map(function(n){return t.players[n]});
    var turn = 0;

    var nextTurn = function() {
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
      this.players[id].send({message: text});
    }
  }
}

// Loudly fail so nobody can try-catch these errors
for(var name in Game.prototype)
  Game.prototype[name] = util.wrapErrors(Game.prototype[name]);