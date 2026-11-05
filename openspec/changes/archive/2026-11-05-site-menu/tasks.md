# Tasks

Открытый вопрос `design.md` решён перед разбивкой: открытое меню не отражается в URL и
истории браузера, синхронизация с `history`/`popstate` в объём не входит.

## 1. Конфигурация навигации и шапка

- [x] 1.1 Создать `config/navigation.php` с упорядоченными `items` (`id`, `label`, имя
  маршрута, флаги `in_header`/`in_menu`) для «О семье», «Сезоны», «Предзаказ»,
  «Как заказать», «Контакты» и с `contacts` (адрес, телефон с `tel:`, почта с `mailto:`,
  Telegram и VK с `url: null`). Проверка: `php -l config/navigation.php` и
  `php artisan tinker --execute="dump(array_column(config('navigation.items'), 'id'));"`
  выводят пять id в порядке ТЗ.
- [x] 1.2 Создать `resources/views/partials/site-header.blade.php`: существующий `x-logo`
  в ссылке на главную, `nav.site-nav` из пунктов с `in_header`, `aria-current="page"` по
  `request()->routeIs()`, отдельный контейнер под меню; заменить временную шапку в
  `resources/views/layouts/app.blade.php`. Проверка: feature-тест
  `tests/Feature/SiteNavigationTest.php` подтверждает три ссылки в `nav.site-nav` с
  нужными `href`, `aria-current` на `/` и `/about` и отсутствие пунктов «Предзаказ» и
  «Контакты» в шапке; `php artisan test --filter=SiteNavigationTest` зелёный.
- [x] 1.3 Переписать стили шапки в `resources/css/components/shell.css`: логотип, пункты
  `t-nav`, постоянное подчёркивание активного `aria-current`, рост подчёркивания через
  `transform: scaleX()` за `--dur-fast`, hover с `--color-honey`, скрытие текстовых пунктов
  ниже 1200 px при сохранении их в HTML. Проверка: `npm run build` без ошибок; в браузере
  на 1440 px видны логотип и три пункта, на 390 px текстовые пункты скрыты и виден
  логотип, горизонтальной прокрутки нет.
- [x] 1.4 Обновить `tests/e2e/site-shell.spec.ts`: считать пункты шапки через
  `header.site-header .site-nav a` (три вместо пяти) и искать ссылку «Назад» внутри
  `main`, а не как единственную `a[href="/"]`. Проверка:
  `npx playwright test tests/e2e/site-shell.spec.ts` на запущенном `composer dev` зелёный.

## 2. Единые заглушки разделов

- [x] 2.1 Добавить `resources/views/components/page-placeholder.blade.php` с props
  `title`, слотом текста и ссылкой-кнопкой «Назад» на `route('home')`; перевести на него
  `pages/about.blade.php`, `pages/preorder.blade.php`, `pages/how-to-order.blade.php`,
  `pages/contacts.blade.php`, привести заголовки к «О семье» и «Как заказать». Проверка:
  `GET` каждой из четырёх страниц даёт ровно один `h1` с новым заголовком и одну ссылку
  «Назад» внутри `main`; `php artisan view:cache` компилирует шаблоны без ошибок.
- [x] 2.2 Привести метаданные `PageController` к новым подписям («О семье», «Как заказать»)
  и добавить feature-тест `tests/Feature/SitePlaceholderTest.php`: все четыре адреса
  отдают 200 и HTML, содержат заголовок, текст и кнопку «Назад», а `title`/`description`
  у `/about` и `/contacts` различаются. Проверка:
  `php artisan test --filter=SitePlaceholderTest` зелёный; существующий
  `tests/Feature/ExampleTest.php` проходит без изменения ожиданий.
- [x] 2.3 Добавить `resources/css/components/page-placeholder.css` с единым оформлением
  заголовка, текста и кнопки «Назад» и подключить его в `resources/css/app.css`.
  Проверка: `npm run build` без ошибок; на 1440×900 и 390×844 заглушки выглядят
  одинаково и не дают горизонтальной прокрутки.
- [x] 2.4 Обновить `tests/e2e/site-shell.spec.ts` под новые заголовки «О семье» и
  «Как заказать» и проверить кнопку «Назад» внутри `main .page-placeholder`. Проверка:
  `npx playwright test tests/e2e/site-shell.spec.ts` на `composer dev` зелёный.

## 3. Общий слой модального поведения

- [x] 3.1 Выделить `resources/js/lib/layer.ts` с чистыми функциями: список фокусируемых
  элементов, обработка Tab/Shift+Tab, блокировка прокрутки с компенсацией ширины
  скроллбара и параметром класса, установка/снятие `inert` по селекторам, чтение
  CSS-длительностей/кривых и `prefers-reduced-motion`. Проверка:
  `npx vue-tsc --noEmit` и `npm run lint` проходят, модуль не содержит обращений к
  конкретным классам меню или окна товара.
- [x] 3.2 Перевести `resources/js/islands/ProductModal.vue` на `lib/layer.ts`, сохранив
  класс `product-modal-open`, FLIP-анимацию, историю, возврат фокуса и поведение
  `Escape`/`Tab`. Проверка: `npx playwright test tests/e2e/product-modal.spec.ts` на
  `composer dev` остаётся зелёным, `npx vue-tsc --noEmit` и `npm run lint` проходят.

## 4. Остров меню

- [x] 4.1 Добавить `resources/js/types/site-menu.ts`: TS-типы и zod-схема props
  (пять пунктов, уникальные `id`, непустые `label`/`url`, не более одного `active`,
  контакты, ровно две соцсети с `url: string | null`, неизвестные ключи отбрасываются).
  Проверка: `npx vue-tsc --noEmit` и `npm run lint` проходят; схема экспортирует тип,
  используемый компонентом без `any`.
- [x] 4.2 Реализовать `resources/js/islands/SiteMenu.vue` (Options API): обёртка с
  `role="dialog"`, `aria-modal` и именем «Меню сайта» в открытом состоянии; одна кнопка
  с `aria-expanded`, `aria-label` «Открыть меню»/«Закрыть меню», `aria-controls` и
  значком бургер/крестик; постоянно присутствующие затемнение и панель со скрытием через
  `visibility`/`inert`/`aria-hidden`/`pointer-events`; пять пунктов с `aria-current` и
  точкой Honey; футер с адресом, телефоном, почтой и неактивными Telegram/VK; открытие и
  закрытие кнопкой, затемнением, Escape; фокус-ловушка по обёртке, блокировка прокрутки
  классом `site-menu-open`, `inert` на `main.site-main`, `nav.site-nav` и ссылке-логотипе,
  возврат фокуса на кнопку; свайп влево через Pointer Events только ниже 1200 px.
  Проверка: `npx vue-tsc --noEmit`, `npm run lint`, `npm run build` проходят; в собранной
  странице контейнер `[data-island="site-menu"]` монтируется без ошибок в консоли.
- [x] 4.3 Добавить `resources/views/components/site-menu.blade.php`: контейнер
  `data-island="site-menu"` с props из `config/navigation.php` (готовые `url` и `active` для
  пяти пунктов меню плюс контакты) и серверный fallback с кнопкой и скрытым списком ссылок;
  подключить компонент в `partials/site-header.blade.php` и зарегистрировать остров
  `site-menu` в `resources/js/app.ts`. Проверка: feature-тест `SiteNavigationTest`
  подтверждает наличие контейнера, пяти пунктов в порядке ТЗ, корректного `active`,
  контактов и соцсетей в props, а также ссылок меню в исходном HTML; `npm run build`
  проходит.
- [x] 4.4 Добавить токен `--dur-menu-item: 50ms` в `resources/css/tokens.css` и
  `resources/css/components/site-menu.css`: панель 430 px и затемнение на десктопе,
  полноэкранное меню цветом Forest ниже 1200 px, слои `--z-overlay`/`--z-menu`, тень
  `--shadow-menu-panel`, кнопка `--size-header-btn-desktop`/`--size-header-btn-mobile`
  с hover Flax→Honey и нажатием 94 %, превращение значка за `--dur-base`, открытие 400 ms
  `--ease-standard`, закрытие 250 ms `--ease-exit`, staggered-появление пунктов со сдвигом
  16 px и шагом `--dur-menu-item`, мгновенное исчезновение пунктов при закрытии и
  `prefers-reduced-motion` только с opacity 150 ms и без transform. Подключить файл в
  `resources/css/app.css`. Проверка: `npm run build` и
  `npx playwright test tests/e2e/design-tokens.spec.ts` проходят.
- [x] 4.5 Добавить `tests/e2e/site-navigation.spec.ts` со сценариями открытия и закрытия
  кнопкой (та же кнопка), затемнением и Escape; проверкой `aria-expanded`, доступного имени,
  `role="dialog"`, `aria-modal`, фокус-ловушки в обе стороны, `inert` фона, блокировки
  прокрутки и возврата фокуса на кнопку. Проверка:
  `npx playwright test tests/e2e/site-navigation.spec.ts` на `composer dev` зелёный.
- [x] 4.6 Дополнить `tests/e2e/site-navigation.spec.ts`: активный пункт и точка Honey,
  футер с адресом/телефоном/почтой, неактивные Telegram и VK без перехода, закрытие
  свайпом влево на 390 px, размеры кнопки 56 px на 1440 px и 44 px на 390 px, отсутствие
  горизонтальной прокрутки при открытом меню. Проверка:
  `npx playwright test tests/e2e/site-navigation.spec.ts` на `composer dev` зелёный.
- [x] 4.7 Дополнить `tests/e2e/site-navigation.spec.ts` проверками вычисленных длительностей
  и задержек (400/250 ms панели, 250 ms превращения значка, шаг 50 ms), режима
  `prefers-reduced-motion` (только opacity 150 ms, без transform) и наличия ссылок шапки
  и меню в HTML при отключённом JavaScript с ответом 200 по прямым адресам. Проверка:
  `npx playwright test tests/e2e/site-navigation.spec.ts` на `composer dev` зелёный.

## 5. Интеграционные проверки

- [x] 5.1 Прогнать полный набор проверок и устранить расхождения: `php -l` по изменённым
  PHP-файлам, `php artisan route:list`, `./vendor/bin/pint --test`,
  `./vendor/bin/phpstan analyse`, `php artisan test`, `npm run lint`,
  `npx vue-tsc --noEmit`, `npm run build`, `npm run test:e2e` на `composer dev`.
  Проверка: все команды завершаются успешно.
- [x] 5.2 Провести визуальную сверку на 1440×900, 1200×680 и 390×844: шапка, активное
  подчёркивание, панель меню и полноэкранное состояние, затемнение, футер контактов,
  заглушки, отсутствие горизонтальной прокрутки, а также режим без JavaScript и режим
  уменьшенного движения. Проверка: перечисленные состояния подтверждены вручную, список
  замечаний пуст или зафиксирован для отдельной задачи.

## Workflow follow-up

- Архивировать change после приёмки и проверки требований проекта.
- Обновить `docs/plan/PLAN.md`: фаза 6 → «✅ сделано», имя change'а в §3 и заголовке §4,
  актуальная «Текущая точка».
- Проверить результат после архивации.