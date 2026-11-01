# Шрифты

Оба шрифта распространяются по лицензии SIL Open Font License 1.1. Тексты лицензий лежат
рядом: `OFL-CormorantGaramond.txt`, `OFL-Manrope.txt`.

## Cormorant Garamond

- Начертания: 500, 600, 700 normal; 500 italic.
- Подмножества: `cyrillic`, `latin`.
- Источник: пакет `@fontsource/cormorant-garamond` (npm), файлы WOFF2/WOFF из
  `node_modules/@fontsource/cormorant-garamond/files`.
- Использование: заголовки, названия товаров, цены, курсивные цитаты.

## Manrope

- Начертания: 400, 600, 700, 800 normal.
- Подмножества: `cyrillic`, `latin`.
- Источник: пакет `@fontsource/manrope` (npm), файлы WOFF2/WOFF из
  `node_modules/@fontsource/manrope/files`.
- Использование: интерфейс и основной текст.

## Сборка

Файлы шрифтов не коммитятся: `laravel-vite-plugin` берёт их из `node_modules`, собирает
в `public/build/assets` и формирует `public/build/fonts-manifest.json`. Директива `@fonts`
в layout подключает preload и inline `@font-face`.