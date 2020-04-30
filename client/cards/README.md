These card images are downloaded from http://wiki.dominionstrategy.com/index.php/List_of_cards

(Content is available under Creative Commons Attribution Non-Commercial Share Alike.)

Run the script

```powershell
grep card-popup cards.html | grep -v coin-icon | grep -o "/image.*jpg" > tmp
gc tmp | % { curl "http://wiki.dominionstrategy.com$_" -OutFile "$($_.Split('-')[-1] -replace '%27','' -replace '_','')"
```
