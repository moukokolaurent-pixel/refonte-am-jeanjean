# Rapatrie les 180 médias de am-jeanjean.com dans .\media\AAAA\MM\
# Usage (PowerShell, depuis le dossier du site) : .\telecharger-medias.ps1
# Relançable : les fichiers déjà présents sont sautés.

$ErrorActionPreference = 'Continue'
$list   = 'media-urls.txt'
$dest   = 'media'
$fail   = 'media-echecs.txt'
$base   = 'https://am-jeanjean.com/wp-content/uploads/'
$miroir = 'https://i0.wp.com/am-jeanjean.com/wp-content/uploads/'

if (-not (Test-Path $list)) { Write-Host "Fichier $list introuvable — lance le script depuis le dossier du site." ; exit 1 }

$urls = Get-Content $list | Where-Object { $_.Trim() -ne '' }
$total = $urls.Count
$ok = 0; $ko = 0; $saut = 0
Remove-Item $fail -ErrorAction SilentlyContinue

foreach ($url in $urls) {
    $rel = $url.Substring($base.Length)
    $out = Join-Path $dest ($rel -replace '/', '\')
    $dir = Split-Path $out -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    if ((Test-Path $out) -and ((Get-Item $out).Length -gt 0)) { $saut++; continue }

    $done = $false
    foreach ($try in @($url, ($miroir + $rel))) {
        try {
            Invoke-WebRequest -Uri $try -OutFile $out -TimeoutSec 60 -UseBasicParsing
            if ((Get-Item $out).Length -gt 0) { $done = $true; break }
        } catch { }
    }
    if ($done) { $ok++ } else { Remove-Item $out -ErrorAction SilentlyContinue; Add-Content $fail $url; $ko++ }
    Write-Host -NoNewline "`r$ok téléchargés / $saut déjà présents / $ko échecs    "
}
Write-Host "`n"

$presents = (Get-ChildItem $dest -Recurse -File).Count
Write-Host "Attendus : $total"
Write-Host "Présents : $presents"

Write-Host "`nFichiers suspects (moins de 1 ko, souvent une page d'erreur au lieu de l'image) :"
Get-ChildItem $dest -Recurse -File | Where-Object { $_.Length -lt 1024 } | ForEach-Object { Write-Host "  $($_.FullName) ($($_.Length) o)" }

if (Test-Path $fail) {
    Write-Host "`nÉCHECS à traiter à la main, listés dans $fail :"
    Get-Content $fail | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "`nAucun échec. Le dossier media\ est complet."
}
