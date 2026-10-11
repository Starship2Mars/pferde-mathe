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

Je Runde 5 Aufgaben, Schwierigkeit passt sich automatisch an. Kein Zeitdruck, keine roten Kreuze –
Fehler führen zu einem sanften Tipp. Belohnung: Hufeisen und Karotten.

## Pferdehof (Vollbild)
Liebevoll gezeichneter Hof (alles Inline-SVG/CSS): Scheune mit Tor zum Öffnen, Koppel, Teich mit Enten,
Apfelbaum, ziehende Wolken, Vögel, Schmetterlinge, wiegendes Gras; Tag- oder warme Abendstimmung je nach Uhrzeit.
Pferde blinzeln, wedeln mit dem Schweif, nicken – und freuen sich beim Antippen. Karotte oder Bürste zum Pferd
ziehen zum Füttern und Putzen. Mit Hufeisen Sachen holen (Heu, Wassertrog, Blumen, Pferdedecke in Farben, Pony,
Fohlen, Schimmel, Rappe, Reitplatz mit Hindernissen, Wetterfahne, Kätzchen im Heu, Regenbogen …) und per
Drag & Drop platzieren. Pferde können eigene Namen bekommen (nur lokal).

## Klänge
Alle Klänge werden im Browser erzeugt (WebAudio), leise und sanft; abschaltbar. Richtige Antwort: kleines
Glockenspiel (variiert, manchmal mit Wiehern oder Hufgeklapper); Rundenende/Freischalten: sanfte Fanfare;
falsche Antwort: nur ein sehr leiser neutraler Ton.

## Elternbereich
„Für Eltern“ → Knopf 3 Sekunden halten. Fortschritt je Spiel und Aufgabentyp, knifflige Aufgaben, Stufen anpassen,
Ton, Zurücksetzen. Optional: **Name des Kindes** und **Geburtstag (Tag/Monat)** – nur lokal gespeichert;
ohne Angaben spricht die App neutral („du“) und zeigt keinen Geburtstags-Countdown.

## Aufs iPad
In Safari öffnen → Teilen → „Zum Home-Bildschirm“. Danach auch offline nutzbar.

## Entwicklung
```
python3 -m http.server 8000             # http://127.0.0.1:8000/
URL=http://127.0.0.1:8000/index.html node tools/test.js webkit        # E2E-Test (playwright)
URL=http://127.0.0.1:8000/index.html node tools/test-stable.js        # Pferdehof in 4 iPad-Größen
python3 tools/build-single.py           # erzeugt pferde-mathe.html (alles in einer Datei)
```
