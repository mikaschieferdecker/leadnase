<?php
// Vorlage für die Konfiguration.
//
// So hinterlegst du deinen Google-Places-API-Schlüssel manuell:
//   1. Diese Datei zu "config.php" kopieren.
//   2. Den Platzhalter durch deinen echten Schlüssel ersetzen.
//   3. config.php in denselben Ordner (api/) hochladen.
//
// WICHTIG: config.php niemals ins Git-Repository committen. Bei der
// automatischen Bereitstellung (GitHub Actions) wird config.php aus dem
// Secret GOOGLE_PLACES_API_KEY erzeugt — dann musst du hier nichts tun.

return [
    'google_places_api_key' => 'HIER_DEINEN_GOOGLE_API_SCHLUESSEL_EINTRAGEN',
];
