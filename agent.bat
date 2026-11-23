@echo off
chcp 65001 >nul
title TABLO agent
cd /d "%~dp0"

echo ============================================
echo   TABLO agent - запуск
echo   Папка: %CD%
echo ============================================
echo.

set PYRUN=
py -3 --version >nul 2>&1
if not errorlevel 1 set PYRUN=py -3

if "%PYRUN%"=="" (
    python --version >nul 2>&1
    if not errorlevel 1 set PYRUN=python
)

if "%PYRUN%"=="" (
    echo [ОШИБКА] Python не найден.
    echo Проверьте, установлен ли Python и стоит ли галочка "Add to PATH".
    pause
    exit /b 1
)

echo [OK] Python найден: %PYRUN%
echo Запуск агента...
echo.
%PYRUN% assets\py\agent.py

echo.
echo ============================================
echo   Агент завершил работу.
echo ============================================
pause
