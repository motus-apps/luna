# Erklärbilder für den Wissen-Bereich

Die Bilder werden mit ChatGPT im Browser erzeugt (wie bei 11kickers) und dann hier eingebaut.
Solange ein Bild fehlt, zeigt Luna die gezeichnete Grafik – es geht also nichts kaputt.

## Plätze und Dateinamen

| Schlüssel in `BILDER` | Datei in `img/wissen/` | Wo | Format |
|---|---|---|---|
| `hero` | `zyklus.webp` | oben im Wissen-Bereich, unter dem Einleitungstext | 16:9, z. B. 1600×900 |
| `wi-winter` | `periode.webp` | Karte „Periode“ | 4:3, z. B. 1200×900 |
| `wi-fruehling` | `follikel.webp` | Karte „Follikelphase“ | 4:3 |
| `wi-sommer` | `eisprung.webp` | Karte „Eisprung“ | 4:3 |
| `wi-herbst` | `luteal.webp` | Karte „Lutealphase“ | 4:3 |

(Die IDs `wi-winter` usw. sind historisch – angezeigt werden nur die echten Phasennamen.)

## Einbauen

1. Bild als WebP speichern, möglichst unter 150 KB (z. B. `cwebp -q 78 -resize 1200 0 in.png -o periode.webp`).
2. Datei nach `img/wissen/` legen.
3. In `index.html` in `const BILDER={…}` die passende Zeile einkommentieren.
4. In `sw.js` die Datei in `FILES` aufnehmen (dann ist sie auch beim ersten Offline-Start da) und `CACHE` hochzählen.
5. Im hellen und dunklen Modus anschauen – die Bilder haben feste Farben, der dunkle Grund passt zu beiden.

## Vorlagen für ChatGPT

Stil-Teil – in jede Anfrage kopieren:

> Flache, ruhige Editorial-Illustration, weiche organische Formen, feine Körnung, keine Schrift, kein Text, keine detaillierten Gesichter. Farbpalette: fast schwarzer Nachthimmel-Hintergrund (#120c16), Rosé (#fbf3f2), Beerenrot, sanftes Pfirsich/Gold, Salbeigrün, Lavendel. Ein leuchtender Mond mit weichem Farbverlauf als wiederkehrendes Motiv. Viel Luft am Rand, Hauptmotiv mittig (die Ränder werden evtl. beschnitten).

Motive:

- **Zyklus (hero, 16:9):** Links ein schlichter 24-Stunden-Kreis wie eine Uhr, rechts ein Ring aus vier Mondphasen in Beerenrot, Salbeigrün, Gold und Lavendel – ausgewogen nebeneinander, „sein Takt und ihr Takt“.
- **Periode (4:3):** Abnehmender Mond, eine Person eingekuschelt in eine Decke mit Wärmflasche und Teetasse, Beerenrot als Hauptton, ruhig und nach innen gekehrt.
- **Follikelphase (4:3):** Zunehmender Mond, aufkeimende Pflanze mit ersten Blättern, Person beim Spaziergang, Salbeigrün, frische Energie.
- **Eisprung (4:3):** Voller, strahlender Mond, zwei Personen beim Date unter Lichterketten, warmes Pfirsich und Gold, Leichtigkeit und Höhepunkt.
- **Lutealphase (4:3):** Mond wird wieder schmaler, gemütlicher Abend auf dem Sofa mit Kerzenlicht, Lavendel, sanfte Wellen als Zeichen für wechselnde Stimmung.

Tipp: Erst das Periode-Bild erzeugen, dann für die anderen sagen „im exakt gleichen Stil wie das vorherige Bild“ – so wirken alle wie aus einer Serie.
