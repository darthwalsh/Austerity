function $(id) {
  return document.getElementById(id);
}

function $input(id) {
  return /** @type {HTMLInputElement} */ ($(id));
}

/**
 * Splits text like "Your hand: Copper, Silver, Gold"
 * Into text and colored span elements
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

  const elems = parts.map(t => {
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

function addManage(options, ws) {
  const CARD_COUNT = 10;

  const manageDiv = $("manage");

  for (let i = 0; i < options.length; ++i) {
    const id = "optional" + options[i];

    const box = document.createElement("input");
    box.setAttribute("type", "checkbox");
    box.setAttribute("id", id);

    const label = document.createElement("label");
    label.style.whiteSpace = "nowrap";
    label.append(box, options[i]);
    manageDiv.append(label, " ");
  }

  manageDiv.appendChild(document.createElement("br"));

  const randomButton = document.createElement("button");
  randomButton.innerText = "Randomize";
  randomButton.onclick = () => {
    const randomOptions = options.slice();
    while (randomOptions.length > CARD_COUNT) {
      randomOptions.splice(Math.floor(Math.random() * randomOptions.length), 1);
    }
    options.forEach(n => {
      $input("optional" + n).checked = Boolean(randomOptions.includes(n));
    });
  };
  manageDiv.appendChild(randomButton);

  const clearButton = document.createElement("button");
  clearButton.innerText = "Clear";
  clearButton.onclick = () => {
    options.forEach(n => $input("optional" + n).checked = false);
  };
  manageDiv.appendChild(clearButton);

  const countText = document.createElement("span");
  countText.innerText = "0 Selected";
  manageDiv.onclick = () => {
    const count = options.filter(n => $input("optional" + n).checked).length;
    countText.innerText = `${count} Selected`;

    if (count === CARD_COUNT) {
      startButton.style.color = "black";
      startButton.style.fontWeight = "bold";
    } else {
      startButton.style.color = "darkgrey";
      startButton.style.fontWeight = "";
      // Button still works if you want to try on nonstandard game, but looks disabled
    }
  };
  manageDiv.appendChild(countText);

  const startButton = document.createElement("button");
  startButton.innerHTML = "Start";
  startButton.onclick = e => {
    const included = options.filter(n => $input("optional" + n).checked);
    const debugMode = $input("debugMode").checked;

    while (manageDiv.firstChild) {
      manageDiv.removeChild(manageDiv.firstChild);
    }

    ws.send(JSON.stringify({gameStart: {included, debugMode}}));

    e.stopPropagation();
  };

  manageDiv.appendChild(startButton);

  const debugBox = document.createElement("input");
  debugBox.setAttribute("type", "checkbox");
  debugBox.setAttribute("id", "debugMode");
  manageDiv.appendChild(debugBox);

  const debugLabel = document.createElement("label");
  debugLabel.innerText = "Debug";
  debugLabel.htmlFor = "debugMode";
  manageDiv.appendChild(debugLabel);
}

let colors = {};
let colorBreak = /(?=a)b/; // null regex which won't match anything
window.onload = () => {
  const address = window.location.href.replace("http", "ws");
  const name = $input("name");
  name.value = localStorage.getItem("name") || "";
  name.addEventListener("input", () => {
    localStorage.setItem("name", name.value);
    ws.send(JSON.stringify({name: name.value}));
  });

  const helpOverlay = $("helpOverlay");
  helpOverlay.onclick = () => helpOverlay.style.display = "none";
  $("help").onclick = () => helpOverlay.style.display = "";

  let turnAlert;
  const chat = $input("chat");
  const ws = new WebSocket(address);
  ws.addEventListener("open", () => {
    log("Connected to Server");
    chat.disabled = false;
    ws.send(JSON.stringify({name: name.value}));
  });
  ws.addEventListener("close", () => {
    log("Connection to Server lost");
    chat.disabled = true;
  });
  ws.addEventListener("message", e => {
    let data = JSON.parse(e.data);
    const type = Object.keys(data)[0];
    data = data[type];

    switch (type) {
    case "message":
      log(data);
      break;
    case "choices":
      const choicesDiv = $("choices");
      const choiceOnClick = event => {
        ws.send(JSON.stringify({choice: event.target.innerHTML}));
        while (choicesDiv.firstChild) {
          choicesDiv.removeChild(choicesDiv.firstChild);
        }
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
      $("log").scrollTop = $("log").scrollHeight;
      if (document.hasFocus && !document.hasFocus()) {
        if (!turnAlert) {
          turnAlert = new Audio("Computer Error Alert from SoundBible.com.mp3");
        }
        // Audio need to reload sound before each play
        // http://stackoverflow.com/a/8959342/771768
        turnAlert.load();
        turnAlert.play().catch(_ => {/* whatever*/});
      }
      break;
    case "isLeader":
      addManage(data, ws);
      break;
    case "colors":
      colors = data;
      // Create a regex like \bCopper|Silver|Gold\b
      colorBreak = new RegExp(`\\b${Object.keys(colors).join("|")}\\b`, "g");
      break;
    case "included":
      while (helpOverlay.firstElementChild) {
        helpOverlay.removeChild(helpOverlay.firstElementChild);
      }
      for (const cardName of data) {
        const jpg = document.createElement("img");
        jpg.width = 200;
        jpg.height = 320;
        jpg.src = `/cards/${cardName}.jpg`;
        helpOverlay.appendChild(jpg);
      }
      break;
    default:
      throw new Error("Not implemented: " + type);
    }
  });
  chat.addEventListener("keydown", e => {
    if (ws && ws.readyState === 1 && e.keyCode === 13) {
      ws.send(JSON.stringify({chat: chat.value}));
      chat.value = "";
    }
  });
};

// Maybe remove this after winning each game, then restore?
window.onbeforeunload = e => "Don't leave the game hanging!";
