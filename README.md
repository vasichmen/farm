# Усадьба Лыково — каркас сайта

Каркас публичного сайта: серверный HTML на Laravel, клиентские острова на Vue 3
(Options API) и сборка на Vite.

## Требования

- PHP 8.5, Composer
- Node.js 26, npm
- PostgreSQL 15 (для локального запуска)

## Быстрый старт

```bash
composer setup
composer dev
```

`composer setup` ставит PHP- и npm-зависимости, создаёт `.env` и `APP_KEY`, собирает
production-ресурсы. Миграции не выполняются: доменной схемы в каркасе нет.

`composer dev` запускает сервер, очередь, просмотр логов и Vite одной командой.
Сайт открывается по адресу <http://127.0.0.1:8000>.

## Раздельный запуск

В двух терминалах:

```bash
php artisan serve
npm run dev
```

Результат тот же, что у `composer dev`: главная страница отвечает 200 и получает стили
и скрипты от dev-сборки.

## Сборка

```bash
npm run build
```

Собирает production-ресурсы в `public/build` и создаёт манифест с content-hash в именах
файлов. После сборки страницы можно отдавать обычным `php artisan serve` без Vite.

## Проверки качества

```bash
npm run lint          # ESLint + Prettier
npm run format        # автоформатирование
npm run typecheck     # vue-tsc --noEmit
npm run test:e2e      # Playwright, требует запущенного composer dev
composer analyse      # PHPStan / Larastan
./vendor/bin/pint --test
composer test         # php artisan test
```

Браузерные тесты не поднимают собственный веб-сервер: сначала запустите `composer dev`
(или `php artisan serve` + `npm run dev`), затем `npm run test:e2e`. Адрес можно
переопределить переменной `PLAYWRIGHT_BASE_URL`. Для первого запуска установите браузер
Playwright:

```bash
npx playwright install chromium
```

## Диагностика базы данных

В окружении `local` middleware `EnsureDatabaseIsAvailable` проверяет подключение к БД до
обработки запроса. Если PostgreSQL недоступен, страница отвечает статусом 503 и
показывает понятное сообщение без текста исключения и параметров подключения.

Проверка:

```bash
DB_PORT=1 php artisan serve --port=8001
curl -i http://127.0.0.1:8001/
```

Остановить `composer dev` можно сочетанием `Ctrl+C` — вместе с ним завершаются сервер,
очередь, логи и Vite.
