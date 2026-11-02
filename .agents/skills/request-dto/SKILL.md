---
name: request-dto
description: Валидация и перенос входных данных в lyk-farm — AbstractRequest, правила, messages/attributes, dtoClassName, AbstractDto, Create/Update-наследование, пакетные GetList/GetEntity. Использовать при создании или правке Request-класса и DTO, при добавлении поля в запрос и при разборе проблем с валидацией.
---

# Request и DTO

Правила: `rules.md` §3. Валидация — только в Request, данные в сервис приходят DTO.

**Когда это нужно.** Request и DTO в проекте появляются только вместе с JSON API
(справочники, закрытые эндпоинты). Страницы сайта в MVP формы не отправляют — Request
для них не создаётся.

## 1. Выбор класса запроса

| Сценарий | Что использовать |
|---|---|
| Список с фильтрами/сортировкой/пагинацией | пакетный `GetListRequest` + `GetListRequestDTO` |
| Одна сущность по `id` | пакетный `GetEntityRequest` + `GetEntityRequestDTO` |
| Create / Update / специфичная операция | свой `{Action}{Entity}Request` + свой DTO |

Свой Request для list/detail не создаётся — расширять пакетный только при реальной
дополнительной логике.

## 2. Свой Request

`app/Http/Requests/{Entity}/{Action}{Entity}Request.php`,
наследник `Laravel\Foundation\Abstracts\AbstractRequest`.

```php
class Create{Entity}Request extends AbstractRequest
{
    protected ?string $dtoClassName = Create{Entity}RequestDTO::class;

    public function rules(): array
    {
        return [
            'title' => ['required', 'string'],
            'status' => ['required', Rule::enum(ProductStatusEnum::class)],
            'items' => ['array'],
            'items.*.id' => ['uuid'],
        ];
    }

    public function messages(): array
    {
        return ['title.required' => 'Укажите название'];
    }

    public function attributes(): array
    {
        return ['title' => 'название'];
    }
}
```

Правила:

- `$dtoClassName` обязателен — иначе `validated()` вернёт массив.
- Enum-поля — `Rule::enum(StatusEnum::class)`, не «магической строкой» `in:` в правилах.
- FK — `new Exists('products', 'id')`; уникальность — `new Unique('products', 'code')`
  для полей, которые действительно вводятся с фронта.
- Slug не принимается из Request: он генерируется на событии модели `saving` из `name`.
- Кастомные правила — `app/Http/Rules/`.
- Вложенные массивы описываются полностью: невалидированные ключи отбрасываются
  (`$excludeUnvalidatedArrayKeys = true`).
- `#[OA\Schema]` — только для запросов с телом, и только если Swagger подключён (см. skill `new-endpoint` §8).

## 3. Update и «похожие» операции

```php
class Update{Entity}Request extends Create{Entity}Request
{
    protected ?string $dtoClassName = Update{Entity}RequestDTO::class;

    public function rules(): array
    {
        return [
            ...Arr::except(parent::rules(), ['title']),
            'id' => ['required', 'uuid'],
            'title' => ['sometimes', 'string'],
        ];
    }
}
```

Тот же приём для `SetActive`, `Bind`, `ChangeStatus` — наследование от ближайшей по смыслу пары.

## 4. DTO

`app/DTO/Request/{Entity}/{Action}{Entity}RequestDTO.php`,
наследник `Laravel\Foundation\Abstracts\AbstractDto`.

```php
class Create{Entity}RequestDTO extends AbstractDto
{
    public string $title;
    public StatusEnum $status;
    /** @var ItemDTO[] */
    public array $items = [];

    protected function getDtoArrays(): array
    {
        return ['items' => ItemDTO::class];
    }
}
```

- Свойства — `camelCase`, с типами; `snake_case` входных ключей преобразуется автоматически.
- `toArray()` возвращает `snake_case` — используется для передачи в репозиторий.
- Вложенные DTO — через `getDtoArrays()`; enum и даты приводятся автоматически.
- Если допустимы неизвестные ключи — переопределить конструктор и вызвать
  `parent::parseData($data, false)`.
- DTO сущности для отдачи на фронт не создаётся: наружу идёт `{Entity}Resource`.
  DTO здесь — только перенос входных данных запроса.

## 5. Использование в контроллере и сервисе

```php
public function create(Create{Entity}Request $request): DataResultPresenter
{
    return new DataResultPresenter([
        '{entity}' => new {Entity}Resource({Entity}Service::create($request->validated())),
    ]);
}
```

`$request->validated()` уже возвращает DTO — приведение типов и разбор массивов в контроллере
и сервисе не нужны.

## 6. Проверка

```bash
php -l app/Http/Requests/{Entity}/Create{Entity}Request.php
php -l app/DTO/Request/{Entity}/Create{Entity}RequestDTO.php
./vendor/bin/pint --test
./vendor/bin/phpstan analyse
```

Вручную: обязательные поля, enum-значения, FK на существующие записи, уникальность вводимых
полей, отсутствие slug в правилах и DTO, поведение при невалидированных вложенных ключах.

## Частые ошибки

- Нет `$dtoClassName` — в сервис приходит массив, типы DTO не работают.
- Валидация продублирована в сервисе «на всякий случай».
- Enum-значения перечислены строкой и разошлись с `value` кейсов.
- Update не наследуется от Create — правила расходятся.
- Свойства DTO в `snake_case`.
- Массив вложенных DTO объявлен без `getDtoArrays()` — приходят массивы, а не объекты.
- `#[OA\Schema]` с полями тела лежит в контроллере вместо Request (когда Swagger подключён).
- Request создан для страницы, у которой нет формы, — мёртвый код.
