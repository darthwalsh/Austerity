window.addEventListener("load", function() {
  document.getElementById("startButton")
          .addEventListener("click", StartServer, false);
}, false);

function StartServer() {
  var port = document.getElementById("portNumber").value;
  document.getElementById("debug").innerHTML = "Starting: " + port;
  
  chrome.sockets.tcpServer.create({}, onCreate);
}

//TODO chrome.sockets.tcpServer.create({}, onCreate);

function onCreate(info) {
  var id = info.socketId;
  chrome.sockets.tcpServer.listen(id,
    "127.0.0.1", 
    8888, // Can't listen on lower ports
    function(code) {
      onListen(id, code)
  });
}

var serverSocketId;
function onListen(id, code) {
  if (code < 0) {
    console.log("Error listening:" + chrome.runtime.lastError.message);
    return;
  }
  serverSocketId = id;
  chrome.sockets.tcpServer.onAccept.addListener(onAccept);
}

function onAccept(info) {
  if (info.socketId != serverSocketId)
    return;
  
  /*var response = "HTTP/1.1 200 OK\r\n" + 
  "Content-Type: text/plain; charset=UTF-8\r\n" + 
  "\r\n" + 
  "Hello world!";
  var bytes = new TextEncoder("utf-8").encode(response);
  chrome.sockets.tcp.send(info.clientSocketId, bytes,
    function(resultCode) {
      console.log("Data sent to new TCP client connection.")
  });*/
  
  chrome.sockets.tcp.onReceive.addListener(function(recvInfo) {
    if (recvInfo.socketId != info.clientSocketId)
      return;
    var request = new TextDecoder("utf-8").decode(recvInfo.data);
    var lines = request.split(/[\n\r]+/);
  });
  
  chrome.sockets.tcp.onReceiveError.addListener(function(errorInfo) {
    console.log(errorInfo.resultCode);
  });
  chrome.sockets.tcp.setPaused(false);
}
