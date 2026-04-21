<?php
$nodeUrl = 'http://127.0.0.1:3120';
$path = $_SERVER['REQUEST_URI'];
$url = $nodeUrl . $path;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Forward request method
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward POST body
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward relevant headers
$headers = [];
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0) {
        $header = str_replace('_', '-', substr($key, 5));
        if (!in_array(strtolower($header), ['host', 'connection', 'transfer-encoding'])) {
            $headers[] = "$header: $value";
        }
    }
}
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers[] = "Content-Type: " . $_SERVER['CONTENT_TYPE'];
}
$headers[] = "X-Forwarded-For: " . $_SERVER['REMOTE_ADDR'];
$headers[] = "X-Forwarded-Proto: https";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(502);
    echo 'Proxy Error: ' . curl_error($ch);
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Forward response headers
foreach (explode("\r\n", $responseHeaders) as $line) {
    if (stripos($line, 'transfer-encoding:') === false && 
        stripos($line, 'connection:') === false &&
        !empty(trim($line)) && 
        strpos($line, 'HTTP/') !== 0) {
        header($line);
    }
}

http_response_code($httpCode);
echo $responseBody;
