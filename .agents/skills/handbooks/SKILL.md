---
name: handbooks
description: Справочники через vasichmen/laravel-handbooks — config/handbooks.php (crud, dynamic.custom, enums, defaults), Request с DTO, short- и dynamic-списки, middleware доступа, категории и сезоны как справочники. Использовать при подключении CRUD-справочника, динамического справочника, enum-справочника и при выдаче доступа к справочнику.
---

# Справочники (`vasichmen/laravel-handbooks`)

Правила: `rules.md` §9 (R-PKG-3), §10. Роуты и контроллеры создаёт пакет — свои писать нельзя.

**Когда нужно.** Категории, сезоны и прочие перечисления-сущности MVP создаются сидерами.
Справочник подключается, когда появляется админка или фронту нужны short/dynamic-списки.

## 1. CRUD-справочник

1. **Модель + репозиторий.** Обычные модель и репозиторий проекта; модель зарегистрирована
   в `AppServiceProvider::$modelList`.
2. **Request-классы.** `app/Http/Requests/Handbook/Create/Create{Entity}HandbookRequest.php`
   и `.../Update/Update{Entity}HandbookRequest.php` (наследник от Create):
   - `extends AbstractRequest`;
   - обязателен `protected ?string $dtoClassName = {Entity}DTO::class;` — через него пакет
     передаёт данные в репозиторий;
   - в Update добавляется `'id' => ['required', 'uuid']` (или правило под ваш PK).
3. **DTO.** `app/DTO/Request/Handbook/{Entity}HandbookDTO.php` — `camelCase`-свойства с типами.
4. **Resource.** `app/Http/Resources/{Entity}Resource.php` (+ `Short/` для выпадающих списков).
5. **Конфиг.** `config/handbooks.php` → `crud`:

   ```php
   '{entity}' => [
       'repository' => {Entity}Repository::class,
       'resource' => {Entity}Resource::class,
       'create_request' => Create{Entity}HandbookRequest::class,
       'update_request' => Update{Entity}HandbookRequest::class,
       'searchable_fields' => ['title', 'slug'],
       'with' => [
           'list' => ['season'],                  // методы list
           'detail' => ['season'],                // create/update/detail
       ],
       // 'readonly' => true,                      // только чтение
       // 'create_middleware' / 'update_middleware' / 'delete_middleware' / 'view_middleware'
   ],
   ```

   - Ключ — код справочника в URL (`kebab-case`), совпадает с ожиданием фронта.
   - `with` задавать явно для тяжёлых моделей: без него пакет грузит все связи.
   - Мидлвары по умолчанию берутся из `defaults.middleware.{create,update,delete,view}`.
   - `readonly => true` — только чтение (create/update/delete вернут `HandbookAccessException`).
6. **Доступ.** `global_middleware` (обычно `['auth:api']`), `defaults.middleware.*`,
   `*_middleware` у конкретного справочника. Роуты руками не пишутся.

## 2. Динамический справочник (short/dynamic)

Только списки, без CRUD — `config/handbooks.php` → `dynamic.custom`:

```php
'{entity}' => [
    // 'model' => {Entity}::class,          // если имя не выводится из kebab-кода
    // 'repository' => {Entity}Repository::class,
    'resource' => {Entity}ShortResource::class,
    'select' => ['id', 'title', 'slug'],
    'searchable_fields' => ['title', 'slug'],
],
```

- По умолчанию модель/репозиторий ищутся по kebab-коду: `{entity}` → `App\Models\{Entity}`,
  `App\Repositories\{Entity}Repository`.
- Фронт использует `/handbook/short/{model}`, `POST /handbook/short-pack`,
  `/handbook/dynamic/{model}/{field}`.
- Значения по умолчанию — `default_select`, `default_with`, `default_searchable_fields`.
- Код в URL строится через kebab-case от кода справочника.

## 3. Enum-справочник

- Класс enum'а добавляется в `config/handbooks.php` → `enums`.
- Роут `/enum/{kebab-имя}` (например, `ProductStatusEnum` → `/enum/product-status`)
  создаётся пакетом автоматически.
- Перевод в `lang/ru/enums.php` обязателен (skill `enums-and-translations`).
- Если нужна фильтрация значений — формат `EnumClass::class => ['filter' => fn ($case) => ...]`.

## 4. Доступ

- `global_middleware` — на все роуты справочников (в проекте — `auth:api` из Passport).
- `defaults.middleware.global` — на всю группу handbooks.
- `defaults.middleware.{create,update,delete,view}` — права по умолчанию.
- Права на справочник не выносятся на роут и не проверяются в контроллере.
- Подробности — skill `access-control`.

## 5. Проверка

```bash
php artisan route:list | grep -E "handbook|enum"
```

Вручную: список, short-список с поиском, create/update через справочник, отказ без токена,
корректные `id`/названия в выпадающем списке, отсутствие N+1.

## Частые ошибки

- Код справочника в конфиге не совпадает с ожиданием фронта.
- В Request не задан `$dtoClassName` — пакет не может создать/обновить запись.
- Модель не добавлена в `$modelList` — пакет не находит репозиторий.
- Ручные роуты справочника в `routes/api.php` — конфликт с пакетом.
- Не задан `with` — пакет тянет все связи и тормозит.
- Справочник только для чтения, но `readonly` не выставлен.
- Enum добавлен в `enums`, но перевода нет — 500 на `/enum/...`.
