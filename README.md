# Pferde-Mathe 🐴

Spielerische Mathe-Web-App (PWA) für Kinder der 1./2. Klasse (orientiert am bayerischen LehrplanPLUS), Zahlenraum bis 20.
Reines HTML/CSS/JS ohne Build-Schritt, ohne Tracking, ohne Netzwerkaufrufe. Alle Daten bleiben im `localStorage` des Geräts.

**Live:** https://starship2mars.github.io/pferde-mathe/

## Spiele
1. **Verliebte Zahlen** – Zerlegung der 10 (offen mit Punktebildern → nur Zahlen → Memory verdeckt)
2. **Zahlenhäuser** – Dachzahl & Stockwerke (Dach bis 7 → bis 10 → Dachzahl finden → 11–15 → bis 20)
3. **Plus und Minus** – Zwanzigerfeld mit tippbaren Plättchen, „Trick zeigen“ (z. B. 8 + 5 = 8 + 2 + 3)
4. **Aufgabenfamilie** – Tausch- und Umkehraufgaben (7 + 5, 5 + 7, 12 − 5, 12 − 7) + „Tauschaufgabe erkennen“
5. **Zahlenstrahl-Hüpfen** – Pferd Luna hüpft auf dem Zahlenstrahl 0–20

Dazu im Abenteuer: **Zehnerzahlen** – mit ganzen Zehnern bis 100 rechnen (Perlenstäbe).

Je Runde 5 Aufgaben, Schwierigkeit passt sich automatisch an. Kein Zeitdruck, keine roten Kreuze –
Fehler führen zu einem sanften Tipp. Belohnung: Hufeisen und Karotten.

## Abenteuer-Reise 🗺️ (neu in Version 2)
Eine große, gezeichnete Weltkarte im Vollbild (Inline-SVG, mehrere Ebenen, sanft animiert). Das Pferd reist
auf einem Weg von Station zu Station durch fünf Welten – zum Wischen oder mit den Pfeilen:

| Welt | Schwerpunkt | Schätze | Tor-Aufgabe |
|---|---|---|---|
| 1 Blumenwiese | verliebte Zahlen, Zahlenhäuser bis 10, Zahlenstrahl | 4 Blumen, Kartenstück | Rosentor → goldener Schlüssel |
| 2 Apfelgarten | Plus/Minus bis 20 ohne Übergang, Tauschaufgaben | 3 Äpfel, Ei, Kartenstück | Ziege Zenzi macht Platz → Glöckchen, Zenzi zieht auf den Pferdehof |
| 3 Sonnenstrand am See | Plus mit Zehnerübergang, Zahlenhäuser bis 15 | 3 Bretter, Muschel, Kartenstück | Brücke reparieren → Glitzer-Perle |
| 4 Bergwiese am Bach | Minus mit Zehnerübergang, Zahlenhäuser bis 20, Umkehraufgaben | 3 Kristalle, Laterne, Kartenstück | Regenbogen-Brücke → Edelweiß |
| 5 Märchenschloss | Mischung + Ausblick: Zehnerzahlen bis 100 (30 + 40) | 3 Zaubersterne, goldenes Zaumzeug, Kartenstück | Schlosstor → Krone für das Pferd, großes Schlossfest |

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
Pferde und Sachen lassen sich nicht hinter die Scheune (oder anders unsichtbar) stellen: Wer auf die Scheune gezogen wird,
trabt fröhlich wieder heraus. Beim Öffnen der Scheune kommen alle Pferde heraus. Ungültige oder verdeckte gespeicherte
Positionen werden beim Start automatisch auf einen freien Platz auf der Koppel verschoben (nur die Position; sonst bleibt alles).

## Klänge
Alle Klänge werden im Browser erzeugt (WebAudio), leise und sanft; abschaltbar. Richtige Antwort: kleines
Glockenspiel (variiert, manchmal mit Wiehern oder Hufgeklapper); Rundenende/Freischalten: sanfte Fanfare;
falsche Antwort: nur ein sehr leiser neutraler Ton.

## Elternbereich
„Für Eltern“ → Knopf 3 Sekunden halten. Fortschritt je Spiel und Aufgabentyp, knifflige Aufgaben, Stufen anpassen,
Ton, Zurücksetzen, **Abenteuer-Fortschritt je Welt** mit „Hierhin springen“ / „Von vorn“, **Pferdehof aufräumen** (nur Positionen). Optional: **Name des Kindes** und **Geburtstag (Tag/Monat)** – nur lokal gespeichert;
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
URL=http://127.0.0.1:8000/index.html node tools/test-farmfix.js       # Reparatur „Pferd hinter der Scheune“, Spielstand bleibt
python3 tools/build-single.py           # erzeugt pferde-mathe.html (alles in einer Datei)
```
