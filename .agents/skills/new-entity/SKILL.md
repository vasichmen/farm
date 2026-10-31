---
name: new-entity
description: Пошаговый алгоритм добавления новой сущности в lyk-farm — миграция, модель, репозиторий, DTO, Request, Resource, сервис, контроллер, web- и API-роуты, enum'ы, сидеры, справочник. Использовать при создании новой таблицы/модели, нового набора данных или когда нужно понять полный порядок работ по сущности с нуля.
---

# Новая сущность

Оркестратор: задаёт порядок работ и ссылается на детальные skills. Инварианты —
`AGENTS.md`, нормативные запреты — `rules.md`. Этот файл правил не дублирует.

Перед началом прочитать: `AGENTS.md` §4–5, `docs/tz/TZ-lyk-farm.md` §10 (модель данных), миграции
и ближайшую существующую сущность как эталон.

## 0. Что нужно знать до кода

- Название сущности: `{Entity}` (StudlyCase) и `{entity}` (kebab-case) — используются во всех слоях.
- Таблица, колонки, типы, FK, индексы. Поля, доступные для изменения.
- Нужен ли справочник (пакет `laravel-handbooks`) и enum'ы.
- Откуда берутся данные на старте: сидер (мок-контент) или ручной ввод.
- Что будет редактировать админка в будущем — поля проектируются под неё сразу.

Неясности фиксируются в задаче до реализации — не выдумываются по ходу.

## 1. Миграция

- `php artisan make:migration create_{entity}_table`.
- Колонки `snake_case`, FK — `{model}_id`, индексы на FK и поля фильтрации.
- Значения enum в БД — строка/целое, совпадающее с `value` кейса.
- Снапшота схемы в проекте нет: схема читается из миграций.

## 2. Модель

`app/Models/{Entity}.php`, наследник `Laravel\Foundation\Abstracts\AbstractModel`.

```php
class {Entity} extends AbstractModel
{
    protected $table = '{entity}';
    protected $fillable = ['title', 'slug', 'sort_order', 'active', 'season_id'];
    protected $casts = ['active' => 'boolean', 'sort_order' => 'integer'];

    public function rSeason(): BelongsTo
    {
        return $this->belongsTo(Season::class, 'season_id');
    }
}
```

- Связи — с префиксом `r*`, ключи в JSON/конфигах — `snake_case`.
- `$fillable` содержит всё, что разрешено менять через репозиторий.
- Enum-поля — `$casts = ['status' => ProductStatusEnum::class]`.

## 3. Репозиторий

`app/Repositories/{Entity}Repository.php`, наследник `AbstractRepository`, методы статические.
Готовые операции (`create`, `update`, `delete`, `updateOrCreate`, `firstOrCreate`, `query`)
переиспользуются; добавляются только нестандартные выборки. Детали — skill `service-repository`.

## 4. Регистрация

Модель добавляется в `AppServiceProvider::$modelList`. Репозиторий подхватывается
по соглашению имён — отдельная регистрация не нужна.

## 5. Enum'ы

Все перечисления сущности (`status`, `sale_unit`, `price_unit`, `shape` и т.п.) —
до сервисов и ресурсов: `app/Enums/{Name}Enum.php` + перевод в `lang/ru/enums.php`.
Детали — skill `enums-and-translations`.

## 6. DTO

- DTO сущности: `app/DTO/Models/{Entity}DTO.php` — если сущность отдаётся в JSON.
- DTO запросов: `app/DTO/Request/{Entity}/`.
- Свойства `camelCase` с типами, `toArray()` отдаёт `snake_case`.
- Детали — skill `request-dto`.

## 7. Request

`app/Http/Requests/{Entity}/`:

- `Create{Entity}Request` — правила + `$dtoClassName`;
- `Update{Entity}Request extends Create{Entity}Request` — только отличия + `id`;
- для списка/деталки — пакетные `GetListRequest` / `GetEntityRequest`.

Нужны только для JSON API. Для страниц сайта без формы Request не создаётся.

## 8. Resource

`app/Http/Resources/{Entity}Resource.php` (+ `Short/` для выпадающих списков):
`getFields`, `getRelation`, `getEnum`, `getDate`/`renderTimestamps`.
Детали — skill `resource-presenter`.

## 9. Сервис

`app/Services/{Entity}Service.php`, наследник `AbstractService`, только статические методы:

- `getList($dto)`, `detail($dto)`, `create($dto)`, `update($dto)`, `delete($dto)`;
- для страниц — методы, возвращающие данные для Blade (`getHomePage()`, `getSeason($slug)`);
- транзакции при многошаговых изменениях;
- доменные исключения вместо `null`/`false` в ответе.

## 10. Контроллер и роуты

- Страница: `app/Http/Controllers/{Page}Controller.php` → `view('pages.home', $data)`,
  роут в `routes/web.php`.
- JSON: `app/Http/Controllers/Api/{Entity}Controller.php` → `DataResultPresenter` /
  `PaginatedDataPresenter`, роут в `routes/api.php`.
- Детали — skill `new-endpoint`.

## 11. Сидеры

- `database/seeders/{Entity}Seeder.php`, идемпотентно (`updateOrCreate` по `slug`/`code`).
- Мок-контент — из `docs/tz/TZ-lyk-farm.md` §10.3 и §22.2 (таблица контента дизайнера), без выдуманных фактов.
- Сидер подключается в `DatabaseSeeder` в правильном порядке (сначала справочники, потом связи).

## 12. Справочник (если нужен)

Если сущность должна редактироваться через API пакета — запись в `config/handbooks.php`
(`crud` / `dynamic.custom` / `enums`), skill `handbooks`. Ручные роуты не пишутся.

## 13. Проверка

```bash
php -l <изменённые файлы>
php artisan migrate
php artisan db:seed
php artisan route:list
./vendor/bin/pint --test
./vendor/bin/phpstan analyse
```

Финальный чек-лист — skill `definition-of-done`.

## Частые ошибки

- Модель не добавлена в `$modelList` — репозиторий не резолвится.
- Роут создан, но не подключён/не в той группе (`web` вместо `api`).
- Нет `$dtoClassName` в Request — в сервис приходит массив.
- Поле добавлено в миграцию, но не в `$fillable`/`$casts`/Resource.
- Забыт перевод enum — падает Resource с `getEnum()`.
- Мутации модели в сервисе вместо репозитория.
- Сидер с `insert` — повторный запуск падает или дублирует данные.
