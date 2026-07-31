# 🧲 Leadnase — Lead-Finder

Findet Betriebe, die **keine Webseite** oder eine **kaputte Webseite** haben —
gefiltert nach **Bundesland**, **Stadt** und **Branche**. Ideal, um potenzielle
Kunden für Webdesign-/Webentwicklungs-Dienstleistungen zu identifizieren.

## So funktioniert es

1. **Bundesland** auswählen → **Stadt** auswählen (oder frei eingeben) → **Branche** auswählen.
2. Filter wählen: *keine Webseite*, *kaputte Webseite* oder *beides*.
3. „Leads finden" klicken.

Im Hintergrund:

- Die Betriebe kommen aus **OpenStreetMap** über die [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (kostenlos, kein API-Key nötig).
- **„Keine Webseite"** = in OSM ist kein `website`-Tag hinterlegt.
- **„Kaputte Webseite"** = die hinterlegte URL wird live aufgerufen und antwortet nicht, hat einen DNS-Fehler, ein abgelaufenes Zertifikat oder liefert einen HTTP-Fehler (4xx/5xx).
- Ergebnisse lassen sich als **CSV** exportieren.

## Starten

```bash
npm install
npm start
```

Dann im Browser öffnen: <http://localhost:3000>

Port anpassen: `PORT=8080 npm start`

## Projektstruktur

```
leadnase/
├── server.js            # Express-Server + Overpass-Abfrage + Webseiten-Check
├── data/
│   ├── regions.js       # Bundesländer und Städte
│   └── industries.js    # Branchen → OpenStreetMap-Tags
└── public/
    ├── index.html       # Oberfläche
    ├── style.css        # Design
    └── app.js           # Frontend-Logik
```

## Gut zu wissen / Grenzen

- **Datenqualität:** Die Ergebnisse sind nur so vollständig wie OpenStreetMap.
  Nicht jeder Betrieb ist erfasst, und nicht bei jedem ist eine Webseite gepflegt.
  „Keine Webseite in OSM" heißt nicht zwingend „hat keine Webseite" — es ist ein
  starker Hinweis, aber prüfe die Leads vor der Ansprache.
- **Webseiten-Prüfung** ist absichtlich begrenzt (Timeout 8 s, max. 10 parallel),
  damit die Suche zügig bleibt. Manche Server blockieren automatisierte Zugriffe
  und erscheinen dann fälschlich als „kaputt" — im Zweifel manuell nachsehen.
- **Städtenamen:** Über die Schnittmenge „innerhalb Bundesland UND innerhalb Stadt"
  werden mehrdeutige Namen (z. B. mehrere Orte gleichen Namens) meist korrekt aufgelöst.
- **Nutzung der Daten:** OpenStreetMap-Daten stehen unter der
  [ODbL](https://www.openstreetmap.org/copyright). Bei Weiterverwendung entsprechend attribuieren.
- **Overpass-Fair-Use:** Die Overpass API ist ein kostenloser Gemeinschaftsdienst.
  Bitte nicht mit Massenabfragen überlasten.

## Lizenz

MIT
