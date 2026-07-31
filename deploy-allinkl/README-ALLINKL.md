# Leadnase auf All-Inkl hochladen

Diese Version läuft auf normalem **PHP-Webspace** — also auf jedem All-Inkl-Paket.
Kein Node.js, kein npm. Du lädst nur ein paar Dateien per FTP hoch.

## Voraussetzungen

- Ein All-Inkl-Paket mit einer Domain (oder Subdomain).
- **PHP 8.x** für die Domain aktiviert (Standard bei All-Inkl; siehe unten).
- Die **cURL**-Erweiterung – bei All-Inkl standardmäßig an, du musst nichts tun.

## Diese Dateien werden hochgeladen

Lade den **kompletten Inhalt des Ordners `deploy-allinkl/`** hoch (nicht den Ordner selbst,
sondern seinen Inhalt):

```
index.html          ← Startseite / Oberfläche
style.css           ← Design
app.js              ← Frontend-Logik
regions.json        ← Bundesländer + Städte
industries.json     ← Branchen
api/
  leads.php         ← Backend: Lead-Suche
  lib.php           ← gemeinsame Funktionen (wird von leads.php eingebunden)
```

Die Datei `README-ALLINKL.md` (diese hier) musst du **nicht** hochladen.

## Schritt für Schritt

### 1. Domain auf PHP 8 stellen (einmalig)
1. In das All-Inkl **KAS** einloggen: <https://kas.all-inkl.com>
2. Menü **Domain** → bei deiner Domain auf **Bearbeiten**.
3. **PHP-Version** auf eine **8.x**-Version stellen → **Speichern**.

### 2. Dateien hochladen
Zwei Wege — nimm den, der dir leichter fällt:

**Variante A – WebFTP direkt im KAS (kein Extra-Programm nötig)**
1. Im KAS Menü **WebFTP** öffnen und einloggen.
2. In den Ordner deiner Domain wechseln (meist `/` bzw. der Ordner, der auf die
   Domain zeigt — bei All-Inkl oft direkt das Wurzelverzeichnis des FTP-Zugangs).
3. Dateien hochladen. Den Ordner `api` anlegen und die beiden PHP-Dateien
   hineinlegen — die Ordnerstruktur muss genau wie oben bleiben.

**Variante B – FTP-Programm (z. B. FileZilla)**
1. Im KAS Menü **FTP** → einen FTP-Zugang anlegen/ansehen (Host, Benutzer, Passwort).
2. In FileZilla mit diesen Daten verbinden.
3. Links (dein PC) den Inhalt von `deploy-allinkl/` markieren, rechts in den
   Domain-Ordner ziehen. Die Struktur (inkl. Unterordner `api/`) bleibt erhalten.

### 3. Aufrufen
Deine Domain im Browser öffnen, z. B. `https://deine-domain.de`.
Du solltest die Leadnase-Oberfläche sehen. Bundesland → Stadt → Branche → Filter
wählen und **„Leads finden"** klicken.

## In einem Unterordner betreiben (optional)

Willst du es unter `https://deine-domain.de/leads/` laufen lassen, lege im
Domain-Ordner einen Ordner `leads` an und lade den Inhalt dort hinein
(inkl. `leads/api/`). Es sind nur **relative Pfade** verbaut, das funktioniert
ohne Änderung.

## Fehlersuche

- **Seite lädt, aber „Leads finden" bringt einen Fehler**
  Meist ist die Overpass-Abfrage kurz überlastet — einfach nochmal probieren.
  Bei dauerhaftem Fehler prüfe, ob PHP auf 8.x steht und cURL aktiv ist.
- **Statt der Seite wird PHP-Quelltext angezeigt**
  Dann ist PHP für die Domain nicht aktiv (Schritt 1 nachholen).
- **„Branchen werden geladen…" bleibt stehen**
  Dann wurden `regions.json` / `industries.json` nicht (an die richtige Stelle)
  hochgeladen. Sie müssen neben `index.html` liegen.
- **Alles sehr langsam bei „kaputte Webseite"/„beides"**
  Das ist normal: Bei diesen Filtern werden die hinterlegten Webseiten live
  geprüft. Bei „keine Webseite" geht es am schnellsten.

## Gut zu wissen

- Die Betriebsdaten kommen live aus **OpenStreetMap** (Overpass API), kostenlos
  und ohne API-Key. Sie sind nur so vollständig wie OSM — ein starker Hinweis,
  aber vor der Kundenansprache kurz gegenprüfen.
- OpenStreetMap-Daten stehen unter der
  [ODbL](https://www.openstreetmap.org/copyright); bei Weiterverwendung bitte
  entsprechend attribuieren.
