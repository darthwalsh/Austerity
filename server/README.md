# Server

## Client-Server communication

### Websocket
The default client-server communication, and by far the fastest.

Downsides:

* Hosting servers don't allow many simultaneous connections, if any
* Game state is not persisted, so a server reboot will wipe out any games

### Firebase Database

Using [Firebase Realtime Database](https://firebase.google.com/docs/database), it is possible to emulate the websocket messages. This gives the added benefit of messages being persisted in the database, so if the server restarts it can event-source its state from the database, and recover an active game without interaction from the client.

Realtime Database was picked over Firestore because the average round trip latency of 600ms is fast enough to barely be noticed by users, while Firestore is noticeably slower at 1500ms.
[source](https://medium.com/@d8schreiber/firebase-performance-firestore-and-realtime-database-latency-13effcade26d)

[Info on Data Model, Auth, Queues](https://howtofirebase.com/firebase-data-modeling-939585ade7f4)

#### Database Schema

Each game is composed of messages from server to client, and v/v.

Each firebase client listens for child_added on their message queue.

Here, user* is a userID from Firebase Authentication

    game0:
        users:
            alice: userWQ3mVT
            bob: user7f8pR
        userMessage:
            userWQ3mVT:
                0: Message: Connected to Game
                1: Choice: New Game, Refresh
            user7f8pR:
                0: Message: Connected to Game
                1: Choice: New Game, Refresh, alice's game
        serverMessage:
            userWQ3mVT:
                0: Choice: New Game
                1: Start: Militia, Moat, ...
            user7f8pR:
                0: Choice: Refresh

### P1
- [ ] Anonymous login (persists on refresh?)
- [ ] Database permission rules, with read permission on userMessage and write on serverMessage
- [ ] Investigate moving hosting to Google node server, fix TODO in main README

### P2 
- [ ] firebase disconnect messages [using onDisconnect](https://firebase.google.com/docs/database/web/offline-capabilities#how-ondisconnect-works)
- [ ] OAuth/email sign-in, so users can roam between machines
- [ ] Move hosting to Google node server if possible

## Generating the table of cards

### Browser UserScripts

At the [List_of_cards](http://wiki.dominionstrategy.com/index.php/List_of_cards):

Run to filter for only Reaction cards

    Array.from(document.getElementsByTagName("tbody")[0].children).forEach(tr => tr.innerText.includes("Reaction") || tr.parentElement.removeChild(tr))

### Source

AusterityWiki.csv is downloaded from http://wiki.dominionstrategy.com/index.php/List_of_cards

* Run the script below, then Save As with type CSV UTF-8
* Remove the UTF8 BOM
* Run `npm run genCards`
* Run `npm test` to format the generated code

Some other data sources I considered were:

* https://dominionstrategy.com/all-cards/
* https://github.com/mehtank/androminion/blob/master/vdom/src/com/vdom/core/Cards.java
* https://docs.google.com/spreadsheets/d/1gxwm6m4zImF1BoK_-0YXpr0L3VoMMtCCQH6QzSOWrlY/preview

### Script

Using Excel Power Query, this script downloads and fixes up the table:

```
let
    Html = Text.FromBinary(Web.Contents("http://wiki.dominionstrategy.com/index.php/List_of_cards")),
    ExtractAlt = ExtractAltString(Html),
    ReplaceHR = Text.Replace(ExtractAlt, "<hr />", "<br />"),
    Source = Web.Page(Text.ToBinary(ReplaceHR)),
    Data0 = Source{0}[Data],
    #"Changed Type" = Table.TransformColumnTypes(Data0,{{"Name", type text}, {"Set", type text}, {"Types", type text}, {"Cost", type text}, {"Text", type text}, {"Actions / Villagers", type text}, {"Cards", type text}, {"Buys", type text}, {"Coins / Coffers", type text}, {"Trash", type text}, {"Junk", type text}, {"Gain", type text}, {"Column13", type text}}),
    #"Replaced Value" = Table.ReplaceValue(#"Changed Type","Base, 1E","Base v1",Replacer.ReplaceText,{"Set"}),
    #"Replaced Value1" = Table.ReplaceValue(#"Replaced Value","Base, 2E","Base",Replacer.ReplaceText,{"Set"}),
    #"Replaced Value2" = Table.ReplaceValue(#"Replaced Value1","Intrigue, 1E","Intrigue v1",Replacer.ReplaceText,{"Set"}),
    #"Replaced Value3" = Table.ReplaceValue(#"Replaced Value2","Intrigue, 2E","Intrigue",Replacer.ReplaceText,{"Set"}),
    #"Removed Other Columns" = Table.SelectColumns(#"Replaced Value3",{"Name", "Set", "Types", "Cost", "Text"}),
    #"Sorted Rows" = Table.Sort(#"Removed Other Columns",{{"Set", Order.Ascending}, {"Name", Order.Ascending}}),
    #"Replaced Value4" = Table.ReplaceValue(#"Sorted Rows","'","’",Replacer.ReplaceText,{"Text"}),
    #"Replaced Value5" = Table.ReplaceValue(#"Replaced Value4","VP","VP ",Replacer.ReplaceText,{"Text"})
in
    #"Replaced Value5"

// ExtractAltString 
(Source) => let
    Split = List.Transform(Text.Split(Source, "<img alt="""), (SplitStart) => let
          AltStringLength = Text.PositionOf(SplitStart, """"),
          AltString = Text.Range(SplitStart, 0, AltStringLength),
          IgnoreJPG = if Text.EndsWith(AltString, ".jpg") then "" else AltString,
          FixDebt = if Text.EndsWith(IgnoreJPG, "D") then Text.Replace(IgnoreJPG, "D", " D ") else IgnoreJPG,
          FixVP = if FixDebt = "VP.png" then " VP " else FixDebt,
          FixMoney = if Text.StartsWith(FixVP, "$") and Text.EndsWith(FixVP, "star") then Text.Replace(FixVP, "star", "*") else FixVP,
          FixPotion = if FixMoney = "P" then " ◉ " else FixMoney,
          ImgElementLength = Text.PositionOf(SplitStart, " />"),
          ImgRemoved = FixPotion & Text.Range(SplitStart, ImgElementLength + 3),
          IgnoreDocType = if Text.StartsWith(SplitStart, "<!DOCTYPE html>") then SplitStart else ImgRemoved
      in
          IgnoreDocType),
    Combine = Text.Combine(Split)
in
    Combine
```

ExtractAltString removes each `<img />` element and replaces it with the hover text.

The main script renames some of the sets, and cleans up the text slightly (PQ refuses to leave a space after "VP").
