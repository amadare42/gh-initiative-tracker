Remove-Item dist -Recurse -Force
Remove-Item server.zip -Force
tsc
7z a -tzip -r ./server.zip .\dist\*
