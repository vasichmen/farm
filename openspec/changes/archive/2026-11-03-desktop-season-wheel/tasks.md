# Tasks

## 1. Backend: HTTP-слой главной и серверный HTML колеса

- [x] 1.1 Добавить `HomePageRequest` и `HomePageRequestDTO` (`season`, `product` — nullable-строки с ограничением длины, `month` — nullable-целое) и подключить DTO через `dtoClassName`; проверить `php -l` для новых файлов и `php artisan test --filter=HomePageRequestTest` на правила и перенос значений в DTO.
- [x] 1.2 Добавить в `HomePageService`/`HomePageDTO` счётчики видимых товаров по сезонам (`seasonProductsCounts`) и вывести `products_count` в `SeasonResource`; проверить `php artisan test --filter=HomePageSelectionTest` и обновлённый `ResourceRenderingTest`, где `seasons[*].products_count` совпадает с числом товаров сезона (осень — 9, весна — 8).
- [x] 1.3 Добавить в `HomePageResource` секцию `wheel`: `active_season`, `seasons` с `slug`, `name`, `sub`, `url` (через `route('home', ['season' => ...])`), `products_count` и `products` (`name`, `icon` только с колеса); проверить `php artisan test --filter=ResourceRenderingTest` — четыре уникальных slug, `sub` не длиннее 7 знаков, `products_count >= 0`, `url` ведёт на `/?season=…`.
- [x] 1.4 Подключить `HomePageRequest` → `HomePageService::getHomePage()` → `HomePageResource` в `PageController::home()` и передать ресурс в Blade; проверить `php artisan route:list`, `php artisan test --filter=ExampleTest` и feature-тест главной с `?season=winter`, который отдаёт 200 и зимний сезон.
- [x] 1.5 Обновить `layouts/app.blade.php` и `pages/home.blade.php`: `body[data-season]` из активного сезона, inline-скрипт локального месяца в `<head>` (не перебивает `season` и `month`), секция колеса с контейнером `data-island="season-wheel"`, серверный fallback-`nav` с четырьмя ссылками и подписями, сохранённые `h1`/заглушка ниже; проверить feature-тестом, что в исходном HTML есть fallback-ссылки, `data-props`, `data-season` и скрипт месяца.

## 2. Frontend: зависимости, иконки и контракт props

- [x] 2.1 Добавить `zod` в `dependencies` и установить пакет; проверить `npm ls zod` и `npx vue-tsc --noEmit`.
- [x] 2.2 Расширить `scripts/build-icons.mjs` генерацией `resources/js/generated/product-icons.json` (очищенные SVGO внутренности по имени без префикса `product-`); проверить `npm run icons:build`, наличие 29 записей, отсутствие `c2pa`/`metadata` и повторяемость результата.
- [x] 2.3 Исключить `resources/js/generated/` из Prettier и закоммитить сгенерированный JSON; проверить `npm run lint` — сгенерированный файл не вызывает ошибок форматирования.
- [x] 2.4 Создать `resources/js/types/season-wheel.ts`: TS-типы props и `zod`-схему с проверкой четырёх уникальных slug из `WHEEL_ORDER`, `sub` ≤ 7 знаков и `products_count >= 0`; проверить `npx vue-tsc --noEmit`.
- [x] 2.5 Перевести `app.ts` на передачу острову одного prop `data` и валидацию по схеме: невалидные данные дают `console.error` и пропуск монтирования, серверный fallback остаётся; проверить `npx vue-tsc --noEmit` и `npx playwright test tests/e2e/client-islands.spec.ts`.

## 3. Остров колеса: отрисовка и регистрация

- [x] 3.1 Реализовать `SeasonWheel.vue` (Options API) с SVG `viewBox="-350 -350 700 700"`: четыре сектора в порядке `summer → autumn → winter → spring`, кольцо месяцев с засечками, неподвижный центр (логотип, «Колесо года», текущий год), маркер локального текущего месяца, иконки на кремовых кружках (активный — до 4, неактивный — до 3) и «ПОКА ПУСТО» для пустого сезона; проверить `npx vue-tsc --noEmit` и `npm run lint`.
- [x] 3.2 Реализовать контр-вращение подписей сезонов и иконок, касательное расположение подписей месяцев и однократный переворот подписи при итоговом угле 90–270°; проверить `npx vue-tsc --noEmit` и добавить в e2e проверку углов/прямых подписей.
- [x] 3.3 Добавить `resources/css/components/season-wheel.css` на токенах `--wheel*`, `--opacity-*`, `--ease-spring`: сектора, кружки, hover-заливка, увеличение иконки с кольцом, tooltip, `:focus-visible` по форме сектора и reduced-motion (`opacity` 150 ms); проверить `npm run lint` и e2e проверки размеров кружков, opacity и переключения hover.
- [x] 3.4 Зарегистрировать `season-wheel` в реестре `app.ts`, удалить `ScaffoldProbe.vue`, его CSS и импорт из `home.blade.php`; переписать `client-islands.spec.ts` на реальный остров, сохранив проверки неизвестного имени и битого JSON; проверить `npx playwright test tests/e2e/client-islands.spec.ts` на `composer dev`.
- [x] 3.5 Написать `tests/e2e/season-wheel.spec.ts` для состава колеса (4 сектора, месяцы, центр, год), текущего месяца с зафиксированным `Date` через `addInitScript`, счётчиков иконок, пустого сектора через подмену `data-props` и режима без JavaScript (fallback-ссылки работают, подписи читаемы); проверить целевые тесты `npx playwright test tests/e2e/season-wheel.spec.ts`.

## 4. Интерактив, навигация и доступность колеса

- [x] 4.1 Реализовать состояние `rotation`, расчёт целевого угла `-(index - 1) * 90°` с ближайшим эквивалентом `target + 360k` и доводку 700 ms по `--ease-spring` без инерции; при reduced motion менять угол мгновенно; проверить e2e: после выбора зимнего сезона колесо поворачивается на 90°, переход весна → лето проходит через границу без лишнего оборота, при reduced motion поворот мгновенный.
- [x] 4.2 Сделать выбор сезона серверной навигацией по ссылке `?season=`: сохранять в `sessionStorage` угол, целевой сезон и намерение вернуть фокус, на новой странице проигрывать поворот от сохранённого угла и возвращать фокус на активную вкладку; при первом заходе в сессию показывать входной доворот на 20°; модифицированные клики и клик по активному сектору не перехватывать; проверить e2e клика, адреса `?season=winter`, возврата фокуса и отсутствия повторной анимации входа.
- [x] 4.3 Добавить клавиатурный выбор `←/→` по кругу, `Home` — первый сезон колеса, `End` — последний; проверить e2e все четыре сценария, включая переход с последнего сезона на первый.
- [x] 4.4 Добавить перетаскивание через Pointer Events с захватом указателя, отключением плавного доворота во время drag и доводкой к ближайшему сезону после отпускания; не перехватывать горизонтальный жест тачпада (`wheel`/`touchstart` не слушаем, `preventDefault` для прокрутки не вызываем); проверить e2e движением мыши и отсутствием навигации при drag больше порога.
- [x] 4.5 Добавить hover и tooltip только для `@media (hover: hover)`: усиление заливки и opacity иконок, увеличение иконки, кольцо и подсказку с названием товара через 300 ms с прижатием внутрь колеса; на сенсорном экране тап по иконке выбирает сектор без подсказки; проверить e2e наведением и эмуляцией touch-контекста.
- [x] 4.6 Реализовать доступность: `role="tablist"`/`role="tab"`, `aria-selected`, roving `tabindex`, `aria-label` сектора с названием и перечнем товаров (для пустого — «пока пусто»), иконки `aria-hidden` без `tabindex`, вежливый `aria-live` с сезоном и числом продуктов через `Intl.PluralRules('ru')`; проверить e2e ролями, доступными именами, порядком фокуса и обновлением live-региона.

## 5. Интеграционные проверки

- [x] 5.1 Прогнать статические проверки backend и frontend: `php -l` по изменённым файлам, `php artisan route:list`, `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`, `php artisan test`, `npm run lint`, `npx vue-tsc --noEmit`; все команды завершаются с кодом 0.
- [x] 5.2 Собрать ассеты и прогнать весь e2e на запущенном `composer dev`: `npm run build`, `npm run test:e2e`; отдельно проверить 1440×900, 1200×680 и режим без JavaScript, отсутствие ошибок в консоли, исчезновение `scaffold-probe` из HTML/CSS/реестра островов и неизменность `vendor/`.

## Workflow follow-up

- Архивировать change после выполнения задач и прохождения проверок проекта.
- После архивации обновить `docs/plan/PLAN.md`: фаза 3 → `✅ сделано`, имя change'а в §3, заголовок фазы в §4 и «Текущую точку» в шапке.