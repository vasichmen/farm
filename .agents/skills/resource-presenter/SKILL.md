---
name: resource-presenter
description: JSON-ответ в lyk-farm — AbstractResource, getFields/getRelation/getEnum/getDate, Short-ресурсы, DataResultPresenter, PaginatedDataPresenter, свои презентеры и ошибки; отличия от Blade-рендеринга страниц. Использовать при создании или правке Resource, при добавлении поля в JSON-ответ и при жалобах фронта на структуру ответа.
---

# Resource и презентер

Правила: `rules.md` §5. Из JSON-контроллера не уходят модели и массивы — только Resource
в презентере.

**Где это применяется.** На каждую сущность — ровно один Resource. JSON API, props
Vue-островов и любые данные для фронта проходят через Resource. Страницу рендерит Blade,
но модели в props/JSON не сериализуются напрямую. Сервисы и репозитории возвращают
модели/`Collection` моделей; Resource применяется в контроллере или page-ресурсе.

## 1. Resource сущности

`app/Http/Resources/{Entity}Resource.php`, наследник
`Laravel\Foundation\Abstracts\AbstractResource`. Для страницы из нескольких сущностей —
`app/Http/Resources/{Page}Resource.php`, который собирается из ресурсов сущностей.

```php
class {Entity}Resource extends AbstractResource
{
    public function toArray($request): array
    {
        return [
            ...$this->getFields(['id', 'slug', 'title', 'sort_order']),
            ...$this->getRelation('season', SeasonResource::class),
            ...$this->getRelation('category', CategoryResource::class),
            ...$this->getEnum('status'),
            ...$this->renderTimestamps(),
        ];
    }
}
```

Методы `AbstractResource`:

| Метод | Когда |
|---|---|
| `getFields([...])` | простые поля, реально загруженные в модель |
| `getRelation('rX', XResource::class)` | связь `belongsTo`/`hasOne`/`hasMany` (не загружена → `[]`) |
| `getEnum('field')` | enum-поле модели → `{id, name, description?}` |
| `getEnumArray('field', Enum::class)` | массив enum-значений |
| `getDate('field')` | дата из модели |
| `renderDate('field')` | дата из DTO/объекта |
| `renderTimestamps()` | `created_at` + `updated_at` |
| `renderEnum($enum)` | enum без ключа (для вложенных структур) |

## 2. Правила отображения

- `*_id`, являющийся FK для `belongsTo`, не выводится — вместо него `getRelation()`.
- Бизнес-поле, не являющееся FK, выводится как обычное поле.
- Enum — только через `getEnum()`/`getEnumArray()`; ручное `->value`/`->name` ломает контракт.
- Ключи ответа — `snake_case`.
- Не догружать связи внутри Resource (никаких `->load()`): связи грузятся в репозитории
  через `with()`/`fromGetListDto()`.
- Поля, которых нет в выборке, не указывать в `getFields()` — иначе пустые значения в ответе.
- Resource отдаёт сырые значения: `price`, `price_unit`, `pack`, `status`. Вычисленные
  `price_label`/`status_label`/`*_label` не добавляются — форматирование делает фронтенд.

## 3. Short-ресурсы

- Выпадающие списки и вложенные ссылки — `app/Http/Resources/Short/{Entity}ShortResource.php`
  (`id` + отображаемое имя).
- Ресурсы page-DTO — `app/Http/Resources/DTO/{Page}Resource.php`; сам DTO агрегата лежит
  в `app/DTO/{Page}DTO.php` и может содержать модели/`Collection` моделей.
- Один Resource — одно представление; «универсальный» Resource с флагами не делать.

## 4. Презентеры

```php
// одиночный
return new DataResultPresenter([
    '{entity}' => new {Entity}Resource($model),
]);

// список
return new PaginatedDataPresenter(
    {Entity}Service::getList($request->validated()),
    resourceNamespace: {Entity}Resource::class, // если имя Resource не совпадает с моделью
);
```

- `DataResultPresenter` принимает готовое содержимое: Resource оборачивается вручную,
  модель напрямую не передаётся.
- `PaginatedDataPresenter` принимает `LengthAwarePaginator`; второй параметр — агрегаты,
  третий (`resourceNamespace`) — класс Resource.
- Нестандартная обёртка — свой класс в `app/Http/Presenters/`, а не массив в контроллере.

## 5. Ошибки

- Доменные исключения в сервисе → `AbstractExceptionHandler` → `ApiExceptionPresenter`.
- Ошибки валидации → `ValidationExceptionPresenter`.
- В контроллере ответы об ошибках руками не формируются.

## 6. Проверка

```bash
php -l app/Http/Resources/{Entity}Resource.php
./vendor/bin/pint --test
```

Вручную: дернуть эндпоинт, сверить ключи с ожиданиями фронта, проверить, что enum приходит
объектом с переводом, что связи не `null`, а `[]`, что нет N+1.

## Частые ошибки

- `*_id` FK выводится напрямую — фронт получает «сырой» id без названия.
- Enum выведен через `->value` — перевод не приходит.
- Связь догружается в Resource — N+1 и скрытые запросы в представлении.
- В контроллере возвращается `$model` или `$paginator` без Resource/презентера.
- `PaginatedDataPresenter` без `resourceNamespace` при несовпадении имён.
- Ключи в ответе в `camelCase` вместо `snake_case`.
- Resource создан для страницы, которую рендерит Blade, — лишний слой.
