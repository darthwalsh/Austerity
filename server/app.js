const Server = require("./server");

const options = {
  port: process.env.PORT,
};
if (process.argv.includes("--trivialShuffle")) {
  options.trivialShuffle = true;
}

const server = new Server();
server.listen(options);
