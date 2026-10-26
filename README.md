# Pferde-Mathe 🐴

Spielerische Mathe-Web-App (PWA) für Kinder der 1./2. Klasse (orientiert am bayerischen LehrplanPLUS), Zahlenraum bis 20 und – ab Version 3 – bis 100 (Plus und Minus, ohne Multiplikation und Division).
Reines HTML/CSS/JS ohne Build-Schritt, ohne Tracking, ohne Netzwerkaufrufe. Alle Daten bleiben im `localStorage` des Geräts.

**Live:** https://starship2mars.github.io/pferde-mathe/

## Spiele
1. **Verliebte Zahlen** – Zerlegung der 10 (offen mit Punktebildern → nur Zahlen → Memory verdeckt)
2. **Zahlenhäuser** – Dachzahl & Stockwerke (Dach bis 7 → bis 10 → Dachzahl finden → 11–15 → bis 20)
3. **Plus und Minus** – Zwanzigerfeld mit tippbaren Plättchen, „Trick zeigen“ (z. B. 8 + 5 = 8 + 2 + 3)
4. **Aufgabenfamilie** – Tausch- und Umkehraufgaben (7 + 5, 5 + 7, 12 − 5, 12 − 7) + „Tauschaufgabe erkennen“
5. **Zahlenstrahl-Hüpfen** – Pferd Luna hüpft auf dem Zahlenstrahl 0–20

Dazu im Abenteuer: **Zehnerzahlen** – mit ganzen Zehnern bis 100 rechnen (Perlenstäbe).

### Zahlenraum bis 100 🌲 (neu in Version 3)
Sieben weitere Spiele für die 2. Klasse, alle mit Stufen, sanften Hinweisen (kein Rot, keine Zeit) und Aufgabentypen im Elternbereich:
1. **Hunderterfeld** 💯 – Zahlen im Hunderterfeld finden, Zehnerreihen erkennen
2. **Zehner und Einer** 🧱 – Zahlen mit Stangen und Würfeln bauen, zerlegen und lesen
3. **Zahlenstrahl bis 100** 🏇 – in Zehnern und Einern hüpfen, in Abschnitte zoomen
4. **Nachbarzahlen** 🏘️ – Vorgänger, Nachfolger, Nachbarzehner
5. **Vergleichen** ⚖️ – kleiner, größer oder gleich
6. **Zahlen ordnen** 🔢 – von klein nach groß sortieren
7. **Plus und Minus bis 100** ➕ – Zehner und Einer getrennt, dann mit Zehnerübergang („Zehner-Trick“)

Auf der Startseite stehen sie in einem eigenen Bereich „Zahlenraum bis 100“. Dazu gibt es die **6. Welt der Abenteuer-Reise**
(Zauberwald der Hundert, 8 Stationen, Tor mit 3 Glühkugeln, Geschenk Zauberlaterne – sie schaltet das Einhorn im Hofladen frei).

Je Runde 5 Aufgaben, Schwierigkeit passt sich automatisch an. Kein Zeitdruck, keine roten Kreuze –
Fehler führen zu einem sanften Tipp. Belohnung: Hufeisen und Karotten.

## Abenteuer-Reise 🗺️ (neu in Version 2)
Eine große, gezeichnete Weltkarte im Vollbild (Inline-SVG, mehrere Ebenen, sanft animiert). Das Pferd reist
auf einem Weg von Station zu Station durch sechs Welten – zum Wischen oder mit den Pfeilen:

| Welt | Schwerpunkt | Schätze | Tor-Aufgabe |
|---|---|---|---|
| 1 Blumenwiese | verliebte Zahlen, Zahlenhäuser bis 10, Zahlenstrahl | 4 Blumen, Kartenstück | Rosentor → goldener Schlüssel |
| 2 Apfelgarten | Plus/Minus bis 20 ohne Übergang, Tauschaufgaben | 3 Äpfel, Ei, Kartenstück | Ziege Zenzi macht Platz → Glöckchen, Zenzi zieht auf den Pferdehof |
| 3 Sonnenstrand am See | Plus mit Zehnerübergang, Zahlenhäuser bis 15 | 3 Bretter, Muschel, Kartenstück | Brücke reparieren → Glitzer-Perle |
| 4 Bergwiese am Bach | Minus mit Zehnerübergang, Zahlenhäuser bis 20, Umkehraufgaben | 3 Kristalle, Laterne, Kartenstück | Regenbogen-Brücke → Edelweiß |
| 5 Märchenschloss | Mischung + Ausblick: Zehnerzahlen bis 100 (30 + 40) | 3 Zaubersterne, goldenes Zaumzeug, Kartenstück | Schlosstor → Krone für das Pferd, großes Schlossfest |
| 6 Zauberwald der Hundert | Zahlenraum bis 100: Hunderterfeld, Zehner/Einer, Zahlenstrahl, Nachbarzahlen, Vergleichen, Ordnen, Zehner-Trick | 3 Glühkugeln, Zauberpilze, Kartenteil | Hundert-Tor → Zauberlaterne (Geschenk) |

- Jede Station ist eine kurze Runde (5 Aufgaben) aus den bekannten Spielen; Hufeisen und Karotten gibt es wie gewohnt.
- Normale Stationen: eigenes Niveau (manche bewusst eine Stufe leichter); eine sanfte Lehrplan-Untergrenze hebt
  spätere Welten an – aber nie mehr als eine Stufe über dem eigenen Niveau.
- Tor-Aufgabe am Ende jeder Welt: eine Stufe über dem eigenen Niveau (zählt nicht für die automatische Anpassung,
  damit sie das Niveau nie absenkt). Danach: Konfetti, Fanfare, kurze Reise-Szene, und die Wolken über der nächsten Welt lösen sich.
- Geschaffte Stationen bekommen einen Stern, das Pferd wippt an der aktuellen Station, spätere Welten liegen hinter hellen Wolken.
- Rucksack 🎒 mit allen gefundenen Schätzen und der Schatzkarte (1 Stück pro Welt).
- Pferdehof 🏡 ist die Basis und direkt von der Karte erreichbar; Geschenke aus dem Abenteuer erscheinen dort.
- Geschaffte Stationen können jederzeit zum Üben noch einmal besucht werden. Es gibt keine Fehlschläge – jede Runde wird geschafft.

## Pferdehof (Vollbild)
Liebevoll gezeichneter Hof (alles Inline-SVG/CSS): Scheune mit Tor zum Öffnen, Koppel, Teich mit Enten,
Apfelbaum, ziehende Wolken, Vögel, Schmetterlinge, wiegendes Gras; Tag- oder warme Abendstimmung je nach Uhrzeit.
Pferde blinzeln, wedeln mit dem Schweif, nicken – und freuen sich beim Antippen. Karotte oder Bürste zum Pferd
ziehen zum Füttern und Putzen. Mit Hufeisen Sachen holen (Heu, Wassertrog, Blumen, Pferdedecke in Farben, Pony,
Fohlen, Schimmel, Rappe, Reitplatz mit Hindernissen, Wetterfahne, Kätzchen im Heu, Regenbogen …) und per
Drag & Drop platzieren. Pferde können eigene Namen bekommen (nur lokal).
Pferde und Sachen lassen sich nicht hinter die Scheune (oder anders unsichtbar) stellen. Ungültige oder verdeckte gespeicherte
Positionen werden beim Start automatisch auf einen freien Platz auf der Koppel verschoben (nur die Position; sonst bleibt alles).

### Bauernhaus & Stall von innen 🏠🐴 (neu in Version 4)
- **Bauernhaus antippen** → Reiterstübchen von innen (dieselbe Ansicht wie „Stübchen“ im Hofladen: gekaufte Möbel sind da und lassen sich verschieben). Der Weg zurück: „Zum Hof“ (oder 🏠 oben links). Weicher Kreis-Übergang, Türgeräusch und ruhige Stübchen-Stimmung. Auf dem Hof zeigen ein Tür-Glühen und ein kleines „🚪 Stübchen“-Schild, dass das Haus antippbar ist (das Schild verschwindet, sobald es einmal benutzt wurde).
- **Stall (Scheune) antippen** → Stall von innen mit Stroh und Boxen: Alle Pferde und Tiere, die „im Stall“ sind, stehen dort (Pferde mit Namensschild, kauend oder schlafend, Tiere ruhig atmend; leise Stallgeräusche: Wiehern, Kauen). Mit „Rausholen“ geht jedes Tier wieder hinaus und steht dann beim Scheunentor; „Alle rauslassen“ holt alle. Antippen eines Tieres im Stall ist ein kleiner Streichler.
- **Auf dem Hof**: Ein Pferd oder Tier auf die Scheune ziehen, oder antippen und „In den Stall“ wählen. Es bleibt drin, bis es herausgeholt wird.
- **Fehler behoben („rennen sofort wieder raus“)**: Die Scheune zählte als „unsichtbarer“ Platz; beim Loslassen schob die Hof-Reparatur das Tier auf einen freien Platz und es trabte wieder heraus. Jetzt wird es stattdessen im Spielstand als „im Stall“ gespeichert (`stall`-Liste) und gar nicht mehr auf dem Hof gezeichnet.
- **Speicherung/Migration**: Neues, ergänzendes Feld `stall` (Liste von Tier-IDs) plus `houseSeen`/`stallSeen`. Alte Spielstände ohne diese Felder laden unverändert (Stall leer = alle draußen). Nur gekaufte Tiere werden angezeigt; Unbekanntes wird ignoriert, aber nicht gelöscht. „Pferdehof aufräumen“ im Elternbereich lässt außerdem alle aus dem Stall und setzt die Positionen zurück (Gekauftes bleibt).

## Reiterin, Kleiderschrank & Turnier 🏇
- Eigene Reiterin-Figur (Hautton, Haarfarbe, Frisur beim ersten Mal wählbar; Name kommt aus dem Elternbereich, sonst „Reiterin").
- Kleiderschrank 👚: Reithelme, Oberteile, Westen, Reithosen, Stiefel, Handschuhe, Glitzer-Helmbezug, Schleife, Gerte, Steigbügel – gekauft mit Hufeisen. Sattelpad und Zaumzeug gehören je einem Pferd.
- Reiten nur auf erwachsenen Pferden (kein Fohlen). Ein einfacher Helm ist gratis, beim Reiten wird immer ein Helm getragen.
- Reitplatz: Schritt/Trab/Halt, kleine Sprünge (gelingen immer), sanftes Hufgeklapper; nach ein paar Runden gibt es eine Rosette.
- Pferdeturnier 🏆: kurze, ruhige Prüfung mit drei leichten Richterinnen-Fragen (Rechnen); jedes Pferd gewinnt eine Schleife oder einen Pokal – alles hängt an der Rosettenwand 🏅.

## Bayerischer Pferdehof, Jahreszeiten & Feste 🏔️
- Voralpenland: Berge mit Schneekappen, Bauernhaus mit Holzbalkon und roten Geranien, Stall mit Blumenkästen, Kapelle, weiß-blauer Maibaum, Holzstapel, Bach, Kühe mit Glocken, ab und zu fährt ein Traktor.
- Antippen: Fenster, Blumenkästen, Kühe, Kapelle, Maibaum, Traktor, Bienen reagieren freundlich. Leise Hofgeräusche (Kuhglocken, Muhen, Hahn am Morgen, Vögel, Bienen, Wind).
- Jahreszeit nach echtem Datum: Frühling (Blüten), Sommer, Herbst (bunte Blätter), Winter (Schnee, Eis auf dem Teich).
- Feste: Advent/Weihnachten (Lichterkette, Christbaum), Ostern (Eier suchen), Herbstfest Ende Oktober (nur lächelnde Kürbisse), Geburtstag (wenn im Elternbereich eingetragen: Luftballons und Glückwunsch).
- „Bewegung reduzieren" wird beachtet (keine fallenden Blätter/Flocken, ruhigere Tiere).
- Zum Ausprobieren: `?season=winter&fest=xmas` (auch spring/summer/autumn, advent/easter/halloween/birthday/none).

## Hofladen, Stübchen, Pflege & Album 🛍️ (neu in Version 3)
Die gesammelten Hufeisen und Karotten lassen sich jetzt vielseitig einsetzen. Der **Hofladen** 🛍️ (Knopf auf dem Hof, Kachel auf der Startseite) hat neun Reiter:
- **Pferde**: 5 neue Pferde und Fohlen (Funke, Pünktchen, Sonnenschein, Mohn, Mondlicht), das Einhorn Sternschnuppe (erst nach Welt 6), dazu Blumenkranz, Glöckchen, Stern, Haube als Schmuck.
- **Pflege**: Schwamm, Hufkratzer, Flechtband, Glanzspray.
- **Hof**: 17 Dinge für den Hof (Brunnen, Bank, Schaukel, Windrad, Vogelhaus, Windmühle, Reithalle …), werden automatisch auf einen freien Platz gestellt.
- **Tiere**: Hase, Lamm, Esel, Eichhörnchen, Eule, Igel.
- **Reiterin**: 27 neue Teile (Halstücher, Brillen, Helme in Gold/Rot/Himmel, Jacken, Stiefel, Zaumzeug …) – direkt im Kleiderschrank anziehen.
- **Stübchen**: 14 Möbel fürs Reiterstübchen.
- **Saison**: je Jahreszeit eigene Sachen (Kürbisbeet, Schneemann, Osternest, Planschbecken …) – nur in ihrer Jahreszeit kaufbar, gekauft bleibt für immer.
- **Sticker**: Sticker-Tüten (Karotten bzw. Hufeisen + Karotten).
- **Spiele**: schaltet die Mini-Spiele frei.

Preise liegen zwischen 20 und 180 Hufeisen, damit ein Wunsch ein paar Runden Rechnen braucht. Ab 25 Hufeisen oder 3 Karotten fragt ein „Wirklich holen?“. Zu wenig Geld? Ein Fortschrittsbalken zeigt, wie viel noch fehlt. Nichts kostet echtes Geld.

- **Pflege** 🧼: Pferd bürsten, waschen, Hufe auskratzen, Mähne flechten, Fell glänzen lassen – kurze Tippspiele, pro Aufgabe 2 Hufeisen (höchstens 6 am Tag, jede 5. Pflegerunde 1 Karotte). Zopf und Glanz sieht man am Pferd, nur am selben Tag.
- **Reiterstübchen** 🛋️: Möbel per Drag & Drop einräumen, Lampe = Nachtmodus, Pokalvitrine mit den Rosetten, Kamin. Positionen bleiben gespeichert.
- **Sticker-Album** 📒: 48 Sticker auf 6 Seiten (24 seltene Glitzer-Sticker); pro Tag gibt es nach einer Runde einen Gratis-Sticker; eine volle Seite = einmalig 10 Hufeisen + Rosette.
- **Mini-Spiele** 🎮 (im Hofladen freischalten, ohne Zeitdruck und ohne Verlieren): **Apfelfangen**, **Ausritt im Wald** (Tippen = Pferd hüpft, Baumstämme sind nur ein sanftes Stolpern), **Pferde-Memory** (passt die Kartenzahl 3–8 Paare an). Belohnung höchstens 8 Hufeisen und 2 Karotten pro Tag, danach freundlicher Hinweis – spielen darf man trotzdem.
- **Lernschild** 🏫: Übersicht der sieben „bis 100“-Spiele mit Stufe.

**Sicher für alte Spielstände:** Beim ersten Start der neuen Version wird eine unveränderte Kopie des alten Stands unter `pferde-mathe-v1-backup-2.4` abgelegt. Der Speicher-Schlüssel bleibt gleich, neue Felder werden nur ergänzt – bisher Gekauftes, Positionen, Namen und Lernstand bleiben, alle alten Kauf-IDs funktionieren weiter. Das alte 🛒-Menü auf dem Hof funktioniert unverändert.

## Grafik
Neue Illustrationen (`art.js`: Hofgebäude, Tiere, Jahreszeiten-Deko, Möbel, Sticker) mit Verläufen und weichen Schatten, kleine Leerlauf-Animationen (Tiere atmen, Windrad dreht, Wasser plätschert), Konfetti und Strahlen bei Belohnungen, einheitliche Knöpfe. Bedienelemente sind mindestens 44 px groß, alles ist für iPad quer und hoch (768–1180 px) ausgelegt. „Bewegung reduzieren“ schaltet die Animationen ab.

## Klänge
Alle Klänge werden im Browser erzeugt (WebAudio, `audio.js`; keine Audiodateien), leise und sanft; Ton und Musik einzeln abschaltbar. Richtige Antwort:
kleines Glockenspiel (variiert, manchmal mit Wiehern oder Hufgeklapper); Rundenende/Freischalten/Kaufen: sanfte Fanfare, Münzklingeln;
Pflege: Schrubben, Plätschern, Glitzern; Mini-Spiele: Hufschlag, Sprung, Sterne; ruhige Hintergrund-Stimmung je Szene (Hof, Stübchen, Spiele).
Falsche Antwort: nur ein sehr leiser neutraler Ton. Auf dem iPad startet der Ton erst nach der ersten Berührung (iOS-Vorgabe).

## Elternbereich
„Für Eltern“ → Knopf 3 Sekunden halten. Fortschritt je Spiel und Aufgabentyp, knifflige Aufgaben, Stufen anpassen,
Ton, Zurücksetzen, **Abenteuer-Fortschritt je Welt** mit „Hierhin springen“ / „Von vorn“, **Pferdehof aufräumen** (Positionen zurücksetzen, alle aus dem Stall lassen; Gekauftes bleibt), Überblick über **Hofladen, Album und Mini-Spiele** (was gekauft wurde, ausgegebene Hufeisen, Sticker, Pflegerunden) sowie Stufen und Aufgabentypen der neuen bis-100-Spiele. Optional: **Name des Kindes** und **Geburtstag (Tag/Monat)** – nur lokal gespeichert;
ohne Angaben spricht die App neutral („du“) und zeigt keinen Geburtstags-Countdown.

## Aufs iPad
In Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach auch offline nutzbar.
Updates: Der Service Worker hat eine neue Cache-Version; die installierte App lädt die neue Version beim nächsten Öffnen
(nie mitten in einer Aufgabe). Der Spielstand bleibt erhalten (gleicher Speicher-Schlüssel, neue Felder werden ergänzt).

## Entwicklung
```
python3 -m http.server 8000             # http://127.0.0.1:8000/
URL=http://127.0.0.1:8000/index.html node tools/test.js webkit        # E2E-Test (playwright)
URL=http://127.0.0.1:8000/index.html node tools/test-stable.js        # Pferdehof in 4 iPad-Größen
URL=http://127.0.0.1:8000/index.html node tools/test-adventure.js     # Abenteuer in 4 iPad-Größen, offline, Migration
URL=http://127.0.0.1:8000/index.html node tools/test-farmfix.js       # Reparatur „Pferd hinter der Scheune“, Stall statt Hinauslaufen, Spielstand bleibt
URL=http://127.0.0.1:8000/index.html node tools/test-bis100.js webkit # 7 Spiele bis 100 in 4 iPad-Größen
URL=http://127.0.0.1:8000/index.html node tools/test-world6.js        # Welt 6: Station, Tor, Geschenk, Einhorn-Freischaltung
URL=http://127.0.0.1:8000/index.html node tools/test-shop.js webkit   # Hofladen, Pflege, Stübchen, Album, Mini-Spiele, Migration, Offline
URL=http://127.0.0.1:8000/index.html node tools/test-haus-stall.js webkit # Haus/Stall von innen, bleibt im Stall (60 s), Neuladen, Migration
URL=http://127.0.0.1:8000/index.html node tools/test-audio.js         # Klang-Engine (ohne Hörprobe)
python3 tools/build-single.py           # erzeugt pferde-mathe.html (alles in einer Datei)
```

Dateien: `app.js` (Kern), `audio.js` (Klang), `art.js` (Illustrationen), `bis100.js` (7 Spiele + Welt 6), `shop.js` (Hofladen, Pflege, Stübchen, Album), `minigames.js` (3 Mini-Spiele),
`style.css` / `polish.css` / `shop.css`. Module hängen sich über `window.PM_MODS` an den Kern; ohne Build-Schritt. `sw.js` listet alle Dateien (Cache-Version bei jeder Änderung anheben).
