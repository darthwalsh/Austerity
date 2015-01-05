
describe("cards", function () {
  it("plays Copper", function () {
    var p = new Player("Bot", {send: console.log});
    
    cards.Copper.play(p, function() {
      console.log("Callback!");
    });
  });
});