const util = require("./util");
const Store = require("./store").Store;
const Player = require("./player").Player;

function Game(log) {
  this.log = log;
  this.store = new Store();
  this.players = {}; // name -> Player
  this.playersChanged = () => {}; //TODO(NODE-TURNS)
  this.trash = [];
  this.turn = -1;
}

Game.prototype = {
  canStart: function() {
    //TODO Game of 1 is only fun when debugging
    return Object.keys(this.players).length >= 1;
  },

  start: function(debugMode, name) {
    var t = this;
    ps = this.allPlayers();

    if(debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.alllog("!!!!!!\n" + ps[0].name + " IS CHEATING\n!!!!!!");
    }

    this.turn = Math.floor(Math.random() * ps.length);
    var nextTurn = function() {
      if (t.store.gameOver()) {
        var result = "GAME OVER!!!\r\n";
        result += ps
          .sort(function(a, b) { return b.getPoints() - a.getPoints(); }) //descending
          .map(function(p){ return p.name + ": " + p.getPoints() + "\n    " +
            p.allCards()
              .filter(function(c){return c.ofKind("property")||c.ofKind("curse");})
              .map(function(c){return c.name;})
              .sort()
              .toString();})
          .join("\r\n");
        t.alllog(result);
        chrome.storage.local.remove(name);
        return;
      }

      ++t.turn;
      ps[t.turn % ps.length].takeTurn(nextTurn);
      
      var toStore = {};
      toStore[name] = t;
      chrome.storage.local.set(toStore);
    };

    ps[this.turn].takeTurn(nextTurn);
  },

  addConnection: function(ws) {
    var me;
    ws.on("message", util.wrapErrors(function(data) {
      var data = JSON.parse(data);
      var type = Object.keys(data)[0];
      data = data[type];
      switch(type) {
      case "connect":
          //TODO what if name already signed in?
          me = new Player(data, ws);
          this.players[name] = me;
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
          console.error("Not implemented: " + type);
      }
    }.bind(this)));

    ws.on("close", util.wrapErrors(function() {
      var player = this.players[me.name];
      if (player) {
        this.log(player.name + " disconnected");
        delete this.players[me.name];
        this.playersChanged();
      }
    }.bind(this)));
  },

  allPlayers: function() {
    var t = this;
    return Object.keys(this.players)
      .map(function(n){return t.players[n];});
  },

  otherPlayers: function(player) {
    return this.allPlayers().filter(function(p){return p.name !== player.name;});
  },

  parallelAttack: function(player, attackThenCallBack, callback) {
    var others = this.otherPlayers(player);
    var attacksLeft = others.length;
    if(!attacksLeft) {
      callback();
      return;
    }
    var attackDone = function() {
      if(! --attacksLeft) {
        callback();
      }
    };
    others.forEach(function(p) {
      p.attacked(function() {
        attackThenCallBack(p, attackDone);
      }, attackDone);
    });
  },

  sequentialAttack: function(player, attackThenCallBack, callback) {
    var ps = this.allPlayers();

    if(ps.length == 1) {
      callback();
      return;
    }

    var pi = ps.indexOf(player);
    var i = (pi + 1) % ps.length;

    var attackDone = function() {
      i = (i + 1) % ps.length;

      if (i == pi) {
        callback();
        return;
      }

      ps[i].attacked(function() {
        attackThenCallBack(ps[i], attackDone);
      }, attackDone);
    };

    ps[i].attacked(function() {
      attackThenCallBack(ps[i], attackDone);
    }, attackDone);
  },

  alllog: function(text) {
    for(var id in this.players) {
      this.players[id].sendMessage(text);
    }
  }
};

for(var name in Game.prototype)
  Game.prototype[name] = util.wrapErrors(Game.prototype[name]);

module.exports.Game = Game;
