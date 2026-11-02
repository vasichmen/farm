---
name: service-repository
description: Бизнес-логика и доступ к данным в lyk-farm — AbstractService со статическими методами, AbstractRepository, $modelList, fromGetListDto, RepositoryBuilder, PropertyTransformer, транзакции, доменные исключения, сидеры. Использовать при реализации бизнес-логики, добавлении выборки или метода репозитория и при разборе ошибок доступа к данным.
---

# Сервис и репозиторий

Правила: `rules.md` §4. Вся логика — в сервисе, весь доступ к БД — в репозитории.
Сервис возвращает модели или `Collection` моделей; Resource в сервисе не применяется.

## 1. Сервис

`app/Services/{Entity}Service.php`, наследник `Laravel\Foundation\Abstracts\AbstractService`,
только статические методы.

```php
class {Entity}Service extends AbstractService
{
    public static function getList(GetListRequestDTO $dto): LengthAwarePaginator
    {
        return {Entity}Repository::query()
            ->fromGetListDto($dto, ['title', 'slug'])
            ->paginate();
    }

    public static function getHomePage(): array
    {
        $season = SeasonService::getActiveSeason();

        return [
            'seasons' => SeasonService::getWheelItems(),
            'products' => ProductService::getForGrid($season),
        ];
    }
}
```

Требования:

- Первый параметр — DTO (или параметры роута), второй — контекст, если нужен.
- Вызов только статический: `{Entity}Service::method()`, `{Entity}Repository::query()`.
- Транзакции — здесь: `DB::transaction()` либо `beginTransaction`/`commit`/`rollBack`
  с откатом в `catch`.
- Доменные исключения (`{Entity}NotFoundException`, `DefaultException`).
- Проверки доступа — в начале операции (skill `access-control`).
- Общая логика нескольких сервисов — трейт `app/Traits/Service/`, не хелпер.
- Сервис отдаёт сырые значения (число, enum-код, строку, UTC-дату). Форматирование
  (цена, вес, склонения, даты, подписи статусов) и локальный часовой пояс — на фронтенде.

## 2. Репозиторий

`app/Repositories/{Entity}Repository.php`, наследник `AbstractRepository`, статические методы.

Что уже есть и переиспользуется:

| Метод | Назначение |
|---|---|
| `query()` | builder проекта (`RepositoryBuilder`) |
| `getModel($id, $with)` | получение модели или `null` |
| `create($data)` / `update($id, $data)` | мутации |
| `delete($id)` | удаление (может быть `forceDelete`) |
| `updateOrCreate($attrs, $values)` / `firstOrCreate($attrs, $values)` | upsert-сценарии |

Что добавляется в репозиторий:

- сложные выборки (`join`, `whereHas`, подзапросы, агрегаты);
- переиспользуемые фильтры и сортировки;
- raw SQL, если `RepositoryBuilder`/Eloquent не хватает;
- `getPropertyConfig()` при интерфейсе `TransformsProperties` (вычисляемые поля).

```php
class {Entity}Repository extends AbstractRepository
{
    public static function getVisibleForSeason(string $seasonSlug): Collection
    {
        return static::query()
            ->whereHas('seasons', fn ($q) => $q->where('slug', $seasonSlug))
            ->where('status', '!=', ProductStatusEnum::Out)
            ->with(['category'])
            ->orderBy(['sort_order' => 'asc'])
            ->get();
    }
}
```

## 3. Регистрация модели

- Модель добавляется в `AppServiceProvider::$modelList`.
- Репозиторий связывается по соглашению имён (`{Model}` → `{Model}Repository`) — отдельная
  регистрация не нужна.

## 4. Списки и фильтрация

- Простой список: `query()->fromGetListDto($dto, $searchableFields)->paginate()` —
  даёт фильтры, поиск, сортировку и пагинацию из DTO.
- Всё, что сложнее (join, `whereHas`, подзапросы, нестандартная сортировка) — метод репозитория.
- Жадная загрузка связей (`with()`) — до Resource, иначе N+1.
- «Нет в наличии» не попадает в выборки сеток и колеса (ТЗ §3, В6), но доступно
  по прямой ссылке — это отдельный метод, не флаг в общем списке.

## 5. Мутации

- Только через методы репозитория; `$model->save()/update()/delete()` запрещены.
- Массовые изменения — `Repository::query()->filters([...])->update([...])` внутри метода
  репозитория с явным фильтром.
- Сидеры тоже мутируют данные через репозиторий (`updateOrCreate`), а не `Model::insert()`.

## 6. Ошибки и пустые результаты

- `getModel()` вернул `null` → доменное исключение в сервисе.
- Ошибки ограничений БД → `KeyViolationException` (из `laravel-handbooks`) с понятным сообщением.
- Не возвращать `null`/`false` как признак ошибки в API-ответе.

## 7. Проверка

```bash
php -l app/Services/{Entity}Service.php
php -l app/Repositories/{Entity}Repository.php
./vendor/bin/pint --test
./vendor/bin/phpstan analyse
php artisan route:list
```

Вручную: сценарий с несуществующим id, с пустым списком, с большим списком (пагинация),
с конкурентной записью (транзакция), повторный запуск сидера.

## Частые ошибки

- Бизнес-логика в контроллере или в модели.
- `app({Entity}Service::class)->method()` вместо статического вызова.
- Мутация модели в сервисе.
- `whereHas`/`join` в сервисе вместо репозитория.
- Транзакция открыта в контроллере или не закрыта при исключении.
- N+1 из-за отсутствия `with()` перед Resource.
- Сидер с `insert` — дубли или падение на повторном запуске.
