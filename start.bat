@echo off
title StreamVox YT - YouTube LiveChat Alert & TTS
color 0b
echo ========================================================
echo   StreamVox YT - YouTube LiveChat Alert ^& TTS Studio
echo ========================================================
echo Membuka server lokal...
start "" http://localhost:3030/
node server.js
pause
