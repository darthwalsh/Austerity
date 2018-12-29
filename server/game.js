const Store = require("./store").Store;
const cards = require("./cards");
const Player = require("./player").Player;

class Game {
  constructor(log) {
    this.log = log;
    this.store = new Store();
    this.players = {}; // name -> Player
    this.playersChanged = () => { }; //TODO(NODE-TURNS)
    this.trash = [];
  }

  canStart() {
    //TODO Game of 1 is only fun when debugging
    return Object.keys(this.players).length >= 1;
  }

  start(debugMode) {
    const t = this;
    const ps = this.allPlayers();

    if(debugMode) {
      Array.prototype.push.apply(ps[0].hand, this.store.getAvailable(99));
      ps[0].sendHand();
      this.allLog("!!!!!!\n" + ps[0].name + " IS CHEATING\n!!!!!!");
    }

    let turn = Math.floor(Math.random() * ps.length);
    const nextTurn = function() {
      if (t.store.gameOver()) {
        let result = "GAME OVER!!!\r\n";
        result += ps
          .sort(function(a, b) { return b.getPoints() - a.getPoints(); }) //descending
          .map(function(p){ return p.name + ": " + p.getPoints() + "\n    " +
            p.allCards()
              .filter(function(c){return c.ofKind("property")||c.ofKind("curse");})
              .map(function(c){return c.name;})
              .sort()
              .toString();})
          .join("\r\n");
        t.allLog(result);
        return;
      }

      ++turn;
      ps[turn % ps.length].takeTurn(nextTurn);
    };

    ps[turn].takeTurn(nextTurn);
  }

  addConnection(ws) {
    let me;
    ws.on("message", function(data) {
      data = JSON.parse(data);
      const type = Object.keys(data)[0];
      data = data[type];
      switch(type) {
      case "connect":
        //TODO what if name already signed in?
        me = new Player(data, ws, this);
        this.players[data] = me;
        this.log(data + " connected");
        this.playersChanged();
        if (Object.keys(this.players).length == 1) {
          me.send({isLeader: this.store.optional()});
        }
        break;
      case "choice":
        me.onChoice(data);
        break;
      case "chat":
        this.allLog(me.name + ": " + data);
        break;
      case "gameStart":
        this.store.setIncluded(data.included.map(n => cards[n]));
        this.start(data.debugMode);
        break;
      default:
        console.error("Not implemented: " + type);
      }
    }.bind(this));

    ws.on("close", function() {
      const player = this.players[me.name];
      if (player) {
        this.log(player.name + " disconnected");
        delete this.players[me.name];
        this.playersChanged();
      }
    }.bind(this));
  }

  allPlayers() {
    const t = this;
    return Object.keys(this.players)
      .map(function(n){return t.players[n];});
  }

  otherPlayers(player) {
    return this.allPlayers().filter(function(p){return p.name !== player.name;});
  }

  parallelAttack(player, attackThenCallBack, callback) {
    const others = this.otherPlayers(player);
    let attacksLeft = others.length;
    if(!attacksLeft) {
      callback();
      return;
    }
    const attackDone = function() {
      if(! --attacksLeft) {
        callback();
      }
    };
    others.forEach(function(p) {
      p.attacked(function() {
        attackThenCallBack(p, attackDone);
      }, attackDone);
    });
  }

  sequentialAttack(player, attackThenCallBack, callback) {
    const ps = this.allPlayers();

    if(ps.length == 1) {
      callback();
      return;
    }

    const pi = ps.indexOf(player);
    let i = (pi + 1) % ps.length;

    const attackDone = function() {
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
  }

  allLog(text) {
    for(const id in this.players) {
      this.players[id].sendMessage(text);
    }
  }
}

module.exports.Game = Game;
