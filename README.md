# 🧲 Leadnase — Lead-Finder

Findet Betriebe, die **keine Webseite** oder eine **kaputte Webseite** haben —
gefiltert nach **Bundesland**, **Stadt** und **Branche**. Ideal, um potenzielle
Kunden für Webdesign-/Webentwicklungs-Dienstleistungen zu identifizieren.

## So funktioniert es

1. **Bundesland** auswählen → **Stadt** auswählen (oder frei eingeben) → **Branche** auswählen.
2. Filter wählen: *keine Webseite*, *kaputte Webseite* oder *beides*.
3. „Leads finden" klicken.

Im Hintergrund:

- Die Betriebe kommen von **Google Places** (Places API New, Text Search). Dafür ist ein eigener API-Schlüssel nötig.
- Nur Betriebe **mit Kontaktmöglichkeit** (Telefon oder E-Mail) werden angezeigt. Google liefert keine E-Mails, daher ist das in der Praxis die Telefonnummer.
- **„Keine Webseite"** = Google hat für den Betrieb keine Webseite hinterlegt.
- **„Kaputte Webseite"** = die hinterlegte URL wird live aufgerufen und antwortet nicht, hat einen DNS-Fehler, ein abgelaufenes Zertifikat oder liefert einen HTTP-Fehler (4xx/5xx).
- Ergebnisse lassen sich als **CSV** exportieren.

## Starten (lokal)

```bash
npm install
GOOGLE_PLACES_API_KEY=dein_schluessel npm start
```

Dann im Browser öffnen: <http://localhost:3000>

Port anpassen: `PORT=8080 GOOGLE_PLACES_API_KEY=… npm start`

Einen Schlüssel bekommst du in der [Google Cloud Console](https://console.cloud.google.com):
Projekt anlegen → Abrechnung aktivieren → **Places API (New)** aktivieren →
unter *APIs & Dienste → Anmeldedaten* einen **API-Schlüssel** erstellen.

## Auf All-Inkl / PHP-Webhosting betreiben

Für klassisches PHP-Webhosting (z. B. **All-Inkl**) gibt es im Ordner
[`deploy-allinkl/`](deploy-allinkl/) eine fertige PHP-Variante — kein Node.js
nötig, einfach per FTP hochladen (auch automatisch per GitHub Actions). Die
komplette Anleitung inkl. Google-Schlüssel-Einrichtung:
[`deploy-allinkl/README-ALLINKL.md`](deploy-allinkl/README-ALLINKL.md).

## Projektstruktur

```
leadnase/
├── server.js            # Express-Server + Google-Places-Abfrage + Webseiten-Check
├── data/
│   ├── regions.js       # Bundesländer und Städte
│   └── industries.js    # Branchen (Labels)
├── public/              # Frontend (Node-Version)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── deploy-allinkl/      # Fertige PHP-Variante für All-Inkl (siehe README dort)
```

## Gut zu wissen / Grenzen

- **Abdeckung:** Google Places hat sehr gute Daten, ist aber ebenfalls nicht
  lückenlos. „Keine Webseite bei Google" ist ein starker Hinweis — prüfe die
  Leads vor der Ansprache trotzdem kurz.
- **Ergebnis-Limit:** Die Google-Textsuche liefert bis zu ~60 Treffer pro Suche.
- **Keine E-Mails:** Google Places gibt keine E-Mail-Adressen zurück; als Kontakt
  dient die Telefonnummer.
- **Webseiten-Prüfung** ist absichtlich begrenzt (Timeout 8 s, max. 10 parallel),
  damit die Suche zügig bleibt. Manche Server blockieren automatisierte Zugriffe
  und erscheinen dann fälschlich als „kaputt" — im Zweifel manuell nachsehen.
- **Kosten:** Jede Suche verursacht Google-API-Kosten. Setze in der Google Cloud
  Console ein Budget/Kontingent.
- **Nutzungsbedingungen:** Google beschränkt das dauerhafte Speichern von
  Places-Daten und deren Nutzung für Lead-Listen. Prüfe vor kommerzieller
  Nutzung die [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms).

## Lizenz

MIT
