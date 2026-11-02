# AGENTS.md — правила разработки «Усадьба Лыково»

Документ описывает **инварианты этого проекта**: стек, слои, контракты пакетов
`vasichmen/laravel-foundation` и `vasichmen/laravel-handbooks`, ограничения и обязательные
проверки. Это не шаблон «на все сервисы» — здесь только то, что относится к `lyk-farm`.

- Пошаговые процедуры — в skills `.agents/skills/{name}/SKILL.md`, см. §11.
- Нормативные запреты в сжатом виде — в `rules.md`.
- Правила этого файла и `rules.md` имеют приоритет над `README.md` и привычками разработчика.
- Если задача подпадает под skill — skill читается **до** работы, его шаги обязательны.

---

## 1. Паспорт проекта

| Параметр | Значение |
|---|---|
| Проект | `lyk-farm` — сайт «Усадьба Лыково» |
| Объём MVP | главная страница (десктоп от 1200 px и телефон), заглушки разделов, без админки |
| Backend | PHP 8.5, Laravel 13 |
| База | PostgreSQL 15.2, БД `lyk-farm`, пользователь `ippu` |
| Frontend | Vue 3 (только Options API) + TypeScript strict + zod + Vite, Node 26 |
| Рендеринг | Blade отдаёт контент, Vue работает островами; SSR нет |
| Пакеты | `vasichmen/laravel-foundation` (абстракции), `vasichmen/laravel-handbooks` (справочники и enum-API) |
| API | `api/v1/{SERVICE_NAME}`; роуты справочников генерирует пакет |
| Авторизация | `laravel/passport` — подключается, когда появятся закрытые эндпоинты (в MVP таких нет) |
| Локальный запуск | `composer dev` (см. `docs/tz/TZ-lyk-farm.md` §15.4) |
| Качество | Pint, PHPStan/Larastan, ESLint + Prettier, Playwright |
| Основная ветка | `master` |

**Источники истины:**

- продукт, объём, решения, интерактив и допущения — `docs/tz/TZ-lyk-farm.md` (единое ТЗ; ответы
  дизайнера v1.2 уже внесены в него, отдельных файлов с вопросами и ответами нет);
- вёрстка — `docs/tz/TZ-lyk-farm.md` §5–§14 + токены `docs/handoff/04-tokens` + кадры
  `docs/handoff/01-homepage` (Figma не будет);
- мок-контент — ТЗ §10.3 и `docs/handoff/seasons-content.md` / `.csv`.

Если ТЗ и кадры расходятся, главнее ТЗ (§5.1), затем токены, затем кадры.

---

## 2. Стек и общие ограничения

- Laravel 13, PHP 8.5, PostgreSQL 15.2. `.env.example` может содержать устаревший `mysql` —
  не ориентироваться на него.
- Монолит: страницы рисует Blade, интерактив — Vue-острова. SPA нет: `vue-router` не заводим,
  Inertia не используем, SSR не делаем.
- Vue — **только Options API**. Composition API и `setup()` в проекте не используются.
- Фронтенд типизирован: TypeScript в strict-режиме, внешние данные проверяются через zod.
- Файлы и ассеты — локально (`public/`), S3/MinIO не используем. Загрузки файлов в MVP нет.
- Очереди, Kafka, Redis, Telescope не используем.
- `vendor/` не изменять. Пакеты `vasichmen/*` — свои, править можно, но отдельной задачей
  и без ломающих изменений для уже подключённого кода (см. §7).
- Git Flow, основная ветка `master`. Коммиты и пуш — только по явной просьбе пользователя.
- Отладка — `dd()` / `dump()`.
- Backend отдаёт **сырые данные**: числа, enum-коды, массивы, строки контента, даты в UTC.
  Форматирование для отображения (цена, вес, фасовка, склонения, даты, регистр, подписи
  статусов) выполняет слой отображения (Blade/Vue); вычисление локального месяца и
  часового пояса — только на клиенте.
- Время в БД хранится и передаётся в UTC; сервер не применяет часовой пояс пользователя.
- Для наборов данных — `Illuminate\Support\Collection`; для строк и массивов — `Str`/`Arr`,
  а не нативные `mb_*`, `array_slice`, `array_filter`, `array_map`, `array_merge`, `usort`.
- Тесты: приоритет — Playwright (сценарии страницы); feature/unit-тесты — только на то,
  что дорого ломать (выдача сезонов/товаров, slug, идемпотентность).
  Playwright ещё не подключён — настройка входит в фазу 0.

---

## 3. Структура проекта

Канонический каркас. Часть каталогов появляется по мере надобности — не создавать
«на будущее».

```text
app/
├── DTO/
│   ├── HomePageDTO.php          # DTO агрегата страницы со сложной структурой
│   └── Request/{Entity}/        # DTO конкретных запросов (не сущностей)
├── Enums/                       # native enums, *Enum
├── Exceptions/                  # доменные исключения, Handler
├── Http/
│   ├── Controllers/             # web-контроллеры страниц + Api/ для JSON
│   ├── Middleware/              # middleware проекта
│   ├── Presenters/              # свои презентеры, если пакетных не хватает
│   ├── Requests/{Entity}/       # FormRequest по сущностям (+ Handbook/)
│   └── Resources/               # ресурсы сущностей + page-ресурсы (+ Short/, DTO/)
├── Models/                      # Eloquent-модели (+ Pivot/, Relations/)
├── Providers/                   # AppServiceProvider: $modelList, настройки пакетов
├── Repositories/                # репозитории, по одному на модель
├── Services/                    # бизнес-логика
└── Traits/                      # Model/, Repository/, Service/, Resource/

config/
├── handbooks.php                # справочники и enum-справочники (пакет)
└── ...

database/
├── migrations/
└── seeders/                     # мок-каталог, сезоны, категории

lang/ru/enums.php                # переводы enum-значений

resources/
├── js/
│   ├── app.ts                   # единственный entry-point, реестр островов
│   ├── islands/                 # Vue-компоненты островов
│   ├── components/              # общие Vue-компоненты
│   ├── stores/                  # модули-сторы (синглтоны)
│   └── types/                   # TS-типы и zod-схемы
├── views/                       # Blade: страницы, партиалы, метатеги
└── css/                         # токены, базовая типографика

routes/
├── web.php                      # страницы сайта
└── api.php                      # JSON API (справочники — из пакета)

public/                          # собранные ассеты, иконки, шрифты
tests/                           # Playwright + feature/unit
.agents/skills/                  # skills для AI-агента
```

---

## 4. Слои и поток запроса

### Страница (основной сценарий)

```text
Route (web.php) → Controller → Service → Repository → Model
                                   ↓
                        Blade-шаблон + props для островов → HTML
```

### JSON API (справочники, enum'ы, будущие эндпоинты)

```text
Route → Request (валидация + DTO) → Controller → Service → Repository → Model
                                                        ↓
                                    Resource → Presenter → JSON
```

Обязанности слоёв:

| Слой | Отвечает | Не должен |
|---|---|---|
| Route | URI, HTTP-метод, группа middleware | содержать логику |
| Request | правила валидации, сообщения, `$dtoClassName` | бизнес-логику, запросы к БД |
| DTO | типизированный перенос данных | логику, доступ к БД |
| Controller | принять DTO, вызвать сервис, вернуть view или презентер | запросы к БД, вычисления, валидацию |
| Service | бизнес-логику, транзакции, проверки доступа | прямой доступ к БД в обход репозитория |
| Repository | доступ к БД, сложные выборки | бизнес-логику |
| Model | связи, касты, `$fillable` | бизнес-логику, мутации извне репозитория |
| Resource | представление сущности для фронта (JSON, props островов) | запросы к БД, бизнес-логику |
| Presenter | обёртка ответа (`error/content`, пагинация) | бизнес-логику |
| Blade-шаблон | разметка и серверный контент | запросы к БД |

---

## 5. Правила по слоям

### 5.1. Маршруты

- Страницы сайта — `routes/web.php`, обычные path-адреса (`/`, `/about`, `/preorder`).
  Path-параметры в web-роутах нормальны, это не API.
- JSON API — `routes/api.php`. Своих роутов для справочников не пишем: их генерирует
  `vasichmen/laravel-handbooks` по `config/handbooks.php`.
- Имена действий API единообразные: `list`, `detail`, `create`, `update`, `delete`;
  составные — через дефис (`set-active`).
- Чтение — `GET`, изменение — `POST`, удаление — `DELETE`.
- Для собственных JSON-эндпоинтов id передаётся в query (`GET`) или body (`POST`/`DELETE`).
  Исключение — роуты справочников: path задан контрактом пакета.
- Роут страницы возвращает `view(...)`; JSON-роут — презентер.

### 5.2. Валидация и Request

- Валидация — **только** в Request-классах (`Laravel\Foundation\Abstracts\AbstractRequest`).
  Не `$request->validate()` в контроллере, не `Validator::make()` в сервисе.
- К каждому Request — DTO: `protected ?string $dtoClassName = {Action}{Entity}RequestDTO::class;`,
  тогда `$request->validated()` вернёт объект DTO.
- Стандартные случаи — пакетные `GetListRequest`/`GetListRequestDTO` (список) и
  `GetEntityRequest`/`GetEntityRequestDTO` (одна сущность по `id`); свой Request не нужен.
- Create/Update и прочие операции — собственный DTO в `app/DTO/Request/{Entity}/`.
- Enum-поля — `Rule::enum(EnumClass::class)`, не строка `in:...` с перечислением значений вручную.
- Существование FK — `new Exists('{table}', 'id')`, уникальность — `new Unique('{table}', 'slug')`
  (правила Laravel, не пакетные).
- `Update{Entity}Request extends Create{Entity}Request`: правила — `[...Arr::except(parent::rules(), [...])]`
  плюс `'id' => ['required', 'uuid']`. DTO обновления наследуется от DTO создания.
- Сообщения — в `messages()`, человекочитаемые названия полей — в `attributes()`.
- Для страниц сайта, где форма не отправляется (MVP), Request-классы не создаются.

### 5.3. DTO

- Наследники `Laravel\Foundation\Abstracts\AbstractDto`.
- Публичные свойства — `camelCase`, с явными типами.
- `AbstractDto` сам конвертирует `snake_case` входных ключей в `camelCase` свойства
  (включая вложенные DTO, enum, даты); `toArray()` отдаёт обратно `snake_case`.
- Массивы DTO объявляются через `getDtoArrays()`.
- `app/DTO/Request/{Entity}/` — DTO запроса. DTO сущностей для отдачи на фронт не создаются:
  наружу идут только ресурсы.
- Исключение — `app/DTO/{Page}DTO.php`: DTO агрегата страницы, когда в одном ответе нужно
  отдать разные сущности в сложной структуре. Такой DTO может содержать модели и
  `Collection` моделей; ресурс для него — в `app/Http/Resources/DTO/`.
- Если допустимы неизвестные ключи — переопределить конструктор и вызвать
  `parent::parseData($data, false)`.

### 5.4. Контроллер

- Тонкий: принять DTO (или параметры роута) → вызвать статический метод сервиса →
  вернуть `view(...)` с данными или обернуть ответ презентером.
- Никаких запросов к БД, вычислений, валидации, работы с моделями напрямую.
- Не возвращать модели, массивы моделей и `toArray()`.

### 5.5. Сервисы

- Вся бизнес-логика — `app/Services/`, наследники `Laravel\Foundation\Abstracts\AbstractService`.
- Методы **статические**: первым параметром DTO, вторым — контекст (например, `User`), если нужен.
- Вызов напрямую: `{Entity}Service::getList()`, `{Entity}Repository::query()`.
  Не `app({Entity}Service::class)->method()`.
- Транзакции — в сервисе (`DB::transaction()` или `beginTransaction`/`commit`/`rollBack`).
- Исключения — доменные из `app/Exceptions/` (`{Entity}NotFoundException`,
  `DefaultException`), не `\Exception` без необходимости.
- Общие сценарии выносятся в трейты `app/Traits/Service/`, а не в хелперы и статические
  утилитные классы.

### 5.6. Репозитории и модели

- Репозиторий на каждую модель: `app/Repositories/{Model}Repository.php`, наследник
  `Laravel\Foundation\Abstracts\AbstractRepository`, методы статические.
- Модель регистрируется в `AppServiceProvider::$modelList`; singleton репозитория создаётся
  автоматически по соглашению имён — отдельная регистрация не нужна.
- Готовые методы: `query()`, `getModel()`, `create()`, `update()`, `delete()`,
  `updateOrCreate()`, `firstOrCreate()`.
- **Никогда не мутировать модель напрямую**: `save()`, `update()`, `delete()`, `fill()->save()`,
  `forceDelete()` — запрещены в контроллерах, сервисах, командах и джобах. Только через репозиторий.
- Простой список: `Repository::query()->fromGetListDto($dto, $searchableFields)->paginate()`.
- Сложные джойны, `whereHas`, нестандартные выборки — методы репозитория; raw SQL допустим
  **внутри репозитория**, если Eloquent/`RepositoryBuilder` не хватает.
- **View БД не использовать.** Нужен функционал view — метод репозитория.
- Вычисляемые поля — `PropertyTransformer` + `getPropertyConfig()` в репозитории
  (интерфейс `TransformsProperties`).
- `AbstractRepository::getModel($id, $with)` возвращает `null`, если не найдено, —
  в сервисе бросать доменное исключение.
- Помнить: `Repository::delete()` может делать `forceDelete()` — учитывать для мягко удаляемых сущностей.
- Данные MVP (каталог, сезоны, категории) создаются миграциями и сидерами. Модель сразу
  проектируется под будущую админку: те же поля, что будет редактировать человек.

### 5.7. Ресурсы и презентеры

На каждую сущность — ровно один Resource: `app/Http/Resources/{Entity}Resource.php`,
наследник `Laravel\Foundation\Abstracts\AbstractResource`. Внутри кода сервисы и
репозитории работают с моделями и `Collection` моделей; на фронт модели попадают только
через Resource. Resource применяется на слое ответа — в контроллере или агрегирующем
page-ресурсе, но не внутри сервиса/репозитория.

- Resource — наследник `Laravel\Foundation\Abstracts\AbstractResource`.
- Для страницы с несколькими сущностями — DTO агрегата (`app/DTO/{Page}DTO.php`) и
  page-ресурс (`app/Http/Resources/DTO/{Page}Resource.php`), который собирается из ресурсов
  сущностей и не дублирует их поля.
- `id` и `slug` — идентификаторы для фронта; `slug` не принимается из Request.

| Метод | Назначение |
|---|---|
| `getFields([...])` | простые поля (только реально загруженные) |
| `getRelation('season', SeasonResource::class)` | связь (не загружена → `[]`) |
| `getEnum('field')` | enum → `{id, name, description?}` с переводом |
| `getEnumArray('field', Enum::class)` | массив enum'ов |
| `getDate('field')` / `renderDate('field')` | дата из модели / из DTO |
| `renderTimestamps()` | `created_at` + `updated_at` |
| `renderEnum($enum)` | enum без ключа |

- `*_id`, являющийся FK для `belongsTo`, не выводить напрямую — только через `getRelation()`.
- «Короткие» представления (dropdown, связи) — ресурсы в `app/Http/Resources/Short/`;
  ресурсы page-DTO — в `app/Http/Resources/DTO/`.
- Ответ оборачивать презентером: `DataResultPresenter` (одиночный), `PaginatedDataPresenter`
  (список, при несовпадении имён — `resourceNamespace:`). Ошибки — через исключения
  (`ValidationExceptionPresenter`, `ApiExceptionPresenter`, `AbstractExceptionHandler`).
- Resource отдаёт сырые значения без вычисленных `*_label`-полей; форматирование
  выполняет слой отображения (Blade/Vue).

### 5.8. Авторизация и доступ

- Авторизация — `laravel/passport` (OAuth2), middleware `auth:api`. Подключается, когда
  появятся закрытые эндпоинты; в MVP публичных страниц она не нужна.
- Проверка доступа к API: abilities/scopes токена и Policies (`Gate`/`can:`), если алиас
  зарегистрирован в `app/Http/Kernel.php` или `bootstrap/app.php`.
- Справочники: доступ — только middleware в `config/handbooks.php`
  (`global_middleware`, `defaults.middleware.*`, `*_middleware` у конкретного справочника).
- Права не проверяются в контроллере и не дублируются в Blade-шаблоне «на всякий случай».
- Подробности — skill `access-control`.

### 5.9. Enum'ы

- Native backed enums PHP + трейт `Laravel\Foundation\Traits\Enum\BaseEnumTrait`.
- Перевод **обязателен**: `lang/ru/enums.php`, формат
  `EnumClass::class => [EnumClass::Case->value => 'Название']` (при поддержке — блоки
  `names` / `descriptions`). Без перевода `render()`/`trans()` бросят
  `EnumTransNotFoundException` и упадёт любой Resource с `getEnum()`.
- Значение enum — `snake_case`, стабильное: это контракт с БД и фронтом.
- В миграциях — `$table->enum('field', EnumClass::values())`; для добавления нового
  значения — отдельная миграция с трейтом `EnumDBCheckAlterable` и вызовом `$this->alterEnum(...)`.
- Enum, нужный фронту как справочник, добавляется в `config/handbooks.php` → `enums`;
  пакет сам отдаёт его по `/enum/{kebab-имя}`.
- В Resource — только `getEnum()` / `getEnumArray()` / `renderEnum()`, чтобы фронт получал `{id, name}`.

### 5.10. Фронтенд: Blade + Vue-острова

- Контент, который должен попасть в поисковый индекс (шапка, `h1`, тексты сезонов, сетка
  каталога, цены, FAQ), рисует Blade. Остров — только для блоков, бесполезных без клика
  (колесо сезонов, модалки, карусели, тост FAB).
- Один entry-point `resources/js/app.ts` с реестром `{ 'season-wheel': SeasonWheel, ... }`;
  при загрузке находит все `[data-island]` и монтирует компонент из реестра. Неизвестное
  имя — `console.warn`, монтирование пропускается.
- Контейнер острова: `<div data-island="season-wheel" data-props='@json($props)'></div>`.
  Данные приходят пропсами из HTML, а не запросом в `mounted()`.
- Общее состояние между островами — модуль-стор (`resources/js/stores/*.ts`, `reactive`)
  как синглтон. Отдельный бандл на каждый остров не делаем: он продублирует модуль и разведёт состояние.
- Острова не вкладываем друг в друга; `mount()` затирает содержимое узла, поэтому SEO-контент
  держим вне контейнеров. Пустому контейнеру — `min-height`, чтобы не было CLS.
- Острова ниже фолда грузим лениво (`IntersectionObserver` + динамический `import()`).
- Переходы — обычные `<a href>` и маршруты Laravel. `vue-router` не заводим.
- `prefers-reduced-motion` уважается во всех анимациях: только opacity 150 ms.
- Токены — из `docs/handoff/04-tokens`, шрифты (Cormorant Garamond, Manrope) хостим сами
  (WOFF2, сабсеты cyrillic+latin, `font-display: swap`).
- Форматирование цены, веса, фасовки, склонений и дат — на фронтенде. Часовой пояс и
  локальный месяц пользователя определяет фронтенд; сервер отдаёт UTC и сырые значения.
- SVG-ассеты чистим на сборке через SVGO (`removeMetadata`), C2PA-метаданные в репозиторий не тащим.

---

## 6. Данные и БД

- Схема — `database/migrations/`, через `php artisan make:migration`.
- Мок-данные MVP — `database/seeders/`; сидеры идемпотентны (`updateOrCreate`, а не `insert`).
- Изменения данных — только через репозиторий (§5.6).
- VIEW в БД не создавать и не использовать. Raw SQL — только внутри репозитория.
- Параметры подключения (`.env`):

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=lyk-farm
DB_USERNAME=ippu
DB_PASSWORD=ippu
```

- Каждая колонка в миграции описывается `->comment('…')`; для `created_at`/`updated_at`
  явно указывается хранение в UTC.
- В модели у каждого поля в `$fillable` — inline-комментарий с названием и назначением.
- Даты и время хранятся в БД в UTC и передаются на фронт в UTC; сервер не переводит их
  в часовой пояс пользователя.
- Снапшота схемы и команды `db:dump-schema` в проекте нет — актуальная схема читается
  из миграций.

---

## 7. Пакеты `vasichmen/*`

| Пакет | Что даёт | Где настраивается |
|---|---|---|
| `laravel-foundation` | `AbstractModel`, `AbstractRepository`, `RepositoryBuilder`, `AbstractService`, `AbstractRequest`/`AbstractDto`, `AbstractResource`, презентеры, `BaseEnumTrait`, исключения | `AppServiceProvider` |
| `laravel-handbooks` | REST для справочников, short/dynamic-списки, отдача enum'ов | `config/handbooks.php` |

- Пакеты поддерживает сам разработчик проекта, поэтому правки в них допустимы — но отдельной
  задачей, с сохранением обратной совместимости и без правок «по месту» ради одной задачи.
- `vendor/` не редактируется: изменения в пакет идут в его репозиторий, затем `composer update`.
- Сначала проверяем, есть ли нужное в пакете; своё пишем, только если функционала нет.

---

## 8. Именование

- Ключи массивов, поля JSON, колонки БД — `snake_case`; коды справочников и URL-сегменты — `kebab-case`.
- Свойства, методы, переменные — `camelCase`; компоненты Vue — `StudlyCase` (`SeasonWheel.vue`).
- Константы — `CAPS_LOCK` (`const int CACHE_TTL = 3600;`).
- Классы — `StudlyCase`, файлы — PSR-4.
- Связи моделей — без префикса `r*`: `season`, `category`, `products`; ключи в конфигах и JSON —
  `snake_case` (`season`, `category`).
- Slug — техническое поле: генерируется на событии модели, не принимается из Request и не
  редактируется с фронта. Resource отдаёт `slug` и `id` как идентификаторы для URL.
- Не переименовывать существующие публичные поля, методы и ключи JSON: на них завязаны фронт и сидеры.
- Каталоги change'ей OpenSpec (`openspec/changes/{name}`) и capability — английский
  `kebab-case` по смыслу, глагол + объект: `add-design-system-foundation`,
  `fix-season-wheel-scroll`. Русское описание сначала переводится на английский;
  транслитерация и пословный slug запрещены. Имя из одних дефисов или цифр
  (`-----1`, `change-2`) — брак: осмысленное имя обязательно, иначе спросить пользователя.

---

## 9. Запреты (кратко)

- Бизнес-логика в контроллере, Request, Blade-шаблоне или Resource.
- Валидация где-либо, кроме Request.
- Возврат из JSON-контроллера массива/модели без Resource и презентера.
- Прямые мутации модели (`save`/`update`/`delete`/`fill`/`forceDelete`).
- VIEW в БД; raw SQL вне репозитория.
- Ручные роуты и контроллеры справочников в обход `config/handbooks.php`.
- Правки `vendor/` вместо правки пакета в его репозитории.
- Статические «хелперы» и утилитные классы вместо трейтов.
- Enum без перевода в `lang/ru/enums.php`.
- `app(SomeService::class)->method()` для новых сервисов/репозиториев.
- SPA-подходы: `vue-router`, Inertia, SSR, Composition API, единый корневой экземпляр Vue.
- SEO-контент внутри контейнера острова.
- Отдача модели/коллекции моделей на фронт в обход Resource.
- Resource внутри сервиса или репозитория; сервис должен возвращать модели.
- Форматирование данных для отображения на backend (цена, вес, склонения, даты, статусы).
- Серверный часовой пояс для пользовательских дат и локального месяца.
- Нативные `mb_*`, `array_slice`, `array_filter`, `array_map`, `array_merge`, `usort` вместо
  `Collection`, `Str`, `Arr` (кроме границы API, где нужен массив: `->all()`).
- Колонка миграции без `->comment(...)` и поле `$fillable` без inline-комментария.
- Redis, Kafka, очереди, Telescope, S3 — без отдельного решения.
- Коммит или пуш без явной просьбы пользователя.

---

## 10. Проверка перед сдачей

```bash
php -l app/Path/To/ChangedFile.php     # синтаксис каждого изменённого PHP-файла
php artisan route:list                 # роуты на месте, без конфликтов и дублей
./vendor/bin/pint --test               # стиль PHP (или pint по изменённым файлам)
./vendor/bin/phpstan analyse           # статический анализ
npm run lint                           # ESLint + Prettier
npx vue-tsc --noEmit                   # типы во Vue/TS
npx playwright test                    # когда Playwright настроен
```

Дополнительно вручную:

- в контроллере нет бизнес-логики и запросов к БД;
- SEO-контент отдаётся Blade, а не монтируется JS;
- у каждого нового enum есть перевод;
- у каждой сущности есть `{Entity}Resource`; модели наружу идут только через Resource;
- в Resource нет отформатированных `*_label`-полей и серверного часового пояса;
- каждая колонка миграции и каждое поле `$fillable` имеют комментарий;
- в приложении нет нативных `array_*`/`mb_*` вместо коллекций и `Str`/`Arr`;
- справочники подключены только через `config/handbooks.php`;
- вёрстка сверена с ТЗ и токенами `docs/handoff/04-tokens` (пиксельного сравнения нет, ТЗ §18);
- если фаза закрыта: change заархивирован, а `docs/plan/PLAN.md` обновлён — `✅` в §3 и в заголовке фазы §4, актуальная «Текущая точка»;
- не тронут `vendor/`.

Полный чек-лист — skill `definition-of-done`.

---

## 11. Карта skills

Skills лежат в `.agents/skills/{name}/SKILL.md`. Если skill прочитан — его шаги обязательны;
расхождений с этим файлом и `rules.md` быть не должно. Обнаружил расхождение — правь skill,
а не дублируй шаги здесь.

| Skill | Когда читать |
|---|---|
| `new-entity` | Новая таблица/модель, новый набор данных. Оркестратор: ссылается на остальные skills |
| `new-endpoint` | Новый роут: страница (web) или JSON-эндпоинт, контроллер, презентер |
| `frontend-islands` | Blade-шаблон, Vue-остров, `app.ts`, сторы, токены, шрифты, SVG-пайплайн |
| `request-dto` | Валидация, Request-классы, DTO, Create/Update-наследование |
| `resource-presenter` | JSON-ответ: Resource, `getRelation`/`getEnum`, презентеры, пагинация |
| `service-repository` | Бизнес-логика, статические сервисы, репозитории, выборки, транзакции |
| `access-control` | Passport, middleware, abilities/scopes, Policies, доступ к справочникам |
| `enums-and-translations` | Новый enum, перевод в `lang/ru/enums.php`, enum-справочник |
| `handbooks` | CRUD/динамический/enum-справочник через `vasichmen/laravel-handbooks` |
| `definition-of-done` | Перед сдачей задачи: финальный чек-лист и команды проверки |
