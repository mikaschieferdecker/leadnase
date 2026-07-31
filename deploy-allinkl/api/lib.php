<?php
// leadnase — gemeinsame Funktionen für das PHP-Backend.
// Enthält nur Funktionsdefinitionen (kein Seiteneffekt), damit die Logik
// auch automatisiert getestet werden kann.

declare(strict_types=1);

function escapeOverpass(string $value): string {
    // Backslashes und Anführungszeichen maskieren, damit die Abfrage nicht bricht.
    return str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
}

function buildOverpassQuery(string $state, string $city, array $filters): string {
    $s = escapeOverpass($state);
    $c = escapeOverpass($city);

    $lines = [];
    foreach ($filters as $f) {
        $lines[] = "  nwr{$f}(area.state)(area.city);";
    }
    $body = implode("\n", $lines);

    return "[out:json][timeout:120];\n"
        . "area[\"name\"=\"{$s}\"][\"boundary\"=\"administrative\"][\"admin_level\"=\"4\"]->.state;\n"
        . "area[\"name\"=\"{$c}\"][\"boundary\"=\"administrative\"]->.city;\n"
        . "(\n{$body}\n);\n"
        . "out center tags;";
}

function runOverpass(array $endpoints, string $query): array {
    $lastError = '';
    foreach ($endpoints as $endpoint) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $endpoint,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => 'data=' . rawurlencode($query),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 130,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_USERAGENT      => 'leadnase/1.0 (lead finder tool)',
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $body  = curl_exec($ch);
        $errno = curl_errno($ch);
        $code  = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            $lastError = 'Netzwerkfehler: ' . curl_strerror($errno);
            continue;
        }
        if ($code >= 400) {
            $lastError = "Overpass {$endpoint} antwortete mit HTTP {$code}";
            continue;
        }
        $json = json_decode((string) $body, true);
        if (!is_array($json)) {
            $lastError = 'Ungültige Antwort von Overpass';
            continue;
        }
        return $json;
    }
    throw new RuntimeException($lastError !== '' ? $lastError : 'Alle Overpass-Endpunkte nicht erreichbar');
}

function buildAddress(array $tags): string {
    $street = trim(($tags['addr:street'] ?? '') . ' ' . ($tags['addr:housenumber'] ?? ''));
    $cityLine = trim(($tags['addr:postcode'] ?? '') . ' ' . ($tags['addr:city'] ?? ''));
    $parts = array_filter([$street, $cityLine], fn($x) => $x !== '');
    return implode(', ', $parts);
}

function firstTag(array $tags, array $keys): string {
    foreach ($keys as $k) {
        if (!empty($tags[$k])) {
            return (string) $tags[$k];
        }
    }
    return '';
}

function extractLeads(array $overpassJson): array {
    $seen = [];
    $leads = [];

    foreach (($overpassJson['elements'] ?? []) as $el) {
        $tags = $el['tags'] ?? [];
        $name = firstTag($tags, ['name', 'brand', 'operator']);
        if ($name === '') {
            continue; // Ohne Namen ist ein Lead nicht brauchbar.
        }

        $address = buildAddress($tags);
        $key = mb_strtolower($name . '|' . $address);
        if (isset($seen[$key])) {
            continue; // Duplikat.
        }
        $seen[$key] = true;

        $website = firstTag($tags, ['website', 'contact:website', 'url', 'contact:url']);
        $phone   = firstTag($tags, ['phone', 'contact:phone', 'contact:mobile']);
        $email   = firstTag($tags, ['email', 'contact:email']);

        $lat = $el['lat'] ?? ($el['center']['lat'] ?? null);
        $lon = $el['lon'] ?? ($el['center']['lon'] ?? null);

        $leads[] = [
            'name'          => $name,
            'address'       => $address,
            'phone'         => $phone,
            'email'         => $email,
            'website'       => $website,
            'hasWebsite'    => $website !== '',
            'websiteStatus' => $website !== '' ? 'unknown' : 'none',
            'websiteReason' => null,
            'websiteCode'   => null,
            'lat'           => $lat,
            'lon'           => $lon,
            'mapsUrl'       => ($lat !== null && $lon !== null)
                ? "https://www.openstreetmap.org/?mlat={$lat}&mlon={$lon}#map=19/{$lat}/{$lon}"
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
