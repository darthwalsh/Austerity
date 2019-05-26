/* global describe it expect fail */

const fs = require("fs");
const path = require("path");
const cards = require("../server/cards");
const Game = require("../server/game");
const Player = require("../server/player");

const defaultTest = {
  dMoney: 0,
  dActions: 0,
  dBuys: 0,
  points: 0,
  draw: [],
  discard: [],
  hand: [],
  interactions: [],
  drawAfter: [],
  discardAfter: [],
  handAfter: [],
  playedAfter: [],

  others: [],

  store: [],
  storeCounts: {},
  trashAfter: [],

  alsoPlay: [],
};

const defaultOthers = {
  draw: [],
  discard: [],
  hand: [],
  interactions: [],
  drawAfter: [],
  discardAfter: [],
  handAfter: [],
};

const tests = {
  Copper: {
    dMoney: 1,
  },
  Silver: {
    dMoney: 2,
  },
  Gold: {
    dMoney: 3,
  },

  Estate: {
    points: 1,
  },
  Duchy: {
    points: 3,
  },
  Province: {
    points: 6,
  },
  Curse: {
    points: -1,
  },


  Adventurer: {
    draw: ["Copper", "Village", "Silver"],
    hand: [],

    interactions: [
      "ALL: Bot revealed Silver",
      "ALL: Bot revealed Village",
      "ALL: Bot revealed Copper",
    ],

    discardAfter: ["Village"],
    handAfter: ["Copper", "Silver"],
  },

  Adventurer_None: {
    draw: ["Village", "Estate", "Duchy"],
    hand: [],

    interactions: [
      "ALL: Bot revealed Duchy",
      "ALL: Bot revealed Estate",
      "ALL: Bot revealed Village",
    ],

    discardAfter: ["Duchy", "Estate", "Village"],
    handAfter: [],
  },

  Adventurer_Discard: {
    draw: [],
    discard: ["Copper"],
    hand: [],

    interactions: [
      "ALL: Bot revealed Copper",
    ],

    discardAfter: [],
    handAfter: ["Copper"],
  },

  Adventurer_Extra: {
    draw: ["Estate", "Copper", "Village", "Silver"],
    hand: [],

    interactions: [
      "ALL: Bot revealed Silver",
      "ALL: Bot revealed Village",
      "ALL: Bot revealed Copper",
    ],

    drawAfter: ["Estate"],
    discardAfter: ["Village"],
    handAfter: ["Copper", "Silver"],
  },

  Artisan: {
    draw: [],
    hand: ["Silver", "Gold"],
    interactions: [
      "Gain a card to your hand:",
      ["Copper", "Silver", "Estate", "Duchy", "Curse"],
      "Copper",
      "ALL: Bot gained Copper",
      "Put a card from your hand back to your deck:",
      ["Silver", "Gold", "Copper"],
      "Silver",
    ],
    drawAfter: ["Silver"],
    handAfter: ["Copper", "Gold"],
    discardAfter: [],
  },

  Bandit: {
    interactions: [
      "ALL: Bot gained Gold",
      "ALL: Other#0 revealed Silver",
      "ALL: Other#0 revealed Gold",
      "ALL: Other#0 trashed Silver",
    ],
    others: [{
      draw: ["Gold", "Silver"],
      interactions: [
        "Choose a treasure to trash:",
        ["Silver", "Gold"],
        "Silver",
      ],
      discardAfter: ["Gold"],
    }],
    discardAfter: ["Gold"],
    trashAfter: ["Silver"],
  },

  Bandit_OneTreasure: {
    interactions: [
      "ALL: Bot gained Gold",
      "ALL: Other#0 revealed Silver",
      "ALL: Other#0 revealed Copper",
      "ALL: Other#0 trashed Silver",
    ],
    others: [{
      draw: ["Copper", "Silver"],
      interactions: [
        "Choose a treasure to trash:",
        ["Silver"],
        "Silver",
      ],
      discardAfter: ["Copper"],
    }],
    discardAfter: ["Gold"],
    trashAfter: ["Silver"],
  },

  Bandit_NoTreasure: {
    interactions: [
      "ALL: Bot gained Gold",
      "ALL: Other#0 revealed Copper",
    ],
    others: [{
      draw: ["Copper"],
      discardAfter: ["Copper"],
    }],
    discardAfter: ["Gold"],
  },

  Bureaucrat: {
    discardAfter: ["Silver"],

    interactions: [
      "ALL: Bot gained Silver",
      "ALL: Other#0 revealed Estate and put it onto their deck",
    ],

    others: [{
      hand: ["Copper", "Silver", "Gold", "Estate", "Duchy"],
      interactions: [
        "Put a Victory card onto your deck:",
        ["Estate", "Duchy"],
        "Estate",
      ],
      handAfter: ["Copper", "Silver", "Gold", "Duchy"],
      drawAfter: ["Estate"],
    }],
  },

  Bureaucrat_NoVictory: {
    discardAfter: ["Silver"],

    interactions: [
      "ALL: Bot gained Silver",
      "ALL: Other#0 revealed Copper, Silver, Gold",
    ],

    others: [{
      hand: ["Copper", "Silver", "Gold"],
      handAfter: ["Copper", "Silver", "Gold"],
    }],
  },

  Cellar: {
    dActions: 1,
    draw: ["Silver", "Village"],
    discard: [],
    hand: ["Copper", "Gold"],
    interactions: [
      "Discard cards:",
      ["Copper", "Gold", "Done Discarding"],
      "Copper",
      "Discard cards:",
      ["Gold", "Done Discarding"],
      "Gold",
    ],
    drawAfter: [],
    discardAfter: ["Copper", "Gold"],
    handAfter: ["Silver", "Village"],
  },

  Cellar_Done: {
    dActions: 1,
    draw: ["Silver"],
    discard: [],
    hand: ["Copper"],
    interactions: [
      "Discard cards:",
      ["Copper", "Done Discarding"],
      "Done Discarding",
    ],
    drawAfter: ["Silver"],
    discardAfter: [],
    handAfter: ["Copper"],
  },

  Chancellor: {
    dMoney: 2,
    draw: ["Silver"],
    interactions: [
      "Discard your draw pile?",
      ["No", "Discard"],
      "Discard",
    ],
    drawAfter: [],
    discardAfter: ["Silver"],
  },

  Chancellor_No: {
    dMoney: 2,
    draw: ["Silver"],
    interactions: [
      "Discard your draw pile?",
      ["No", "Discard"],
      "No",
    ],
    drawAfter: ["Silver"],
  },

  Chapel: {
    hand: ["Copper", "Silver", "Gold", "Chapel", "Village"],
    interactions: [
      "Trash up to 4 cards:",
      ["Copper", "Silver", "Gold", "Chapel", "Village", "Done Trashing"],
      "Copper",
      "ALL: Bot trashed Copper",
      "Trash up to 3 cards:",
      ["Silver", "Gold", "Chapel", "Village", "Done Trashing"],
      "Gold",
      "ALL: Bot trashed Gold",
      "Trash up to 2 cards:",
      ["Silver", "Chapel", "Village", "Done Trashing"],
      "Village",
      "ALL: Bot trashed Village",
      "Trash up to 1 cards:",
      ["Silver", "Chapel", "Done Trashing"],
      "Chapel",
      "ALL: Bot trashed Chapel",
    ],
    handAfter: ["Silver"],
    trashAfter: ["Copper", "Gold", "Village", "Chapel"],
  },

  Chapel_Done: {
    hand: ["Copper"],
    interactions: [
      "Trash up to 4 cards:",
      ["Copper", "Done Trashing"],
      "Done Trashing",
    ],
    handAfter: ["Copper"],
    trashAfter: [],
  },

  CouncilRoom: {
    dBuys: 1,
    draw: ["Village", "Estate", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Silver", "Gold", "Estate"],

    others: [{
      draw: ["Copper", "Silver"],
      hand: [],
      drawAfter: ["Copper"],
      handAfter: ["Silver"],
    }],
  },

  CouncilRoom_Self: {
    dBuys: 1,
    draw: ["Village", "Estate", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Silver", "Gold", "Estate"],

    others: [],
  },

  Feast: {
    interactions: [
      "Gain a card:",
      ["Copper", "Silver", "Estate", "Duchy", "Curse"],
      "Copper",
      "ALL: Bot gained Copper",
      "ALL: Bot trashed Feast",
    ],
    handAfter: [],
    discardAfter: ["Copper"],
    trashAfter: ["Feast"],
    playedAfter: [],
  },

  ThroneRoom_Feast_OneTrash: {
    hand: ["Feast"],
    interactions: [
      "Pick an Action card to double:",
      ["Feast"],
      "Feast",
      "ALL: Bot played Feast doubled!",
      "Gain a card:",
      ["Copper", "Silver", "Estate", "Duchy", "Curse"],
      "Copper",
      "ALL: Bot gained Copper",
      "Gain a card:",
      ["Copper", "Silver", "Estate", "Duchy", "Curse"],
      "Silver",
      "ALL: Bot gained Silver",
      "ALL: Bot trashed Feast",
    ],
    handAfter: [],
    discardAfter: ["Copper", "Silver"],
    playedAfter: ["ThroneRoom"],
    trashAfter: ["Feast"],
  },

  Festival: {
    dActions: 2,
    dBuys: 1,
    dMoney: 2,
  },

  Gardens: {
    points: 1,
    hand: ["Copper", "Silver", "Gold", "Village"],
    draw: ["Copper", "Silver", "Gold"],
    discard: ["Copper", "Silver", "Gold"],
  },

  Gardens_Rounding: {
    points: 0,
    hand: [
      "Copper", "Silver", "Gold", "Village", "Smithy",
      "Copper", "Silver", "Gold", "Village",
    ],
  },

  Harbinger: {
    dActions: 1,
    hand: [],
    draw: ["Copper", "Silver"],
    discard: ["Village", "Gold", "Gold", "Smithy"],

    interactions: [
      "Choose a card from your discard to put on your deck:",
      ["Village", "Gold", "Smithy", "None of these"],
      "Smithy",
    ],

    handAfter: ["Silver"],
    drawAfter: ["Copper", "Smithy"],
    discardAfter: ["Village", "Gold", "Gold"],
  },

  Harbinger_None: {
    dActions: 1,
    hand: [],
    draw: ["Copper", "Silver"],
    discard: ["Village", "Gold", "Smithy"],

    interactions: [
      "Choose a card from your discard to put on your deck:",
      ["Village", "Gold", "Smithy", "None of these"],
      "None of these",
    ],

    handAfter: ["Silver"],
    drawAfter: ["Copper"],
    discardAfter: ["Village", "Gold", "Smithy"],
  },

  Laboratory: {
    dActions: 1,
    draw: ["Copper", "Silver"],
    hand: [],
    handAfter: ["Copper", "Silver"],
  },

  Library: {
    draw: ["Village", "Gold", "Smithy"],
    hand: ["Copper", "Silver", "Copper", "Silver", "Copper", "Silver"],
    interactions: [
      "Add card to hand or set aside:",
      ["Smithy", "Set Aside"],
      "Set Aside",
    ],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Copper", "Copper", "Silver", "Silver", "Silver", "Gold"],
    discardAfter: ["Smithy"],
  },

  Library_Out: {
    draw: [],
    discard: ["Village"],
    hand: [],
    interactions: [
      "Add card to hand or set aside:",
      ["Village", "Set Aside"],
      "Village",
    ],
    handAfter: ["Village"],
    discardAfter: [],
  },

  Market: {
    dActions: 1,
    dBuys: 1,
    dMoney: 1,
    draw: ["Copper"],
    hand: [],
    handAfter: ["Copper"],
  },

  Merchant: {
    dActions: 1,
    dMoney: 6,
    draw: ["Copper"],
    hand: ["Copper", "Silver", "Silver"],
    handAfter: ["Copper"],
    playedAfter: ["Merchant", "Copper", "Silver", "Silver"],

    alsoPlay: ["Copper", "Silver", "Silver"],
  },

  Merchant_NoSilver: {
    dActions: 1,
    dMoney: 0,
    draw: ["Copper"],
    handAfter: ["Copper"],

    alsoPlay: [],
  },

  Militia: {
    dMoney: 2,

    others: [{
      hand: ["Copper", "Silver", "Gold", "Village", "Smithy"],
      interactions: [
        "Discard down to three cards:",
        ["Copper", "Silver", "Gold", "Village", "Smithy"],
        "Village",
        "Discard down to three cards:",
        ["Copper", "Silver", "Gold", "Smithy"],
        "Silver",
      ],
      handAfter: ["Copper", "Gold", "Smithy"],
      discardAfter: ["Village", "Silver"],
    }],
  },

  Militia_FewCards: {
    dMoney: 2,

    others: [{
      hand: ["Copper", "Silver", "Gold"],
      handAfter: ["Copper", "Silver", "Gold"],
    }],
  },

  Mine: {
    hand: ["Copper", "Silver"],
    interactions: [
      "Trash a Treasure:",
      ["Copper", "Silver"],
      "Silver",
      "ALL: Bot trashed Silver",
      "Gain a Treasure:",
      ["Copper", "Silver", "Gold"],
      "Gold",
      "ALL: Bot gained Gold",
    ],
    handAfter: ["Copper", "Gold"],
    trashAfter: ["Silver"],
  },

  Mine_NoMoney: {
    hand: [],
    interactions: [
      "No Treasures to trash",
    ],
    handAfter: [],
  },

  Moat: {
    draw: ["Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Copper"],
    handAfter: ["Silver", "Gold"],
  },

  Witch_Moat: {
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    interactions: [
      "ALL: Other#0 revealed Moat",
    ],

    others: [{
      hand: ["Moat"],
      discard: [],
      interactions: [
        ["Moat", "Get Attacked"],
        "Moat",
      ],
      handAfter: ["Moat"],
      discardAfter: [],
    }],
  },

  Witch_MoatAttacked: {
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    interactions: [
      "ALL: Other#0 gained Curse",
    ],

    others: [{
      hand: ["Moat"],
      discard: [],
      interactions: [
        ["Moat", "Get Attacked"],
        "Get Attacked",
      ],
      handAfter: ["Moat"],
      discardAfter: ["Curse"],
    }],
  },

  Militia_Moat: {
    dMoney: 2,

    interactions: [
      "ALL: Other#0 revealed Moat",
    ],

    others: [{
      hand: ["Copper", "Silver", "Gold", "Village", "Moat"],
      interactions: [
        ["Moat", "Get Attacked"],
        "Moat",
      ],
      handAfter: ["Copper", "Silver", "Gold", "Village", "Moat"],
      discardAfter: [],
    }, {
      hand: ["Copper", "Silver", "Gold", "Village", "Moat"],
      interactions: [
        ["Moat", "Get Attacked"],
        "Get Attacked",
        "Discard down to three cards:",
        ["Copper", "Silver", "Gold", "Village", "Moat"],
        "Village",
        "Discard down to three cards:",
        ["Copper", "Silver", "Gold", "Moat"],
        "Silver",
      ],
      handAfter: ["Copper", "Gold", "Moat"],
      discardAfter: ["Village", "Silver"],
    }],
  },

  Moneylender: {
    dMoney: 3,
    hand: ["Copper", "Copper"],
    interactions: [
      ["Trash a Copper", "Do Nothing"],
      "Trash a Copper",
      "ALL: Bot trashed Copper",
    ],
    handAfter: ["Copper"],
    trashAfter: ["Copper"],
  },

  Moneylender_DoNothing: {
    dMoney: 0,
    hand: ["Copper", "Copper"],
    interactions: [
      ["Trash a Copper", "Do Nothing"],
      "Do Nothing",
    ],
    handAfter: ["Copper", "Copper"],
    trashAfter: [],
  },

  Moneylender_NoCopper: {
    dMoney: 0,
    hand: ["Silver"],
    handAfter: ["Silver"],
    trashAfter: [],
  },

  Poacher: {
    storeCounts: {Village: 0, Smithy: 0},
    dMoney: 1,
    dActions: 1,

    draw: ["Silver", "Mine"],
    hand: ["Village", "Smithy"],
    interactions: [
      "Discard 2:",
      ["Village", "Smithy", "Mine"],
      "Mine",
      "Discard 1:",
      ["Village", "Smithy"],
      "Smithy",
    ],
    drawAfter: ["Silver"],
    handAfter: ["Village"],
    discardAfter: ["Mine", "Smithy"],
  },

  Remodel: {
    hand: ["Copper", "Silver"],
    interactions: [
      "Trash a card:",
      ["Copper", "Silver"],
      "Copper",
      "ALL: Bot trashed Copper",
      "Gain a card:",
      ["Copper", "Estate", "Curse"],
      "Estate",
      "ALL: Bot gained Estate",
    ],
    handAfter: ["Silver"],
    discardAfter: ["Estate"],
    trashAfter: ["Copper"],
  },

  Sentry: {
    draw: ["Copper", "Silver", "Gold"],
    interactions: [
      "Trash, discard, and/or place on top of deck:",
      ["Trash: Silver", "Discard: Silver", "To Deck: Silver", "Trash: Copper", "Discard: Copper", "To Deck: Copper"],
      "Discard: Silver",
      "Trash, discard, and/or place on top of deck:",
      ["Trash: Copper", "Discard: Copper", "To Deck: Copper"],
      "Trash: Copper",
      "ALL: Bot trashed Copper",
    ],
    drawAfter: [],
    handAfter: ["Gold"],
    discardAfter: ["Silver"],
    trashAfter: ["Copper"],
    dActions: 1,
  },

  Sentry_Reorder: {
    draw: ["Copper", "Silver", "Gold"],
    interactions: [
      "Trash, discard, and/or place on top of deck:",
      ["Trash: Silver", "Discard: Silver", "To Deck: Silver", "Trash: Copper", "Discard: Copper", "To Deck: Copper"],
      "To Deck: Copper",
      "Trash, discard, and/or place on top of deck:",
      ["Trash: Silver", "Discard: Silver", "To Deck: Silver"],
      "To Deck: Silver",
    ],
    drawAfter: ["Copper", "Silver"],
    handAfter: ["Gold"],
    discardAfter: [],
    trashAfter: [],
    dActions: 1,
  },

  Smithy: {
    draw: ["Village", "Copper", "Silver", "Gold"],
    hand: [],
    drawAfter: ["Village"],
    handAfter: ["Copper", "Silver", "Gold"],
  },

  Smithy_DoneDraw: {
    draw: ["Copper"],
    hand: [],
    drawAfter: [],
    handAfter: ["Copper"],
  },

  Spy: {
    dActions: 1,
    draw: ["Moneylender", "Copper", "Silver"],

    interactions: [
      "ALL: Other#1 revealed Thief",
      "Put back on deck or discard Other#1's Thief",
      ["Put back", "Discard"],
      "Discard",
      "ALL: Other#2 revealed Copper",
      "Put back on deck or discard Other#2's Copper",
      ["Put back", "Discard"],
      "Put back",
      "ALL: Bot revealed Copper",
      "Put back on deck or discard Your Copper",
      ["Put back", "Discard"],
      "Discard",
    ],

    handAfter: ["Silver"],
    drawAfter: ["Moneylender"],
    discardAfter: ["Copper"],

    others: [{
      draw: [],
    }, {
      draw: ["Smithy", "Thief"],
      drawAfter: ["Smithy"],
      discardAfter: ["Thief"],
    }, {
      draw: ["Copper"],
      drawAfter: ["Copper"],
    }],
  },

  Spy_Solo: {
    dActions: 1,
    draw: [],

    interactions: [],

    others: [],
  },

  Thief: {
    interactions: [
      "ALL: Other#0 revealed Copper",
      "ALL: Other#0 revealed Silver",
      "Trash or steal a Treasure:",
      ["Trash: Copper", "Steal: Copper", "Trash: Silver", "Steal: Silver"],
      "Steal: Silver",
    ],

    discardAfter: ["Silver"],

    others: [{
      draw: ["Silver", "Copper"],
      discardAfter: ["Copper"],
    }],
  },

  Thief_NonTreasure: {
    interactions: [
      "ALL: Other#0 revealed Village",
    ],

    others: [{
      draw: ["Village"],
      discardAfter: ["Village"],
    }],
  },

  Thief_SequentialMultiple: {
    interactions: [
      "ALL: Other#0 revealed Copper",
      "ALL: Other#0 revealed Silver",
      "Trash or steal a Treasure:",
      ["Trash: Copper", "Steal: Copper", "Trash: Silver", "Steal: Silver"],
      "Trash: Silver",
      "ALL: Bot trashed Silver",
      "ALL: Other#1 revealed Gold",
      "Trash or steal a Treasure:",
      ["Trash: Gold", "Steal: Gold"],
      "Steal: Gold",
    ],

    discardAfter: ["Gold"],
    trashAfter: ["Silver"],

    others: [{
      draw: ["Silver", "Copper"],
      discardAfter: ["Copper"],
    }, {
      draw: ["Gold"],
      discardAfter: [],
    }],
  },

  Thief_SequentialSolo: {
    interactions: [],

    others: [],
  },

  ThroneRoom_Thief: {
    hand: ["Thief"],

    interactions: [
      "Pick an Action card to double:",
      ["Thief"],
      "Thief",
      "ALL: Bot played Thief doubled!",
      "ALL: Other#0 revealed Copper",
      "ALL: Other#0 revealed Silver",
      "Trash or steal a Treasure:",
      ["Trash: Copper", "Steal: Copper", "Trash: Silver", "Steal: Silver"],
      "Steal: Silver",
      "ALL: Other#0 revealed Gold",
      "ALL: Other#0 revealed Village",
      "Trash or steal a Treasure:",
      ["Trash: Gold", "Steal: Gold"],
      "Steal: Gold",
    ],

    handAfter: [],
    discardAfter: ["Silver", "Gold"],
    playedAfter: ["Thief", "ThroneRoom"],

    others: [{
      draw: ["Village", "Gold", "Silver", "Copper"],
      discardAfter: ["Copper", "Village"],
    }],
  },

  Thief_Moat: {
    interactions: [
      "ALL: Other#0 revealed Moat",
      "ALL: Other#1 revealed Silver",
      "Trash or steal a Treasure:",
      ["Trash: Silver", "Steal: Silver"],
      "Steal: Silver",
    ],

    discardAfter: ["Silver"],

    others: [{
      hand: ["Moat"],
      draw: ["Copper"],
      interactions: [
        ["Moat", "Get Attacked"],
        "Moat",
      ],
      handAfter: ["Moat"],
      drawAfter: ["Copper"],
    }, {
      hand: ["Moat"],
      draw: ["Silver"],
      interactions: [
        ["Moat", "Get Attacked"],
        "Get Attacked",
      ],
      handAfter: ["Moat"],
      drawAfter: [],
    }],
  },

  ThroneRoom: {
    hand: ["Copper", "Mine"],
    interactions: [
      "Pick an Action card to double:",
      ["Mine"],
      "Mine",
      "ALL: Bot played Mine doubled!",
      "Trash a Treasure:",
      ["Copper"],
      "Copper",
      "ALL: Bot trashed Copper",
      "Gain a Treasure:",
      ["Copper", "Silver"],
      "Silver",
      "ALL: Bot gained Silver",
      "Trash a Treasure:",
      ["Silver"],
      "Silver",
      "ALL: Bot trashed Silver",
      "Gain a Treasure:",
      ["Copper", "Silver", "Gold"],
      "Gold",
      "ALL: Bot gained Gold",
    ],
    handAfter: ["Gold"],
    playedAfter: ["Mine", "ThroneRoom"],
    trashAfter: ["Copper", "Silver"],
  },

  ThroneRoom_None: {
    hand: ["Copper", "Silver"],
    interactions: [
      "No Action cards to play",
    ],
    handAfter: ["Copper", "Silver"],
  },

  Village: {
    dActions: 2,
    draw: ["Copper"],
    hand: [],
    handAfter: ["Copper"],
  },

  Witch: {
    draw: ["Village", "Estate", "Copper"],
    hand: [],

    interactions: [
      "ALL: Other#0 gained Curse",
    ],

    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: ["Curse"],
    }],
  },

  Witch_NoCurse: {
    storeCounts: {Curse: 0},
    draw: ["Estate", "Copper"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: [],
    }],
  },

  Witch_Self: {
    draw: ["Village", "Estate", "Copper"],
    hand: [],

    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: [],
  },

  Witch_Many: {
    draw: ["Village", "Estate", "Copper"],
    hand: [],

    interactions: [
      "ALL: Other#0 gained Curse",
      "ALL: Other#1 gained Curse",
    ],

    drawAfter: ["Village"],
    handAfter: ["Copper", "Estate"],

    others: [{
      discard: [],
      discardAfter: ["Curse"],
    }, {
      discard: [],
      discardAfter: ["Curse"],
    }],
  },

  Woodcutter: {
    dBuys: 1,
    dMoney: 2,
  },

  Workshop: {
    interactions: [
      "Gain a card:",
      ["Copper", "Silver", "Estate", "Curse"],
      "Estate",
      "ALL: Bot gained Estate",
    ],
    discardAfter: ["Estate"],
  },

  Vassal: {
    draw: ["ThroneRoom"],
    hand: ["Woodcutter"],
    interactions: [
      "What do you want to do with ThroneRoom?",
      ["Play", "Discard"],
      "Play",
      "ALL: Bot played ThroneRoom",
      "Pick an Action card to double:",
      ["Woodcutter"],
      "Woodcutter",
      "ALL: Bot played Woodcutter doubled!",
    ],

    playedAfter: ["Woodcutter", "ThroneRoom", "Vassal"],
    dBuys: 2,
    dMoney: 4,
  },

  Vassal_Discard: {
    draw: ["ThroneRoom"],
    interactions: [
      "What do you want to do with ThroneRoom?",
      ["Play", "Discard"],
      "Discard",
    ],
    discardAfter: ["ThroneRoom"],
  },

  Vassal_NoAction: {
    draw: ["Copper"],
    interactions: [
      "Discarded Copper",
    ],
    discardAfter: ["Copper"],
  },

  Platinum: {
    dMoney: 5,
  },

  Colony: {
    points: 10,
  },

  KingsCourt: {
    hand: ["Woodcutter", "Woodcutter"],
    dBuys: 3,
    dMoney: 6,
    interactions: [
      "Pick an Action card to triple:",
      ["Woodcutter", "Woodcutter"],
      "Woodcutter",
      "ALL: Bot played Woodcutter tripled!!",
    ],
    handAfter: ["Woodcutter"],
    playedAfter: ["Woodcutter", "KingsCourt"],
  },
};

describe("cards", () => {
  for (const tName in tests) {
    it("plays " + tName, async done => {
      const test = tests[tName];

      let cardName = tName;
      if (tName.includes("_")) {
        cardName = tName.substring(0, tName.indexOf("_"));
      }
      const card = cards[cardName];

      for (const testKey in test) {
        expect(defaultTest[testKey]).toBeDefined("typo key wasn't a subset of defaultTest: " + testKey);
      }
      for (const key in defaultTest) {
        if (key === "playedAfter") {
          test[key] = test[key] || [card.name];
        }
        test[key] = test[key] || defaultTest[key];
      }
      for (let i = 0; i < test.others.length; ++i) {
        for (const testOtherKey in test.others[i]) {
          expect(defaultTest[testOtherKey]).toBeDefined("typo other key wasn't a subset of defaultTest: " + testOtherKey);
        }
        for (const oKey in defaultOthers) {
          test.others[i][oKey] = test.others[i][oKey] || defaultOthers[oKey];
        }
      }

      const init = {
        actions: 3,
        buys: 3,
        money: 3,
      };

      let interactionIndex = 0;

      const game = new Game();

      // @ts-ignore create a mock connection
      const p = new Player({
        name: "Bot",
        send: o => {
          if (isHandMessage(o.message)) {
            return;
          }

          const expected = test.interactions[interactionIndex++];
          if (o.message) {
            expect(o.message).toEqual(expected);
          } else {
            fail(Error("Not implemented: " + o));
          }
        },
        choose: choices => {
          const expected = test.interactions[interactionIndex++];
          expect(choices).toEqual(expected);
          return Promise.resolve(test.interactions[interactionIndex++]);
        }}, game);

      game.players[0] = p;
      game.store.init(test.store.map(n => cards[n]), test.others.length + 1);
      game.store.counts = Object.assign(game.store.counts, test.storeCounts);
      game.allLog = message => {
        const expected = test.interactions[interactionIndex++];
        expect("ALL: " + message).toEqual(expected, "all log");
      };

      let otherCount = 0;
      test.others.forEach(testOther => {
        // @ts-ignore create a mock connection
        const oP = new Player({
          name: "Other#" + otherCount++,
          send: o => {
            if (isHandMessage(o.message)) {
              return;
            }

            const expected = testOther.interactions[oP["InteractionIndex"]++];
            if (o.message) {
              expect(o.message).toEqual(expected);
            } else {
              fail(Error("Not implemented: " + o));
            }
          },
          choose: choices => {
            const expected = testOther.interactions[oP["InteractionIndex"]++];
            expect(choices).toEqual(expected);
            return Promise.resolve(testOther.interactions[oP["InteractionIndex"]++]);
          }}, game);
        oP["TestIndex"] = otherCount - 1;
        oP["InteractionIndex"] = 0;
        oP.drawPile = testOther.draw.map(n => cards[n]);
        oP.discardPile = testOther.discard.map(n => cards[n]);
        oP.hand = testOther.hand.map(n => cards[n]);

        game.players[10 + otherCount] = oP;
      });

      p.money = init.money;
      p.actions = init.actions;
      p.buys = init.buys;
      p.played = [];
      p.onPlayed = [];

      p.drawPile = test.draw.map(n => cards[n]);
      p.discardPile = test.discard.map(n => cards[n]);
      p.hand = test.hand.map(n => cards[n]);

      let called = false;

      if (card.ofKind("action") || card.ofKind("treasure")) {
        p.hand.splice(0, 0, card);
        await p.playCard(card.name, () => {/* nop */});
        for (const also of test.alsoPlay) {
          await p.playCard(also, () => {/* nop */});
        }
        expect(p.actions - init.actions).toEqual(test.dActions, "dActions");
        expect(p.buys - init.buys).toEqual(test.dBuys, "dBuys");
        expect(p.money - init.money).toEqual(test.dMoney, "dMoney");

        expect(p.drawPile.map(c => c.name))
          .toEqual(test.drawAfter, "drawAfter");
        expect(p.discardPile.map(c => c.name))
          .toEqual(test.discardAfter, "discardAfter");
        expect(p.hand.map(c => c.name))
          .toEqual(test.handAfter, "handAfter");

        expect(p.played.map(c => c.name))
          .toEqual(test.playedAfter, "playedAfter");

        expect(game.trash.map(c => c.name))
          .toEqual(test.trashAfter, "trashAfter");

        expect(interactionIndex).toEqual(test.interactions.length, "all interactions used");

        game.otherPlayers(p).forEach(o => {
          const otherTest = test.others[o["TestIndex"]];

          expect(o.drawPile.map(c => c.name))
            .toEqual(otherTest.drawAfter, o.name + " drawAfter");
          expect(o.discardPile.map(c => c.name))
            .toEqual(otherTest.discardAfter, o.name + " discardAfter");
          expect(o.hand.map(c => c.name))
            .toEqual(otherTest.handAfter, o.name + " handAfter");

          expect(o["InteractionIndex"]).toEqual(otherTest.interactions.length, o.name + " all interactions used");
        });

        expect(called).toBeFalsy("called twice");
        called = true;
        done();
      } else if (card.ofKind("victory") || card.ofKind("curse")) {
        expect(card.getPoints(p)).toEqual(test.points, "points");
        done();
      } else {
        fail(Error("Not implemented kind: " + card.name));
      }
    });
  }

  it("tests all", () => {
    for (const cardName in cards) {
      expect(tests[cardName]).toBeDefined("tests " + cardName);
    }
  });

  it("has images for all", () => {
    const jpg = fs.readdirSync(path.join(__dirname, "..", "client", "cards"));
    for (const cardName in cards) {
      expect(jpg).toContain(cardName + ".jpg");
    }
  });

  it("sorts correctly", () => {
    const arr = [cards.Estate, cards.Village, cards.Chapel, cards.Cellar];
    const sorted = arr.sort((a, b) => a.compareTo(b)).map(c => c.name);
    expect(sorted).toEqual(["Estate", "Cellar", "Chapel", "Village"]);
  });

  it("has colors for all", () => {
    for (const cardName in cards) {
      expect(cards[cardName].color).toBeTruthy();
    }
  });

  it("has reveal message for all", () => {
    const cardsWithReveal = Object.entries(cards).filter(entry => /reveal/i.test(entry[1].text));
    const testsWithReveal = new Set(Object.entries(tests)
      .filter(entry => entry[1].interactions && entry[1].interactions.some(i => /ALL: .*revealed/.test(i)))
      .flatMap(entry => entry[0].split("_")));
    for (const card of cardsWithReveal) {
      expect(testsWithReveal.has(card[0])).toBeTruthy();
    }
  });
});

// TODO(CRASH) add a test for player turn, streaming in shuffle, asserting all output

function isHandMessage(message) {
  if (!message) {
    return false;
  }
  return message.startsWith("Your hand") || message.startsWith("Your upcoming hand");
}
