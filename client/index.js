import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, onValue, set, child } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://carlwa-default-rtdb.firebaseio.com",
};
const app = initializeApp(firebaseConfig);
const db = ref(getDatabase(app), "austerity");

let stopListeningToLobby;
function listenToLobby() {
  // TODO call addManage if your own game shows up here, which allows for reconnecting to your own game?
  // TODO then creating a game should call listenToGameEvents() on your own game!
  const unsubscribe = onValue(child(db, "lobby"), async (snapshot) => {
    const lobbyData = snapshot.val();
    if (lobbyData) {
      stopListeningToLobby();
      const gameId = await handleChoices(Object.keys(lobbyData));
      if (!gameId) {
        // Choices not handled yet, wait for another call.
        return;
      }
      listenToGameEvents(gameId);
    }
  });

  return () => {
    // TODO(cleanup) not sure if this is too ugly
    unsubscribe();
    removeChildren($("choices"));
  };
}

function listenToGameEvents(gameId) {
  const gameRef = child(child(db, "games"), gameId);
  // const gameRef = child(child(db, "games", gameId));
  onValue(gameRef, (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      // TODO pass back into game engine
      // TODO create game engine that has callback
      console.log(gameData);
    }
  });
}

function initializeGame(gameId, initData) {
  set(child(child(child(db, "games"), gameId), "init"), initData);
}
// let gameId = TODO needed?

function $(id) {
  return document.getElementById(id);
}

function $input(id) {
  return /** @type {HTMLInputElement} */ ($(id));
}

/**
 * @param {HTMLElement} e
 */
function removeChildren(e) {
  while (e.firstChild) {
    e.removeChild(e.firstChild);
  }
}

/**
 * Splits text like "Your hand: Copper, Silver, Gold"
 * into text and colored span elements
 * @param {string} text
 */
function log(text) {
  // Splits text like /
  const parts = /** @type {string[]} */ ([]);
  const regex = new RegExp(colorBreak); // Copy to allow exec iteration
  let match = null;
  let prevIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    parts.push(text.substring(prevIndex, match.index));
    parts.push(match["0"]);
    prevIndex = match.index + match["0"].length;
  }
  parts.push(text.substring(prevIndex, text.length));

  const elems = parts.map((t) => {
    const color = colors[t];
    if (!color) {
      return t;
    }
    const span = document.createElement("span");
    span.textContent = t;
    span.style.color = color;
    span.style.fontWeight = "bold";
    return span;
  });

  $("log").append(...elems, document.createElement("br"));
  $("log").scrollTop = $("log").scrollHeight;
}

/**
 * @param {string} cardName
 * @param {HTMLElement} e
 */
function addCardImage(cardName, e) {
  const jpg = document.createElement("img");
  jpg.style.width = "200";
  jpg.style.maxWidth = "50%";
  jpg.style.height = "auto";
  jpg.src = `/cards/${cardName}.jpg`;
  e.appendChild(jpg);
}

const CARD_COUNT = 10;

function updateSelected() {
  const optionsChecked = options.filter((n) => $input("optional" + n).checked);
  $("countText").innerText = `${optionsChecked.length} Selected`;

  const startButton = $("startButton");
  if (optionsChecked.length === CARD_COUNT) {
    startButton.style.color = "black";
    startButton.style.fontWeight = "bold";
  } else {
    startButton.style.color = "darkgrey";
    startButton.style.fontWeight = "";
    // Button still works if you want to try on nonstandard game, but looks disabled
  }

  const helpSelected = $("helpSelected");
  removeChildren(helpSelected);
  optionsChecked.forEach((c) => addCardImage(c, helpSelected));
  helpSelected.style.marginBottom = optionsChecked.length ? "20px" : "";

  localStorage.setItem("options", JSON.stringify(optionsChecked));
}

let options = /** @type {string[]} */ ([]);

/**
 * @param {Object<string, string[]>} data
 */
function addManage(gameId, data) {
  const manageDiv = $("manage");

  options = Object.values(data).flatMap((d) => d);
  let optionsFromStorage = [];
  try {
    optionsFromStorage = JSON.parse(localStorage.getItem("options"));
  } catch (e) {
    // If for some reason this fails, it's not important to warn the user.
  }
  const optionSet = new Set(optionsFromStorage);

  for (const set in data) {
    const setOptions = data[set];
    if (!setOptions.length) {
      continue;
    }

    const setHeader = document.createElement("span");
    setHeader.textContent = set;
    setHeader.style.color = "grey";
    manageDiv.append(setHeader);
    manageDiv.appendChild(document.createElement("br"));

    for (const option of setOptions) {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.id = "optional" + option;
      box.checked = optionSet.has(option);

      const label = document.createElement("label");
      label.style.whiteSpace = "nowrap";
      label.append(box, option);
      manageDiv.append(label, " ");
    }

    manageDiv.appendChild(document.createElement("br"));
  }

  const randomButton = document.createElement("button");
  randomButton.innerText = "Randomize";
  randomButton.onclick = () => {
    const selected = options.filter((n) => $input("optional" + n).checked);
    const randomPicked = new Set(selected.length < CARD_COUNT ? selected : []);
    const remainingOptions = options.filter((o) => !randomPicked.has(o));
    while (randomPicked.size < CARD_COUNT) {
      const removed = remainingOptions.splice(
        Math.floor(Math.random() * remainingOptions.length),
        1
      );
      randomPicked.add(removed[0]);
    }
    options.forEach((n) => {
      $input("optional" + n).checked = randomPicked.has(n);
    });
  };
  manageDiv.appendChild(randomButton);

  const clearButton = document.createElement("button");
  clearButton.innerText = "Clear";
  clearButton.onclick = () => {
    options.forEach((n) => ($input("optional" + n).checked = false));
  };
  manageDiv.appendChild(clearButton);

  const countText = document.createElement("span");
  countText.id = "countText";
  countText.innerText = "0 Selected";
  manageDiv.onclick = updateSelected;
  manageDiv.appendChild(countText);

  const startButton = document.createElement("button");
  startButton.id = "startButton";
  startButton.innerHTML = "Start";
  startButton.onclick = (e) => {
    const included = options.filter((n) => $input("optional" + n).checked);
    const debugMode = $input("debugMode").checked;

    removeChildren(manageDiv);
    const helpSelected = $("helpSelected");
    removeChildren(helpSelected);
    helpSelected.style.marginBottom = "0";

    // TODO(RNG) include a start player
    initializeGame(gameId, { included, debugMode });

    // ws.send(JSON.stringify({ gameStart: { included, debugMode } }));

    e.stopPropagation();
  };

  manageDiv.appendChild(startButton);

  const debugBox = document.createElement("input");
  debugBox.type = "checkbox";
  debugBox.id = "debugMode";
  manageDiv.appendChild(debugBox);

  const debugLabel = document.createElement("label");
  debugLabel.innerText = "Debug";
  debugLabel.htmlFor = "debugMode";
  manageDiv.appendChild(debugLabel);

  updateSelected();
}

function updateChoicesDisabled() {
  const disabled = !$input("name").value;
  for (const button of $("choices").children) {
    const input = /** @type {HTMLInputElement} */ (button);
    input.disabled = disabled;
  }
}

const colors = {};
const colorBreak = /(?=a)b/; // null regex which won't match anything
window.onload = () => {
  const name = $input("name");
  name.value = localStorage.getItem("name") || "";
  name.addEventListener("input", () => {
    localStorage.setItem("name", name.value);
    // ws.send(JSON.stringify({ name: name.value }));

    updateChoicesDisabled();
  });

  const helpOverlay = $("helpOverlay");
  helpOverlay.onclick = () => (helpOverlay.style.display = "none");
  $("help").onclick = () => (helpOverlay.style.display = "");

  $("createGame").onclick = () => {
    const createButton = /** @type {HTMLButtonElement} */ ($("createGame")); 
    createButton.disabled = true;

    const gameId = `${name.value}'s game`; // TODO(security) could be crypto-random???
    set(child(child(db, "lobby"), gameId), {
      gameId,
      created: Date.now(), // TODO(cleanup) trim old entries from the lobby?
    });
    const mockCards = { // TODO(engine)
      "Base": ["Copper", "Silver", "Gold"],
      "Prosperity": ["Bank", "Bishop"],
    };
    addManage(gameId, mockCards);
  };
  stopListeningToLobby = listenToLobby();

  log("Connected to sync backend");
  // TODO(chat) - removed old WebSocket code
  // false && ws.addEventListener("message", (e) => {
  //   let data = JSON.parse(e.data.toString());
  //   const type = Object.keys(data)[0];
  //   data = data[type];

  //   switch (type) {
  //     case "message":
  //       log(data);
  //       break;
  //     case "choices":
  //       const choose = handleChoices(data);
  //       console.error("TODO" + choose);
  //       break;
  //     case "isLeader":
  //       // addManage(data, ws);
  //       break;
  //     case "colors":
  //       colors = data;
  //       // Create a regex like \bCopper|Silver|Gold\b
  //       colorBreak = new RegExp(`\\b${Object.keys(colors).join("|")}\\b`, "g");
  //       break;
  //     case "included":
  //       const helpCards = $("helpCards");
  //       removeChildren(helpCards);
  //       data.forEach((cardName) => addCardImage(cardName, helpCards));
  //       break;
  //     default:
  //       throw new Error("Not implemented: " + type);
  //   }
  // });
  // TODO(chat)
  // chat.addEventListener("keydown", (e) => {
  //   if (ws && ws.readyState === 1 && e.keyCode === 13) {
  //     ws.send(JSON.stringify({ chat: chat.value }));
  //     chat.value = "";
  //   }
  // });
};

let turnAlert;
async function handleChoices(data) {
  const choicesDiv = $("choices");
  if (choicesDiv.firstChild) {
    throw new Error("TODO re-entrant call to handleChoices");
    // Maybe keep a global AbortController to cancel the previous call?
  }
  
  return new Promise((resolve) => {
    const choiceOnClick = (event) => {
      removeChildren(choicesDiv);
      resolve(event.target.innerHTML);
    };
    
    for (const choice of data) {
      if (choice === "\n") {
        choicesDiv.appendChild(document.createElement("br"));
      } else {
        const button = document.createElement("button");
        button.innerHTML = choice;
        const color = colors[choice];
        if (color) {
          button.style.color = color;
        }
        button.style.fontWeight = "bold";
        button.onclick = choiceOnClick;
        choicesDiv.appendChild(button);
      }
    }
    
    updateChoicesDisabled();
    $("log").scrollTop = $("log").scrollHeight;
    if (document.hasFocus && !document.hasFocus()) {
      if (!turnAlert) {
        turnAlert = new Audio("Computer Error Alert from SoundBible.com.mp3");
      }
      // Audio need to reload sound before each play
      // http://stackoverflow.com/a/8959342/771768
      turnAlert.load();
      turnAlert.play().catch((_) => {});
    }
  });
}

// Maybe remove this after winning each game, then restore?
// TODO(cleanup) restore this
// window.onbeforeunload = (e) => "Don't leave the game hanging!";
