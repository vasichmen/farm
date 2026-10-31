# Tasks

## 1. Bootstrap Laravel 13 и окружение

- [x] 1.1 Поставить скелет Laravel 13 во временный каталог (`composer create-project laravel/laravel:^13.0 … --no-install --no-scripts`) и перенести его в корень репозитория, не затрагивая `AGENTS.md`, `rules.md`, `docs/`, `openspec/`, `.agents/`, `.opencode/`, `.git/`. Проверка: `git status --short` показывает только добавления, а `ls app bootstrap config database public resources routes storage` перечисляет каталоги скелета.
- [x] 1.2 Объединить `.gitignore` скелета с проектным, сохранив проектные правила (`/docs/tz`, `/public/build`, `/public/hot`, `.env`). Проверка: `git check-ignore -v node_modules public/build public/hot .env storage/logs/laravel.log docs/tz` находит совпадения, а `git check-ignore .env.example` завершается с ненулевым кодом.
- [x] 1.3 Перевести `.env.example` на PostgreSQL по ТЗ §15.3 и задать `APP_NAME`, `APP_URL=http://127.0.0.1:8000`, `APP_LOCALE=ru`, `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync`. Проверка: после `cp .env.example .env` команда `php artisan about` показывает pgsql, file-сессии/кэш, sync-очередь и локаль `ru`.
- [x] 1.4 Выполнить `composer install` и `php artisan key:generate`. Проверка: `php artisan --version` сообщает Laravel 13.x, `vendor/autoload.php` существует, `APP_KEY` в `.env` непустой.
- [x] 1.5 Убрать `php artisan migrate --force` из скрипта `composer setup`, оставив install/env/key/npm install/build, и сохранить дефолтные миграции без выполнения. Проверка: `composer run-script --list` показывает `setup` и `dev`, в теле `setup` нет `migrate`, `ls database/migrations` содержит только файлы скелета.

## 2. Сборка клиентских ресурсов

- [x] 2.1 Обновить `package.json`: добавить `vue`, `@vitejs/plugin-vue`, `typescript`, `vue-tsc`; удалить Tailwind (`tailwindcss`, `@tailwindcss/vite`); задать скрипты `dev`, `build`, `typecheck`. Проверка: `npm install` завершается успешно, `npm ls vue vite typescript vue-tsc` не показывает missing.
- [x] 2.2 Скопировать `docs/handoff/04-tokens/tokens.css` в `resources/css/tokens.css` и подключить его из `resources/css/app.css` вместе с базовой типографикой. Проверка: `grep -c -- '--' resources/css/tokens.css` показывает непустой набор токенов, `resources/css/app.css` импортирует `tokens.css` и не содержит Tailwind-директив.
- [x] 2.3 Создать минимальный `resources/js/app.ts` как единственную точку входа без островов. Проверка: файл существует, не содержит `console.log` и временных заглушек, `resources/js` не содержит второго entry-point.
- [x] 2.4 Создать `vite.config.ts` с `laravel-vite-plugin`, `@vitejs/plugin-vue`, входами `resources/css/app.css` и `resources/js/app.ts` и alias `@` → `resources/js`. Проверка: `npm run build` находит оба входа, завершается с кодом 0, а `public/build/manifest.json` содержит записи `resources/css/app.css` и `resources/js/app.ts`.
- [x] 2.5 Включить TypeScript strict: `tsconfig.json` (при необходимости `tsconfig.node.json`) с `strict: true`. Проверка: `npm run typecheck` (`vue-tsc --noEmit`) завершается с кодом 0.
- [x] 2.6 Проверить отказ production-сборки: временно внести синтаксическую ошибку в `app.ts`, выполнить `npm run build`, убедиться в ненулевом коде и сообщении об ошибке, откатить ошибку и снова собрать. Проверка: обе сборки выполнены, итоговая сборка успешна.
- [x] 2.7 Проверить content-hash: зафиксировать имя CSS-файла из `manifest.json`, изменить `app.css`, пересобрать и убедиться, что имя CSS-файла изменилось. Проверка: имена в манифесте до и после сборки различаются.
- [x] 2.8 Проверить отдачу собранных ресурсов: без `public/hot` запустить `php artisan serve` и запросить адреса из манифеста. Проверка: каждый адрес отвечает 200 с `Content-Type: text/css` или `text/javascript`.

## 3. Страницы каркаса и 404

- [x] 3.1 Добавить в `routes/web.php` пять именованных GET-роутов (`home`, `about`, `preorder`, `how-to-order`, `contacts`) и `Route::fallback([PageController::class, 'notFound'])`. Проверка: `php artisan route:list --except-vendor` показывает пять имён с методом GET и fallback без дублей URI.
- [x] 3.2 Создать тонкий `app/Http/Controllers/PageController.php` с пятью методами страниц и `notFound()`, каждый передаёт `$meta` и возвращает `view(...)`. Проверка: `php -l` проходит, `php artisan route:list` сопоставляет роуты методам, `grep -nE 'DB::|::query\(|->where\(' app/Http/Controllers/PageController.php` не находит запросов к БД.
- [x] 3.3 Создать `resources/views/layouts/app.blade.php` (`lang="ru"`, `partials/meta`, `@vite`, минимальный `<header>` с пятью ссылками, `<main>`) и `resources/views/partials/meta.blade.php` (`title`, `description`, абсолютный `canonical`). Проверка: `php artisan view:cache` компилирует шаблоны, а `curl -s http://127.0.0.1:8000/` содержит `lang="ru"`, непустые `title`, `description`, абсолютный `canonical` и ссылки на все пять страниц.
- [x] 3.4 Создать главную страницу с `h1` и текстом-заглушкой на русском. Проверка: `curl -s http://127.0.0.1:8000/` содержит `<h1` и текст заглушки в исходном HTML без выполнения JS.
- [x] 3.5 Создать страницы `/about`, `/preorder`, `/how-to-order`, `/contacts` с `h1`, текстом-заглушкой и ссылкой на `/`. Проверка: каждый адрес отвечает 200, содержит `<h1`, `href="/"`, а `title`/`description` отличаются от главной.
- [x] 3.6 Создать `resources/views/layouts/error.blade.php`, `resources/views/errors/404.blade.php` и fallback-метод контроллера. Проверка: `GET /no-such-page` возвращает 404 с HTML-страницей сайта как при `APP_DEBUG=true`, так и при `APP_DEBUG=false`.
- [x] 3.7 Подключить Playwright: `@playwright/test`, `playwright.config.ts` с `baseURL` из `PLAYWRIGHT_BASE_URL` (по умолчанию `http://127.0.0.1:8000`), `globalSetup` с подсказкой запустить `composer dev`, скрипт `test:e2e` и спеки на страницы, метаданные, ссылки, 404 и работу без JS. Проверка: при запущенном `composer dev` команда `npm run test:e2e` проходит.
- [x] 3.8 Проверить production-ссылки на ресурсы: выполнить `npm run build`, убрать `public/hot`, запустить `php artisan serve`, извлечь из HTML главной и разделов все локальные CSS/JS-адреса и запросить их. Проверка: каждый адрес отвечает 200 с корректным `Content-Type`, битых ссылок нет.
- [x] 3.9 Привести `tests/Feature/ExampleTest.php` к именованному роуту `home` или заменить его проверкой страниц каркаса. Проверка: `php artisan test` завершается с кодом 0.

## 4. Клиентский рантайм островов

- [x] 4.1 Реализовать в `resources/js/app.ts` реестр островов и обход `[data-island]`: имя из `dataset.island`, неизвестное имя → `console.warn` и пропуск, `dataset.props` через `JSON.parse` в `try/catch` с `console.error`, допустим только объект, `createApp(component, props).mount(el)` в `try/catch`. Проверка: `npm run typecheck` и `npm run build` проходят, а чтение кода подтверждает обработку всех четырёх отказов.
- [x] 4.2 Добавить проверочный остров `resources/js/islands/ScaffoldProbe.vue` (Options API: prop `message`, кнопка меняет локальное состояние), зарегистрировать его и разместить контейнер с `data-props` на главной вне SEO-контента. Проверка: в браузере остров показывает переданное сообщение, кнопка меняет состояние, `h1` и текст заглушки остаются в серверном HTML.
- [x] 4.3 Добавить Playwright-спеки островов: зарегистрированный остров монтируется и показывает данные из `data-props`; неизвестное имя даёт предупреждение и не ломает остальные острова; битый JSON даёт ошибку и пропуск только этого острова; серверный текст рядом с контейнером не меняется. Проверка: `npm run test:e2e` при запущенном `composer dev` проходит, спеки проверяют сообщения консоли.
- [x] 4.4 Убедиться, что монтирование не создаёт глобальных точек входа и не выходит за контейнер: `grep -R "window\." resources/js` не находит обращений, а Playwright-спека сравнивает текст вне контейнера до и после монтирования. Проверка: grep пуст, спека проходит.

## 5. Локальный запуск и диагностика БД

- [x] 5.1 Проверить `composer dev` → `php artisan dev`: удалить `public/build`, запустить команду и дождаться ответа главной. Проверка: в течение 30 секунд `curl -I http://127.0.0.1:8000/` возвращает 200, появляется `public/hot`, HTML ссылается на dev-ресурсы без production-сборки.
- [x] 5.2 Проверить остановку команды: прервать `composer dev` и убедиться, что завершились сервер, очередь, логи и Vite. Проверка: `pgrep -af 'artisan dev|vite'` пуст, `ss -ltn 'sport = :8000'` не показывает слушателя.
- [x] 5.3 Проверить раздельный запуск: `php artisan serve` и `npm run dev` отдельными терминалами. Проверка: главная отвечает 200 и получает стили и скрипты от dev-сборки.
- [x] 5.4 Добавить `app/Http/Middleware/EnsureDatabaseIsAvailable.php` (только `local`: `DB::connection()->getPdo()`, при исключении `report()` и `response()->view('errors.database', [], 503)`) и зарегистрировать его глобально через `prepend` в `bootstrap/app.php`. Проверка: при обычной БД главная отвечает 200, а при `DB_PORT=1 php artisan serve --port=8001` ответ имеет статус 503 и понятное диагностическое сообщение.
- [x] 5.5 Создать `resources/views/errors/database.blade.php` на `layouts/error.blade.php` без `@vite`, с безопасными метаданными. Проверка: при удалённых `public/build` и `public/hot` и `DB_PORT=1` страница отдаёт 503, не содержит текста исключения и параметров подключения и не превращается в 500.
- [x] 5.6 Описать в `README.md` локальные команды: `composer setup`, `composer dev`, раздельные `php artisan serve` и `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:e2e` и диагностику БД. Проверка: каждая документированная команда выполняется в указанном виде и даёт описанный результат.
- [x] 5.7 Прогнать `composer setup` на состоянии без `.env`, `node_modules` и `public/build`. Проверка: команда завершается с кодом 0, создаёт `.env` и `APP_KEY`, ставит зависимости и собирает ассеты, миграции при этом не выполняются.

## 6. Инструменты качества

- [x] 6.1 Настроить Pint (preset Laravel) и проверить стиль PHP. Проверка: `./vendor/bin/pint --test` завершается с кодом 0.
- [x] 6.2 Подключить Larastan/PHPStan level 6 для `app/`, добавить скрипт `composer analyse`. Проверка: `./vendor/bin/phpstan analyse` завершается с кодом 0.
- [x] 6.3 Настроить ESLint flat config (`typescript-eslint`, `eslint-plugin-vue`) и Prettier, добавить скрипты `lint` и `format`. Проверка: `npm run lint` завершается с кодом 0.
- [x] 6.4 Прогнать проверку типов на итоговых Vue- и TS-файлах. Проверка: `npm run typecheck` завершается с кодом 0.
- [x] 6.5 Настроить `composer test` на `php artisan test`. Проверка: `composer test` завершается с кодом 0.

## 7. Интеграционная проверка

- [x] 7.1 Прогнать полный набор проверок: `php artisan route:list`, `npm run build`, `npm run lint`, `npm run typecheck`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`, `composer test` и `npm run test:e2e` при запущенном `composer dev`. Проверка: все команды завершаются с кодом 0.
- [x] 7.2 Вручную открыть `/`, `/about`, `/preorder`, `/how-to-order`, `/contacts`, `/no-such-page` в браузере. Проверка: статусы 200/200/200/200/200/404, у каждой страницы один `h1`, переходы по ссылкам работают, в консоли нет ошибок загрузки ресурсов.
- [x] 7.3 Выполнить production smoke без `public/hot`: `npm run build`, `php artisan serve`, проверить главную, разделы и 404. Проверка: страницы и все локальные CSS/JS-адреса отвечают 200, 404 отдаёт страницу сайта.
- [x] 7.4 Проверить отсутствие запрещённых подходов: нет `vue-router`, Inertia, SSR, Composition API (`setup(`), Tailwind, второго entry-point, правок `vendor/`, `dd`/`dump`/`console.log`. Проверка: соответствующие `grep`/`git status` пусты, в `resources/js` один вход `app.ts`.

## Workflow follow-up

- Решить Open Questions из `design.md` перед деплоем и следующими change'ами: production-драйверы session/cache/queue, судьба `scaffold-probe`, переход страниц 404 и ошибки БД на общий layout, отдельный CI-прогон production-сборки. На состав текущих задач они не влияют.
- Заархивировать change после реализации и прохождения ревью.
