@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js LTS em https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalando as dependencias gratuitas do projeto...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar as dependencias. Confira sua conexao e tente novamente.
    pause
    exit /b 1
  )
)
echo Iniciando o editor ANTROPOLOGO RPG...
start "ANTROPOLOGO - Servidor local" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173"
echo O editor esta abrindo em http://127.0.0.1:5173
