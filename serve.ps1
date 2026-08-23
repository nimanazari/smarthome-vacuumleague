# ============================================================
#  serve.ps1 - the NO-INSTALL web server (pure PowerShell).
#  Windows ships PowerShell, so nothing needs installing:
#  serve.bat falls back to this when Python is missing.
#  Serves THIS folder on http://localhost:8801/ and opens the
#  browser. Close the window to stop.
#  (ASCII only on purpose: PS 5.1 reads BOM-less files as ANSI.)
# ============================================================
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8801

$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8'
  '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'
  '.svg'='image/svg+xml'; '.ico'='image/x-icon'
  '.woff2'='font/woff2'; '.woff'='font/woff'; '.ttf'='font/ttf'
  '.py'='text/x-python; charset=utf-8'; '.md'='text/markdown; charset=utf-8'
  '.txt'='text/plain; charset=utf-8'; '.wasm'='application/wasm'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try { $listener.Start() } catch {
  Write-Host "Port $port is busy - is the game already running? http://localhost:$port/"
  Start-Process "http://localhost:$port/"
  exit
}
Write-Host ""
Write-Host "  Smart Home League server (PowerShell, no install)"
Write-Host "  serving: $root"
Write-Host "  open:    http://localhost:$port/"
Write-Host "  close this window to stop."
Write-Host ""
Start-Process "http://localhost:$port/"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    while (($null -ne ($l = $reader.ReadLine())) -and $l -ne '') { }   # drain headers
    if (-not $requestLine) { $client.Close(); continue }
    $parts = $requestLine -split ' '
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $path = [Uri]::UnescapeDataString(($rawPath -split '\?')[0])
    if ($path.EndsWith('/')) { $path = $path + 'index.html' }
    $safe = $path -replace '/', '\'
    $file = Join-Path $root $safe.TrimStart('\')
    $full = [System.IO.Path]::GetFullPath($file)
    $ok = $full.StartsWith([System.IO.Path]::GetFullPath($root)) -and (Test-Path $full -PathType Leaf)
    if ($ok) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 - not found')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length)
      $stream.Write($body, 0, $body.Length)
    }
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
