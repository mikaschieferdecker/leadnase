<?php
// leadnase — gemeinsame Funktionen für das PHP-Backend.
// Datenquelle: Google Places API (New), Endpunkt "Text Search".
// Enthält nur Funktionsdefinitionen (kein Seiteneffekt), damit die Logik
// auch automatisiert getestet werden kann.

declare(strict_types=1);

// Liefert den Google-Places-API-Schlüssel aus der Umgebungsvariable
// GOOGLE_PLACES_API_KEY oder aus api/config.php (return ['google_places_api_key' => '…']).
function getApiKey(): ?string {
    $env = getenv('GOOGLE_PLACES_API_KEY');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    $cfgPath = __DIR__ . '/config.php';
    if (is_file($cfgPath)) {
        $cfg = include $cfgPath;
        if (is_array($cfg) && !empty($cfg['google_places_api_key'])) {
            return (string) $cfg['google_places_api_key'];
        }
    }
    return null;
}

// Sucht Betriebe über die Google Places Text Search (New).
// Gibt die zusammengeführte Liste der "places"-Objekte zurück (max. $maxPages × 20).
// $maxPages = 1 -> nur ein API-Aufruf (bis zu 20 Treffer), um das Google-Kontingent
// zu schonen. Höher setzen (je +20 Treffer) kostet je Seite einen weiteren Aufruf.
function searchGooglePlaces(string $apiKey, string $textQuery, int $maxPages = 1): array {
    $endpoint = 'https://places.googleapis.com/v1/places:searchText';
    $fieldMask = implode(',', [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.nationalPhoneNumber',
        'places.internationalPhoneNumber',
        'places.websiteUri',
        'places.location',
        'nextPageToken',
    ]);

    $all = [];
    $pageToken = null;

    for ($page = 0; $page < $maxPages; $page++) {
        $payload = [
            'textQuery'    => $textQuery,
            'languageCode' => 'de',
            'regionCode'   => 'DE',
            'pageSize'     => 20,
        ];
        if ($pageToken !== null && $pageToken !== '') {
            $payload['pageToken'] = $pageToken;
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $endpoint,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-Goog-Api-Key: ' . $apiKey,
                'X-Goog-FieldMask: ' . $fieldMask,
            ],
        ]);
        $body  = curl_exec($ch);
        $errno = curl_errno($ch);
        $code  = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            throw new RuntimeException('Netzwerkfehler bei Google Places: ' . curl_strerror($errno));
        }
        $json = json_decode((string) $body, true);
        if ($code >= 400) {
            $msg = is_array($json) ? ($json['error']['message'] ?? "HTTP {$code}") : "HTTP {$code}";
            throw new RuntimeException('Google Places: ' . $msg);
        }
        if (!is_array($json)) {
            throw new RuntimeException('Ungültige Antwort von Google Places');
        }

        foreach (($json['places'] ?? []) as $p) {
            $all[] = $p;
        }

        $pageToken = $json['nextPageToken'] ?? null;
        if ($pageToken === null || $pageToken === '') {
            break;
        }
    }

    return $all;
}

// Entfernt ein abschließendes ", Deutschland" / ", Germany" aus der Adresse.
function cleanAddress(string $addr): string {
    return preg_replace('/,\s*(Deutschland|Germany)\s*$/u', '', $addr) ?? $addr;
}

// Wandelt die Google-Places-Objekte in einheitliche Lead-Datensätze um.
function extractLeads(array $places): array {
    $seen = [];
    $leads = [];

    foreach ($places as $p) {
        $name = $p['displayName']['text'] ?? '';
        if ($name === '') {
            continue;
        }

        $address = cleanAddress((string) ($p['formattedAddress'] ?? ''));
        $key = mb_strtolower($name . '|' . $address);
        if (isset($seen[$key])) {
            continue; // Duplikat.
        }
        $seen[$key] = true;

        $phone   = $p['nationalPhoneNumber'] ?? ($p['internationalPhoneNumber'] ?? '');
        $website = $p['websiteUri'] ?? '';
        $lat     = $p['location']['latitude'] ?? null;
        $lon     = $p['location']['longitude'] ?? null;
        $id      = (string) ($p['id'] ?? '');

        $leads[] = [
            'name'          => $name,
            'address'       => $address,
            'phone'         => (string) $phone,
            'email'         => '', // Google Places liefert keine E-Mail-Adressen.
            'website'       => (string) $website,
            'hasWebsite'    => $website !== '',
            'websiteStatus' => $website !== '' ? 'unknown' : 'none',
            'websiteReason' => null,
            'websiteCode'   => null,
            'lat'           => $lat,
            'lon'           => $lon,
            'mapsUrl'       => $id !== ''
                ? 'https://www.google.com/maps/place/?q=place_id:' . rawurlencode($id)
                : '',
        ];
    }

    return $leads;
}

// Prüft alle Leads mit Webseite parallel (curl_multi), begrenzt auf $concurrency.
// "kaputt" = cURL-Fehler (DNS/Timeout/SSL/…) oder HTTP-Status >= 400.
function checkWebsites(array &$leads, int $concurrency = 10): void {
    $targets = [];
    foreach ($leads as $i => $l) {
        if ($l['hasWebsite']) {
            $targets[] = $i;
        }
    }
    if (!$targets) {
        return;
    }

    $mh = curl_multi_init();
    $handleToLead = []; // spl_object_id => Lead-Index
    $pos = 0;
    $count = count($targets);

    $addNext = function () use (&$pos, $count, &$targets, &$leads, &$handleToLead, $mh): bool {
        if ($pos >= $count) {
            return false;
        }
        $leadIndex = $targets[$pos++];
        $url = $leads[$leadIndex]['website'];
        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 5,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; leadnase/1.0; +lead finder)',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING       => '',
        ]);
        curl_multi_add_handle($mh, $ch);
        $handleToLead[spl_object_id($ch)] = $leadIndex;
        return true;
    };

    for ($k = 0; $k < $concurrency; $k++) {
        if (!$addNext()) {
            break;
        }
    }

    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh, 1.0);

        while ($info = curl_multi_info_read($mh)) {
            $ch = $info['handle'];
            $leadIndex = $handleToLead[spl_object_id($ch)] ?? null;
            $errno = $info['result'];
            $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

            if ($leadIndex !== null) {
                if ($errno !== CURLE_OK || $code === 0 || $code >= 400) {
                    $leads[$leadIndex]['websiteStatus'] = 'broken';
                    $leads[$leadIndex]['websiteReason'] = $errno !== CURLE_OK
                        ? curl_strerror($errno)
                        : "HTTP {$code}";
                    $leads[$leadIndex]['websiteCode'] = $code ?: null;
                } else {
                    $leads[$leadIndex]['websiteStatus'] = 'ok';
                    $leads[$leadIndex]['websiteCode'] = $code;
                }
            }

            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            $addNext(); // Nächste Webseite nachschieben.
        }
    } while ($running > 0 || $pos < $count);

    curl_multi_close($mh);
}
