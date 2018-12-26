const express = require('express');
const ws = require('ws');

const port = 8080;
const app = express();
app.use(express.static('client'))
var server = app.listen(port, () => console.log(`Example HTTP app listening on port ${port}!`))

const wss = new ws.Server({ server })

// // Broadcast to all.
// wss.broadcast = function broadcast(data) {
//   wss.clients.forEach(function each(client) {
//     if (client.readyState === ws.OPEN) {
//       client.send(data);
//     }
//   });
// };

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    const parsed = JSON.parse(data);
    const type = Object.keys(parsed)[0];
    const contents = parsed[type];
    switch (type)  {
      case "connect":
          console.warn("choice not implemented");
          break;
        case "choice":
          console.warn("choice not implemented");
          break;
        case "chat":
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify({message:contents}));
            }
          });
          break;
        default:
          console.error("Not implemented: " + type);
      }
  });
});