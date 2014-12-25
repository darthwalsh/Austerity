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
    console.log("code: " + code + " Error listening:" + chrome.runtime.lastError.message);
    return;
  }
  serverSocketId = id;
  chrome.sockets.tcpServer.onAccept.addListener(onAccept);
  chrome.sockets.tcpServer.onAcceptError.addListener(function() { 
    console.log("onAcceptError");
  });
}

function onAccept(info) {
  if (info.socketId != serverSocketId) {
    console.log("onAccept !=");
    return;
  }
  
  chrome.sockets.tcp.onReceive.addListener(function(recvInfo) {
    if (recvInfo.socketId != info.clientSocketId) {
      console.log("onRecieve !=");
      return;
    }
    var request = new TextDecoder("utf-8").decode(new DataView(recvInfo.data));
    var lines = request.split(/[\n\r]+/);
    console.log(lines[0]);
  });
  
  chrome.sockets.tcp.onReceiveError.addListener(function(errorInfo) {
    console.log("onReceiveError:" + errorInfo.resultCode);
    chrome.sockets.tcp.disconnect(info.clientSocketId, function() {
      console.log("disconnected");
    })
  });
  
  chrome.sockets.tcp.setPaused(info.clientSocketId, false, function() {
    console.log("unpaused");
  });

  var response = "HTTP/1.1 200 OK\r\n" + 
  "Content-Type: text/plain; charset=UTF-8\r\n" + 
  "\r\n" + 
  "Hello world";
  var bytes = new TextEncoder("utf-8").encode(response);
  chrome.sockets.tcp.send(info.clientSocketId, bytes.buffer,
    function(sendInfo) {
      console.log(sendInfo.bytesSent + " bytes sent to new TCP client connection.");
      chrome.sockets.tcp.close(info.clientSocketId);

  });
  
}
