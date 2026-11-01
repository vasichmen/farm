# Design

## Context

Мотивация — `proposal.md` («Why»), требования — дельты в `specs/*/spec.md`. Здесь только
состояние и ограничения, которые определяют способ реализации.

- Фаза 0 оставила рабочий каркас, но `resources/css/tokens.css` — копия v1.1: в ней нет
  токенов колеса и прозрачностей v1.2. Остальной CSS свален в `app.css`; шрифтов, SVG-пайплайна,
  favicon и базовой сетки нет.
- Handoff v1.2 — `docs/handoff/04-tokens` (CSS + JSON), `03-assets` (иконки, логотип, favicon) и
  `01-homepage`. Но `docs/*` в `.gitignore` (кроме `docs/tz` и `docs/plan`), поэтому handoff —
  локальный эталон, а не источник сборки. Всё, что нужно production, должно быть
  скопировано в `resources/` и `public/` и закоммичено.
- Установленный `laravel-vite-plugin` 3.2 умеет `fonts`: провайдеры `fontsource()`/`local()`/
  `google()`, self-host WOFF2, `unicode-range`, fallback-метрики через `fontaine`, preload и
  `fonts-manifest.json`. Laravel 13 отдаёт это директивой `@fonts` (preload + inline CSS).
  Это снимает необходимость писать `@font-face`, `size-adjust` и preload руками.
- Vite 8 / Node 26, Vue 3 только Options API, Blade отдаёт весь SEO-контент, SPA/SSR нет
  (`AGENTS.md` §2, §5.10; `rules.md` R-FE). Tailwind не используем: стили строятся на токенах.
- Playwright работает на уже поднятом `composer dev` (`rules.md` R-QA-2). В dev шрифты отдаёт
  Vite dev-сервер, в production — `public/build`; проверка «тот же домен» должна это учитывать.
- `public/favicon.ico` пустой (0 байт), реального favicon нет. `public/fonts` и
  `resources/views/generated` отсутствуют.

## Goals / Non-Goals

**Goals:**

- Закоммитить в репозиторий канонические копии токенов и ассетов, чтобы сборка и тесты не
  зависели от `docs/handoff`, но оставались сверяемыми с эталоном локально.
- Получать шрифты штатным механизмом Laravel/Vite: self-host, нужные начертания и подмножества,
  `font-display: swap`, preload, метрические fallback’и и лицензии в репозитории.
- Сделать SVG-пайплайн детерминированным: очистка от C2PA/метаданных, воспроизводимые
  Blade-партиалы и спрайт, автоматическая проверка устаревания.
- Дать фазе 3–8 переиспользуемые примитивы сетки (`--wheel`, контейнеры, `100dvh`, safe-area),
  не рисуя при этом колесо, каталог или мобильную ленту.
- Не сломать контракт `site-shell` и текущие Playwright-сценарии каркаса.

**Non-Goals:**

- Финальная шапка, меню, футер, логотип в композиции страницы — фаза 6.
- Колесо, карточки, окно товара, мобильная лента, шторка, FAB — фазы 3–8.
- Пиксельное сравнение с кадрами и визуальные snapshot-тесты (ТЗ §18, П1).
- Динамическая смена сезона/темы на клиенте; в этом change — только механизм `data-season`
  с дефолтом «осень».
- Генерация `favicon.ico`, OG-картинок, S3/MinIO, загрузка ассетов через админку.
- Изменение рантайма островов, `app.ts` и `scaffold-probe` (остров удаляется в фазе 3).

## Decisions

### 1. `tokens.css` — замороженная копия handoff, а не «причёсанный» файл

**Решение.** `resources/css/tokens.css` байт-в-байт совпадает с
`docs/handoff/04-tokens/tokens.css` v1.2 (включая `.t-*`, `.on-dark`/`.on-light` и правило
`prefers-reduced-motion`). Файл не форматируется и не дополняется вручную; `prettierignore`
уже его исключает. `docs/handoff/04-tokens/tokens.json` остаётся справочником дизайнера:
runtime-потребителя у него нет, поэтому в репозиторий он не копируется. Локальная проверка —
`diff -u`; в CI файла handoff нет, поэтому вместо сравнения с `docs` тесты проверяют ключевые
значения v1.2.

**Почему.** Требование эталона — «каждый токен с тем же значением». Любая ручная правка
(заголовок «v1.2», перенос строк, добавление fallback-стека) ломает эту проверку и создаёт
дрейф. `tokens.css` — артефакт дизайнера, а не наш CSS-модуль.

**Альтернативы.** Разложить содержимое handoff по `tokens`/`typography`/`focus` — красивее
по слоям, но тогда `diff` с handoff перестаёт быть проверкой. Генерировать `tokens.css` из
`tokens.json` — лишний шаг сборки без потребителя.

### 2. CSS делится на файлы без `@layer`; `app.css` — только импорты

**Решение.** `resources/css/app.css` содержит только `@import` в фиксированном порядке:
`tokens.css` → `base.css` → `layout.css` → `components/shell.css` →
`components/scaffold-probe.css`. Отдельного `fonts.css` нет: правила шрифтов генерирует
плагин и вставляет `@fonts` (см. решение 3). `base.css` отвечает за reset, базовую
типографику, ссылки, фокус по умолчанию, `.on-light`/`.on-dark`, `.prose` и `.ui-icon`;
`layout.css` — за контейнеры, брейкпоинт, сезонные фоны, `100dvh`, safe-area и формулы
размеров; `components/*` — за временную оболочку и проверочный остров.

**Почему.** `tokens.css` содержит не только переменные, но и `.t-*`, focus- и reduced-motion
правила. Если завернуть его в низкий `@layer`, классы `.t-h1` и т.п. начнут проигрывать
элементным правилам `base.css` из более позднего слоя — получится неочевидная каскадная
ловушка. Без слоёв порядок импортов прост и предсказуем: handoff-файл всегда первый,
компоненты — последние.

**Альтернативы.** `@layer tokens, base, layout, components` — конфликтует с `.t-*` внутри
`tokens.css`. PostCSS-плагины (`postcss-import`, `@custom-media`) — лишние зависимости ради
одного `@import` и одного брейкпоинта.

### 3. Шрифты — `laravel-vite-plugin/fonts` + Fontsource, а не ручные `@font-face`

**Решение.** В `vite.config.ts` в `laravel({ fonts: [...] })` добавляются три определения:

- `fontsource('Cormorant Garamond', { variable: '--font-display', weights: [500, 600, 700],
  styles: ['normal'], subsets: ['cyrillic', 'latin'], display: 'swap',
  preload: [{ weight: 600 }], fallbacks: ['Georgia', 'serif'] })`;
- отдельное определение Cormorant Garamond с `weights: [500]`, `styles: ['italic']`,
  `preload: false`, `optimizedFallbacks: false` — чтобы не тянуть курсив 600/700;
- `fontsource('Manrope', { variable: '--font-ui', weights: [400, 600, 700, 800],
  styles: ['normal'], subsets: ['cyrillic', 'latin'], display: 'swap',
  preload: [{ weight: 400 }], fallbacks: ['system-ui', 'sans-serif'] })`.

`@fontsource/cormorant-garamond`, `@fontsource/manrope` и `fontaine@^0.8` добавляются в
`devDependencies`; `laravel-vite-plugin` поднимается до `^3.2`. В `layouts/app.blade.php`
директива `@fonts` стоит после `@vite` — её `:root` переопределяет `--font-display`/`--font-ui`
из `tokens.css` уже с fallback-стеком. Preload-ссылки и inline `@font-face` отдаёт плагин.

**Почему.** Плагин уже умеет ровно то, что требует спека: WOFF2, сабсеты, `unicode-range`,
`font-display: swap`, метрические fallback’и (`size-adjust`, `ascent-override` и т.д.),
preload и манифест. Fontsource-провайдер читает файлы из `node_modules`, поэтому сборка не
ходит в интернет, а версии шрифтов фиксируются `package-lock.json`. Провайдер `google()`
скачивает CSS и WOFF2 при каждой сборке — сетевой и недетерминированный. `local()` заставил
бы коммитить бинарники и вручную поддерживать preload/метрики.

**Альтернативы.** Ручные `@font-face` + `public/fonts` — больше контроля, но дублирует
функциональность фреймворка и требует собственного генератора `size-adjust`. Google/Bunny
CDN — нарушает self-host. Один общий `@fontsource` CSS-импорт — тянет лишние подмножества
и не даёт preload-манифест.

**Лицензии.** Тексты OFL из пакетов Fontsource копируются в `resources/fonts/licenses/`
вместе с коротким `README.md` (начертания, сабсеты, источник). Это единственные файлы
шрифтов, которые лежат в репозитории; сами WOFF2 — артефакт сборки в `public/build`.

### 4. SVG-пайплайн: очищенные исходники в репозитории, сгенерированные артефакты — тоже

**Решение.** Два скрипта и один конфиг SVGO:

1. `scripts/sync-handoff-assets.mjs` (`npm run assets:sync`) — локальная команда: читает
   `docs/handoff/03-assets`, прогоняет SVG через SVGO и раскладывает **очищенные** копии в
   `resources/assets/` (`icons/products`, `ui-icons`, `logo`, `favicon`). Без `docs/handoff`
   команда завершается понятной ошибкой. Результат коммитится.
2. `scripts/build-icons.mjs` (`npm run icons:build`) — читает `resources/assets`, повторно
   прогоняет SVGO и пишет: 29 Blade-партиалов `resources/views/generated/product-icons/*.blade.php`,
   `resources/views/generated/ui-sprite.blade.php`, `public/brand/logo-lockup-*-outlined.svg`
   и favicon-набор в корень `public/`. После записи скрипт проверяет, что в выходах нет
   `c2pa`, `metadata` и посторонних `xmlns:*`.
3. `svgo.config.mjs` — `preset-default` с сохранением `viewBox`, `removeMetadata`,
   `removeEditorsNSData` и точечное удаление `xmlns:c2pa`/`c2pa:*`; для контурных логотипов
   дополнительно выставляются `width="390" height="104.88"` и `viewBox="0 0 390 104.88"`.

`npm run build` — это `npm run icons:build && vite build`; `predev` тоже вызывает
`icons:build`, чтобы `composer dev` на чистом клоне имел спрайт и partial’ы. Сгенерированные
файлы коммитятся, а CI проверяет идемпотентность: `npm run icons:build && git diff --exit-code`.

**Почему.** `docs/handoff` не в git, поэтому сборка не может зависеть от него. C2PA в
репозиторий не тащим (`AGENTS.md` §5.10), значит исходники должны быть очищены до коммита.
Детерминированные выходы дают ревьюируемый diff, работающий `composer dev` без лишнего шага
и воспроизводимый production build.

**Альтернативы.** Читать SVG из `resources/assets` в рантайме через `file_get_contents` —
лишний I/O на каждый рендер и сложнее кешировать. Хранить сырые handoff-файлы с C2PA —
запрещено. Генерировать только в build и не коммитить выходы — `composer dev` и тесты
требовали бы предварительного `npm run build`, а `@includeIf` молча терял бы иконки.

### 5. Иконки: Blade-компоненты и один inline-спрайт, без PHP-классов

**Решение.** Товарные иконки — анонимный компонент
`<x-product-icon name="apples" class="…" />`, который через `@includeIf` подставляет
сгенерированный партиал с inline `<svg>`; корень SVG принимает `$attributes` и `aria-hidden`
/`role="img"` + `aria-label` из пропсов. UI-иконки — один спрайт
`resources/views/generated/ui-sprite.blade.php`, подключаемый ровно один раз после `<body>`;
`<x-ui-icon name="filter" />` рисует `<svg><use href="#ui-filter"/></svg>` с
`currentColor`, `24×24`, толщиной 1.8. Логотип — `<x-logo theme="dark|light" />`, который
выводит `<img>` на очищенный файл из `public/brand`. PHP-классы компонентов не создаются.

**Почему.** Inline SVG обязателен для товарных иконок; спрайт обязателен для UI-иконок.
Анонимные Blade-компоненты не тянут `app/View/Components` и не нарушают правило «Blade без
бизнес-логики». `<use>` работает и в Blade, и в будущих Vue-островах (это обычный DOM).
Варианты `*-on-disc.svg` не попадают ни в один выход: кремовый кружок рисует CSS/разметка
поверхности.

**Альтернативы.** Один общий спрайт для товарных иконок — противоречит требованию inline.
Внешний SVG-спрайт файлом — дополнительный запрос и риск, что «спрайт подключён не один раз».
PHP-класс с кешем прочитанных SVG — лишний слой без выгоды при 9–29 иконках на страницу.

### 6. Сетка: CSS-примитивы с литеральным брейкпоинтом 1200 px

**Решение.** В `layout.css`:

- `body` получает `min-height: 100vh; min-height: 100dvh`, сезонный фон через
  `data-season="autumn|winter|spring|summer"` (по умолчанию `autumn` из layout) и
  `padding-block`/`padding-inline` с `env(safe-area-inset-*)`; `viewport` в meta получает
  `viewport-fit=cover`.
- `.container` — мобильный контейнер `max-width: var(--size-mobile-container-max)` (520 px)
  с полями 16 px; на `@media (min-width: 1200px)` он превращается в десктопный контейнер
  `max-width: var(--size-content-max-desktop)` (1440 px) с полями
  `var(--pad-left)`/`var(--pad-right)`.
- `.desktop-grid` — `grid-template-columns: var(--wheel) minmax(0, var(--size-right-column-max))`,
  `column-gap: var(--col-gap)`; `.card-grid` — 4 колонки, `gap: var(--size-card-gap-y)
  var(--size-card-gap-x)`. Формулы `--wheel`, `--tile`, H1 и иконки карточки задаются
  CSS-переменными (`--h1-size`, `--card-icon-size`) и не дублируются в компонентах.
- Брейкпоинт — литерал `1200px` в одном месте `layout.css` с комментарием: CSS-переменные
  в `@media` не работают. Это единственное место, где значение повторяется.
- Никаких фиксированных высот: только `min-height`, чтобы при нехватке места страница
  прокручивалась, а zoom 200 % не обрезал контент.

**Почему.** ТЗ §6 задаёт формулы, а не набор классов под конкретную вёрстку. Фазы 3–8 будут
использовать одни и те же `--wheel`/`--tile`/`.desktop-grid`, поэтому значения должны жить
в layout-слое, а не в стилях колеса или карточки.

**Альтернативы.** `@custom-media`/PostCSS — новая зависимость ради одного значения.
JS-переключение раскладки — ломает работу без JS и даёт CLS. Отдельные мобильный и
десктопный DOM — дублирование контента и SEO-риск.

### 7. Типографика, фокус и движение — из `tokens.css`, без дублей

**Решение.** `base.css` задаёт только элементные значения (body, h1–h3, p, a, img/svg,
`.prose`, `.ui-icon`) и фокус по умолчанию для тёмного фона. `.on-dark`/`.on-light` и
`prefers-reduced-motion` уже есть в `tokens.css` — их не копируем. Минимальный текст
интерфейса — 12 px; `.t-label` (11 px) допустим только как подпись над полем, `.t-badge`
(11 px) в рабочих поверхностях не используется — статусы будут собираться на `.t-caption`
(12 px) с бейджевой геометрией. `.t-badge` остаётся в handoff-файле как часть эталона.

**Почему.** Дублирование reduced-motion даёт конфликт `!important`-правил, а дублирование
`.t-*` — расхождение с handoff. Ограничение по `.t-badge` закрывает конфликт между
типографической шкалой handoff и требованием «не меньше 12 px».

**Альтернативы.** Поднять `.t-badge` до 12 px в `base.css` — незаметное, но всё же
отклонение от handoff-класса; лучше не использовать его для интерфейсного текста.
Отказаться от `.t-*` и писать всё в компонентах — потеря единой шкалы.

### 8. Временная оболочка сохраняет классы `site-*`, `.page` заменяется на `.prose`

**Решение.** `site-header`, `site-nav`, `site-main` остаются (на них опирается
`tests/e2e/site-shell.spec.ts`), но их стили переезжают в `components/shell.css` и
строятся на токенах. `.page` заменяется на `.prose` (мера длины строки), `.island-slot`
удаляется, стили `scaffold-probe` изолируются в `components/scaffold-probe.css` и удаляются
в фазе 3 вместе с островом. В `layouts/app.blade.php` появляются `.container`,
`data-season`, `@fonts`, спрайт и favicon-партиал.

**Почему.** Шапка/меню — фаза 6; в фазе 1 нельзя рисовать финальную шапку, но нельзя и
ломать существующие тесты каркаса. Сохранение классов — самый дешёвый способ не менять
`site-shell`-спеку и Playwright.

**Альтернативы.** Переименовать всё сразу и править тесты — лишний шум в change’е, который
всё равно переписывается в фазе 6. Оставить монолитный `app.css` — нарушает требование
разделения стилей.

### 9. Проверка: Playwright по capability + статические проверки ассетов

**Решение.** Добавляются четыре спеки:

- `design-tokens.spec.ts` — вычисленные значения ключевых токенов v1.2, сезонные градиенты,
  фокус на тёмном/светлом, reduced motion, аудит минимального размера текста.
- `web-fonts.spec.ts` — preload-ссылки, `font/woff2` и 200, отсутствие сторонних хостов,
  наличие fallback-правил с `size-adjust`, CLS при задержке шрифтов.
- `brand-assets.spec.ts` — 29 товарных иконок и их inline-вывод, отсутствие `*-on-disc`,
  один спрайт и 35 символов с `24×24`/`stroke-width="1.8"`/`currentColor`, совпадение
  `#ui-vk` с `ui-vk.svg`, геометрия логотипа, favicon/webmanifest/`theme-color`,
  отсутствие C2PA/metadata в опубликованных SVG.
- `layout-grid.spec.ts` — 520 px на 768–1199, 1440 px и поля на 1440/1920, формулы
  `--wheel`/`--tile`/H1/иконки карточки, отсутствие горизонтальной прокрутки на 320 px,
  `100dvh`/safe-area и reduced-motion.

Проверки, которым нужны размеры колеса/колонки, используют **пробный элемент**, который тест
вставляет в DOM (`.desktop-grid`, `width: var(--wheel)`), а не реальную вёрстку фазы 3.
Статические проверки (`fs` в Playwright/Node) читают `resources/css/tokens.css`,
`resources/assets`, `resources/views/generated` и `public`. Локально дополнительно
выполняется `diff` токенов с handoff; в CI он пропускается, потому что `docs/` нет.

**Почему.** Так проверяются именно контракты дизайн-системы, не дожидаясь колеса и каталога.
Тест на реальной странице проверяет каскад и вычисленные значения, а `fs`-проверки —
полноту набора и чистоту ассетов.

**Альтернативы.** Vitest/jsdom — второй рантайм ради того, что уже умеет Playwright.
Визуальные snapshot’ы — нет эталонных baseline и ТЗ запрещает пиксельное сравнение.
PHPUnit — не видит CSS и браузерные запросы.

## Risks / Trade-offs

- **`docs/handoff` не в git, синхронизация ручная** → ошибка копирования или забытое
  обновление. Митигация: очищенные `resources/assets` и выходы коммитятся, CI проверяет
  идемпотентность `icons:build`; `assets:sync` падает без handoff, а не молча создаёт пустой набор.
- **Fontsource-пакеты и `fontaine` — новые dev-зависимости** → обновление может изменить
  набор файлов или метрики. Митигация: версии фиксируются `package-lock.json`, шрифты
  проверяются тестом на 200/`font/woff2`/сабсеты, а не «на глаз».
- **Fallback-метрики зависят от локального шрифта** (`local("Arial")`/`local("Times New Roman")`),
  которого может не быть в Linux-контейнере Playwright → CLS-тест может быть нестабильным.
  Митигация: CI-retries уже включены; дополнительно проверяется наличие `size-adjust`
  в сгенерированном CSS, а runtime-тест меряет CLS с задержкой шрифтов и допуском 0.1.
- **Inline CSS шрифтов увеличивает `<head>`** → на первом экране появляется блок
  `@font-face` для всех выбранных начертаний. Митигация: два семейства, только нужные
  веса/сабсеты, preload только основных начертаний; CSS сжимается gzip/brotli.
- **Сгенерированные Blade-партиалы и favicon лежат в git** → возможен diff при другой
  версии SVGO. Митигация: `svgo` фиксируется в `package-lock.json`; CI-проверка
  `git diff --exit-code` после `npm run icons:build`.
- **`tokens.css` содержит `.t-badge` 11 px** → прямое использование нарушит минимум 12 px.
  Митигация: правило «`.t-badge` не для интерфейсного текста»; бейджи собираются на
  `.t-caption` (12 px).
- **В dev шрифты отдаёт Vite с другого порта** → проверка «тот же домен» может ложно падать.
  Митигация: `server.host = '127.0.0.1'` в `vite.config.ts`, тест сравнивает hostname
  (не порт), production-сборка отдаёт шрифты из `public/build`.
- **`@fonts` пуст, если нет `fonts-manifest.json`** (например, `php artisan serve` без Vite
  и без `npm run build`) → страница останется на fallback-шрифтах. Митигация: это тот же
  режим, в котором уже не работает `@vite`; `composer dev` и production build манифест создают.
- **Удаление пустого `public/favicon.ico`** → старые клиенты могут запросить `/favicon.ico`
  и получить 404. Митигация: в `<head>` есть SVG/PNG/apple-touch/manifest; генерация `.ico`
  не требуется спекой и вынесена в бэклог.
- **Inline товарных иконок увеличивает HTML** → 9–29 SVG на страницу. Митигация: иконки
  очищены SVGO, UI-иконки вынесены в один спрайт; измерение размера — в фазе 11 (SEO/perf).
- **`@includeIf` молча пропускает отсутствующий партиал** → сломанная иконка не даст ошибку.
  Митигация: тест проверяет наличие всех 29 партиалов и идемпотентность сборки.
- **`viewport-fit=cover` меняет поведение safe-area** → на устройствах с вырезом контент
  может подойти к краю. Митигация: `padding` с `env(safe-area-inset-*)` и ручная проверка
  на телефоне; desktop/Android без выреза не меняются.

## Migration Plan

Данных, схемы БД, роутов и контроллеров change не трогает — миграция сводится к файлам
и сборке.

1. Скопировать `docs/handoff/04-tokens/tokens.css` в `resources/css/tokens.css` (v1.2),
   разложить `app.css` на `base.css`, `layout.css`, `components/*`.
2. Добавить `@fontsource/*`, `fontaine@^0.8`, `svgo`, поднять `laravel-vite-plugin` до `^3.2`;
   настроить `fonts` и `server.host` в `vite.config.ts`, добавить лицензии в
   `resources/fonts/licenses/`.
3. Добавить `svgo.config.mjs`, `scripts/sync-handoff-assets.mjs`, `scripts/build-icons.mjs`;
   выполнить `npm run assets:sync` локально, затем `npm run icons:build`; закоммитить
   `resources/assets`, `resources/views/generated`, `public/brand` и favicon-набор.
4. Добавить Blade-компоненты `product-icon`, `ui-icon`, `logo`, партиалы `favicon`/спрайта;
   подключить `@fonts`, `viewport-fit=cover`, `data-season` и контейнеры в layout.
5. Обновить заглушки: `.page` → `.prose`, убрать `.island-slot`; стили оболочки перенести
   в `components/shell.css`.
6. Добавить четыре Playwright-спеки; проверить, что старые `site-shell`/`client-islands`
   сценарии не изменились.
7. Проверки: `npm run build`, `npm run lint`, `npm run typecheck`, `php artisan route:list`,
   `./vendor/bin/pint --test`, `./vendor/bin/phpstan analyse`, `npm run test:e2e`; локально —
   `diff` токенов, `grep -R "fonts.googleapis\\|fonts.gstatic" resources public` пуст,
   визуальный smoke на 1440×900, 1200×680, 390×844 и 320×568.

**Rollback.** Change не создаёт таблиц, записей и внешних состояний. Откат — revert коммита:
`public/build` и `resources/views/generated` регенерируются, `public/brand`/favicon удаляются
вместе с коммитом, `node_modules` переустанавливаются, `vendor` не меняется. Коммит и пуш —
только по явной просьбе пользователя.

## Open Questions

- Нужен ли будущим Vue-островам отдельный TS-реестр товарных иконок, или им достаточно
  получать inline-SVG через `data-props` из Blade? Решение не меняет текущие спеки и
  принимается в фазе 3, когда появится первое реальное потребление.
- Оставлять ли `docs/handoff` вне git и дальше, обновляя `resources/assets` вручную, или
  завести версионируемый каталог handoff? Это процесс поставки, а не контракт дизайн-системы.
- Финальная шапка (фаза 6) может использовать `<x-logo>` как `<img>` или inline-SVG ради
  управления цветом; оба варианта совместимы с текущими требованиями к холсту логотипа.
- Нужен ли `favicon.ico` для очень старых клиентов Яндекса/Windows? Спека требует SVG/PNG,
  apple-touch и manifest; `.ico` можно добавить отдельной задачей без изменения пайплайна.