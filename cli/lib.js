import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, child, push, update } from "firebase/database";

// TODO import ../server/game.js

const firebaseConfig = {
  databaseURL: "https://carlwa-default-rtdb.firebaseio.com",
};

class lib {
  /**
   * @param {(choices: string[]) => Promise<string>} readline
   * @param {(line: string) => void} log
   */
  constructor(readline, log) {
    this.connected = "TODO"

    this.log = log;
    this.readline = readline;
    this.playerId = null;
    this.gameRef = null;
    this.playerRef = null;
    
    this.app = initializeApp(firebaseConfig);
    this.database = getDatabase(this.app);
    // Match the database structure from index.js
    this.db = ref(this.database, "austerity");
    
    // Initialize Firebase listeners
    this.initFirebase();
  }

  initFirebase() {
    // Listen for game updates
    this.gameRef = ref(this.database, "games/default");
    onValue(this.gameRef, async (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) return;

      // Handle different game events
      if (gameData.choices && gameData.choices[this.playerId]) {
        const choice = await this.readline(gameData.choices[this.playerId]);
        this.sendChoice(choice);
      }

      if (gameData.isLeader && gameData.isLeader[this.playerId]) {
        const leaderData = Object.values(gameData.isLeader).flatMap(d => d);
        const included = (await this.readline(leaderData)).split(" ");
        const debugMode = false;
        this.sendGameStart(included, debugMode);
      }

      // Log other game updates
      Object.keys(gameData).forEach(key => {
        if (!['choices', 'isLeader'].includes(key)) {
          this.log(`${key}: ${JSON.stringify(gameData[key])}`);
        }
      });
    });
  }

  initWS() {
    this.opened = new Promise((res, rej) => {
      this.ws.addEventListener("open", () => {
        this.open = true;
        res();
      });
    });

    this.ws.addEventListener("close", () => {
      this.open = false;
      this.log("Connection to Server lost");
    });

    this.ws.addEventListener("message", async e => {
      let data = JSON.parse(e.data.toString());
      const type = Object.keys(data)[0];
      data = data[type];

      switch (type) {
        case "choices":
          const choice = await this.readline(data);
          this.send({choice});
          break;
        case "isLeader":
          data = Object.values(data).flatMap(d => d);
          const included = (await this.readline(data)).split(" ");
          const debugMode = false;
          this.send({gameStart: {included, debugMode}});
          break;
        default:
          this.log(`${type}: ${data}`);
      }
    });
  }

  /**
   * @param {string} player
   * @param {string} game
   */
  async connect(player, game) {
    if (this.open) {
      throw new Error("Already open");
    }
    this.name = player;
    await this.opened;
    this.send({name: player});
  }

  close() {
    this.ws.close();
  }

  /**
   * @param {object} o
   */
  send(o) {
    this.ws.send(JSON.stringify(o));
  }
}

export default lib;
