# Leadnase auf All-Inkl hochladen

Diese Version läuft auf normalem **PHP-Webspace** — also auf jedem All-Inkl-Paket.
Kein Node.js, kein npm. Du lädst nur ein paar Dateien per FTP hoch.

## Voraussetzungen

- Ein All-Inkl-Paket mit einer Domain (oder Subdomain).
- **PHP 8.x** für die Domain aktiviert (Standard bei All-Inkl; siehe unten).
- Die **cURL**-Erweiterung – bei All-Inkl standardmäßig an, du musst nichts tun.
- Ein **Google-Places-API-Schlüssel** (siehe nächster Abschnitt).

## Google-Places-API-Schlüssel besorgen (einmalig)

Die Betriebsdaten kommen von Google Places. Dafür brauchst du einen Schlüssel:

1. Google Cloud Console öffnen: <https://console.cloud.google.com>
   (die Willkommens-Umfrage kannst du mit „Vorerst überspringen" überspringen).
2. Oben ein **Projekt anlegen** (z. B. „leadnase").
3. **Abrechnung aktivieren** (Menü **Abrechnung** → Zahlungsmethode hinterlegen).
   Google hat ein großzügiges monatliches Gratis-Guthaben; ohne Abrechnung
   liefert die API aber keine Daten.
4. Die API aktivieren: Menü **APIs & Dienste → Bibliothek** → nach
   **„Places API (New)"** suchen → **Aktivieren**.
5. Schlüssel erstellen: **APIs & Dienste → Anmeldedaten** →
   **Anmeldedaten erstellen → API-Schlüssel**. Den Schlüssel kopieren.
6. Empfohlen: Beim Schlüssel unter **API-Einschränkungen** nur die
   **Places API (New)** erlauben und ein **Budget/Kontingent** setzen, damit
   keine unerwarteten Kosten entstehen.

Diesen Schlüssel hinterlegst du gleich als Secret (automatischer Upload) oder
in einer `config.php` (manueller Upload) — **nie** direkt im Code.

> Hinweis: Google Places liefert **keine E-Mail-Adressen**. Als Kontaktweg
> dient dann die Telefonnummer (Betriebe ganz ohne Kontakt werden ausgeblendet).

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
  config.php        ← dein Google-API-Schlüssel (siehe unten; NICHT im Repo)
```

Die Dateien `README-ALLINKL.md` und `api/config.sample.php` musst du **nicht**
hochladen. Beim automatischen Upload wird `api/config.php` aus dem Secret
erzeugt — beim manuellen Upload legst du sie selbst an (siehe unten).

## Automatischer Upload per GitHub Actions (empfohlen)

Damit die Dateien **bei jeder Änderung von selbst** auf All-Inkl hochgeladen
werden, ist ein fertiger Workflow eingerichtet:
`.github/workflows/deploy-allinkl.yml`. Du musst nur einmal deine
FTP-Zugangsdaten als „Secrets" hinterlegen — sie landen **nicht** im Code.

### Einmalig einrichten

1. **FTP-Zugang bei All-Inkl anlegen** (im KAS: Menü **FTP** → **FTP-Zugang anlegen**).
   Wichtig: Den Zugang **direkt auf das Verzeichnis deiner Domain** zeigen lassen.
   Notiere dir **Host** (z. B. `wNNN.kasserver.com`), **Benutzer** und **Passwort**.

2. **Secrets im GitHub-Repository hinterlegen**
   Repo öffnen → **Settings** → **Secrets and variables** → **Actions** →
   Reiter **Secrets** → **New repository secret**. Lege drei Secrets an:

   | Name                     | Wert                                     |
   |--------------------------|------------------------------------------|
   | `FTP_SERVER`             | FTP-Host, z. B. `wNNN.kasserver.com`     |
   | `FTP_USERNAME`           | dein FTP-Benutzername                    |
   | `FTP_PASSWORD`           | dein FTP-Passwort                        |
   | `GOOGLE_PLACES_API_KEY`  | dein Google-Places-API-Schlüssel         |

   Der Workflow schreibt aus `GOOGLE_PLACES_API_KEY` automatisch die Datei
   `api/config.php` und lädt sie mit hoch — du musst dich um den Schlüssel auf
   dem Server nicht kümmern.

3. **(Optional) Zielordner festlegen**
   Nur nötig, wenn der FTP-Zugang **nicht** direkt in der Domain landet.
   Reiter **Variables** → **New repository variable**:
   `FTP_SERVER_DIR` = Zielordner **mit Schrägstrich am Ende**, z. B. `/leads/`.
   Ohne diese Variable wird ins Login-Verzeichnis (`./`) geladen.

### Ab dann läuft es automatisch

- Jeder Push, der etwas in `deploy-allinkl/` ändert, lädt automatisch hoch.
- Manuell auslösen: Repo → **Actions** → **Deploy zu All-Inkl (FTP)** →
  **Run workflow**.
- Es werden nur geänderte Dateien übertragen (schneller Sync). Bestehende
  Dateien, die nicht zum Projekt gehören, werden **nicht** gelöscht.

> Läuft der Upload auf einen TLS-/Zertifikatsfehler, in der Workflow-Datei
> `protocol: ftps` testweise auf `protocol: ftp` ändern (unverschlüsselt) oder
> `protocol: ftps-legacy` probieren.

---

## Manueller Upload (Alternative)

Wenn du lieber ohne GitHub Actions arbeitest, kannst du die Dateien auch von
Hand hochladen:

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

### 3. API-Schlüssel als config.php anlegen
1. Datei `api/config.sample.php` zu `api/config.php` kopieren.
2. Darin den Platzhalter durch deinen echten Google-Places-API-Schlüssel ersetzen.
3. `api/config.php` in den Ordner `api/` auf dem Server hochladen.

### 4. Aufrufen
Deine Domain im Browser öffnen, z. B. `https://deine-domain.de`.
Du solltest die Leadnase-Oberfläche sehen. Bundesland → Stadt → Branche → Filter
wählen und **„Leads finden"** klicken.

## In einem Unterordner betreiben (optional)

Willst du es unter `https://deine-domain.de/leads/` laufen lassen, lege im
Domain-Ordner einen Ordner `leads` an und lade den Inhalt dort hinein
(inkl. `leads/api/`). Es sind nur **relative Pfade** verbaut, das funktioniert
ohne Änderung.

## Fehlersuche

- **Fehler „Google-Places-API-Schlüssel fehlt"**
  Beim automatischen Upload das Secret `GOOGLE_PLACES_API_KEY` setzen; beim
  manuellen Upload `api/config.php` anlegen (siehe oben).
- **Fehler mit „API key not valid", „billing", „PERMISSION_DENIED" o. ä.**
  Kommt direkt von Google: prüfe, ob **Places API (New)** aktiviert, die
  **Abrechnung** eingerichtet und der Schlüssel korrekt ist.
- **Seite lädt, aber „Leads finden" bringt einen Fehler**
  Einfach nochmal probieren. Bei dauerhaftem Fehler prüfe, ob PHP auf 8.x steht
  und cURL aktiv ist.
- **Statt der Seite wird PHP-Quelltext angezeigt**
  Dann ist PHP für die Domain nicht aktiv (Schritt 1 nachholen).
- **„Branchen werden geladen…" bleibt stehen**
  Dann wurden `regions.json` / `industries.json` nicht (an die richtige Stelle)
  hochgeladen. Sie müssen neben `index.html` liegen.
- **Alles sehr langsam bei „kaputte Webseite"/„beides"**
  Das ist normal: Bei diesen Filtern werden die hinterlegten Webseiten live
  geprüft. Bei „keine Webseite" geht es am schnellsten.

## Gut zu wissen

- Die Betriebsdaten kommen live von **Google Places**. Pro Suche werden bis zu
  ~60 Treffer geladen (Limit der Google-Textsuche).
- Google Places liefert **keine E-Mail-Adressen** — als Kontakt dient die
  Telefonnummer. Betriebe ohne jeden Kontakt werden ausgeblendet.
- **Kosten:** Jede Suche verursacht Google-API-Kosten (im Rahmen deines
  Kontingents/Budgets). Setze in der Google Cloud Console ein Budget/Limit.
- **Nutzungsbedingungen:** Google beschränkt das dauerhafte Speichern von
  Places-Daten und deren Nutzung für Lead-Listen. Prüfe vor kommerzieller
  Nutzung die [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms).
