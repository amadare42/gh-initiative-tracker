if (Test-Path dist) {
    Remove-Item dist -Recurse -Force
}
if (Test-Path server.zip) {
    Remove-Item server.zip -Force
}
tsc
7z a -tzip -r ./server.zip .\dist\*
