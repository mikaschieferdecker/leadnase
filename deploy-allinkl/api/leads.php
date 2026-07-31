<?php
// leadnase — Lead-Suche (PHP-Backend für All-Inkl & andere PHP-Hoster)
//
// Datenquelle: Google Places API (New).
// Erwartet einen POST mit JSON-Body: { state, city, industryId, filter }
// Antwortet mit JSON: { meta: {...}, leads: [...] }
//
// Es werden keine externen Bibliotheken benötigt — nur PHP mit der
// cURL-Erweiterung (auf All-Inkl standardmäßig aktiv). Der Google-API-Schlüssel
// wird über die Umgebungsvariable GOOGLE_PLACES_API_KEY oder api/config.php geladen.

declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
@set_time_limit(300);

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $code, string $message, ?string $detail = null): void {
    $p = ['error' => $message];
    if ($detail !== null) {
        $p['detail'] = $detail;
    }
    respond($code, $p);
}

// --- Eingabe lesen und validieren ------------------------------------------

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}

$state      = trim((string) ($input['state'] ?? ''));
$city       = trim((string) ($input['city'] ?? ''));
$industryId = trim((string) ($input['industryId'] ?? ''));
$filter     = (string) ($input['filter'] ?? 'none');
if (!in_array($filter, ['none', 'broken', 'both'], true)) {
    $filter = 'none';
}

if ($state === '' || $city === '' || $industryId === '') {
    fail(400, 'Bitte Bundesland, Stadt und Branche angeben.');
}

// Stammdaten laden (liegen eine Ebene über dem api-Ordner).
$regionsDoc    = json_decode((string) @file_get_contents(__DIR__ . '/../regions.json'), true);
$industriesDoc = json_decode((string) @file_get_contents(__DIR__ . '/../industries.json'), true);
if (!is_array($regionsDoc) || !is_array($industriesDoc)) {
    fail(500, 'Stammdaten (regions.json / industries.json) konnten nicht geladen werden.');
}

$bundeslaender = $regionsDoc['bundeslaender'] ?? [];
if (!in_array($state, $bundeslaender, true)) {
    fail(400, "Unbekanntes Bundesland: {$state}");
}

$industry = null;
foreach (($industriesDoc['industries'] ?? []) as $i) {
    if (($i['id'] ?? null) === $industryId) {
        $industry = $i;
        break;
    }
}
if ($industry === null) {
    fail(400, "Unbekannte Branche: {$industryId}");
}

$apiKey = getApiKey();
if ($apiKey === null) {
    fail(500, 'Google-Places-API-Schlüssel fehlt. Bitte in api/config.php hinterlegen (siehe config.sample.php).');
}

// --- Ablauf -----------------------------------------------------------------

try {
    $textQuery = ($industry['label'] ?? $industryId) . ' in ' . $city;
    $places = searchGooglePlaces($apiKey, $textQuery);
    $leads = extractLeads($places);

    $totalFound = count($leads);
    $checkedCount = 0;

    if ($filter === 'broken' || $filter === 'both') {
        $checkedCount = count(array_filter($leads, fn($l) => $l['hasWebsite']));
        checkWebsites($leads, 10);
    }

    if ($filter === 'none') {
        $out = array_filter($leads, fn($l) => !$l['hasWebsite']);
    } elseif ($filter === 'broken') {
        $out = array_filter($leads, fn($l) => $l['hasWebsite'] && $l['websiteStatus'] === 'broken');
    } else {
        $out = array_filter($leads, fn($l) => !$l['hasWebsite'] || $l['websiteStatus'] === 'broken');
    }
    // Nur Leads mit Kontaktmöglichkeit (Telefon oder E-Mail) behalten.
    $out = array_filter($out, fn($l) => $l['phone'] !== '' || $l['email'] !== '');
    $out = array_values($out);

    usort($out, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));

    respond(200, [
        'meta' => [
            'state'           => $state,
            'city'            => $city,
            'industry'        => $industry['label'] ?? $industryId,
            'filter'          => $filter,
            'totalFound'      => $totalFound,
            'websitesChecked' => $checkedCount,
            'resultCount'     => count($out),
        ],
        'leads' => $out,
    ]);
} catch (Throwable $e) {
    fail(502, 'Die Abfrage ist fehlgeschlagen. Bitte später erneut versuchen.', $e->getMessage());
}
