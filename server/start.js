function StartServer() {
  var port = document.getElementById("portNumber").value;
  document.getElementById("debug").innerHTML = "Debugging: " + port;
  console.log(port);
}

window.addEventListener("load", function()
{
  document.getElementById("startButton")
          .addEventListener("click", StartServer, false);
}, false);