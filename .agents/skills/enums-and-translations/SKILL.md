---
name: enums-and-translations
description: Enum'ы и переводы в lyk-farm — BaseEnumTrait, lang/ru/enums.php (names/descriptions), касты в модели, использование в Resource и Request, enum-справочник в config/handbooks.php, сезоны/статусы/единицы продажи. Использовать при добавлении или изменении enum, при ошибке EnumTransNotFoundException и при выводе enum во фронт.
---

# Enum и переводы

Правила: `rules.md` §6. Enum без перевода ломает любой Resource с `getEnum()`.

## 1. Объявление enum

`app/Enums/{Name}Enum.php`:

```php
enum {Name}Enum: string
{
    use BaseEnumTrait;

    case InStock = 'in_stock';
    case Few = 'few';
    case Preorder = 'preorder';
    case Out = 'out';
}
```

- Native backed enum (`string`/`int`) + `Laravel\Foundation\Traits\Enum\BaseEnumTrait`.
- Значение — `snake_case`, стабильное (это контракт с БД и фронтом).
- Значения не переименовываются без миграции данных.

## 2. Перевод

`lang/ru/enums.php`:

```php
return [
    'names' => [
        {Name}Enum::class => [
            {Name}Enum::InStock->value => 'В наличии',
            {Name}Enum::Few->value => 'Осталось мало',
            {Name}Enum::Preorder->value => 'Предзаказ',
            {Name}Enum::Out->value => 'Нет в наличии',
        ],
    ],
    'descriptions' => [
        // необязательно, если фронт использует описания
    ],
];
```

- `BaseEnumTrait` ищет перевод по `value`, затем по имени кейса, поддерживает оба формата
  файла (`enums.names.*` и `enums.*`). В проекте использовать один стиль — `names`.
- Пропуск перевода → `EnumTransNotFoundException` при `render()`/`trans()`.

## 3. Где используется

| Место | Как |
|---|---|
| Модель | `$casts = ['status' => ProductStatusEnum::class]` |
| Request | `Rule::enum(ProductStatusEnum::class)` в правилах |
| DTO | типизированное свойство `public ProductStatusEnum $status;` (приводится автоматически) |
| Resource | `getEnum('status')`, `getEnumArray('statuses', Enum::class)`, `renderEnum($enum)` |
| Сервис | сравнение кейсов (`$product->status === ProductStatusEnum::Out`), не строк |
| Blade | вывод через `$enum->render()['name']` из сервиса/презентера, не в шаблоне «на лету» |
| Справочник для фронта | `config/handbooks.php` → `enums` |

В контроллере `->render()` не вызывается.

## 4. Enum-справочник для фронта

Если фронт должен получать значения как справочник:

1. Добавить класс enum в `config/handbooks.php` → `enums` (простой список или
   `EnumClass::class => ['filter' => fn ($case) => ...]`).
2. Убедиться, что перевод есть (иначе 500 на `/enum/{kebab-имя}`).
3. Проверить роут: `php artisan route:list | grep enum`.
4. Роут не писать руками — его создаёт пакет.

## 5. Проверка

```bash
php -l app/Enums/{Name}Enum.php
php -l lang/ru/enums.php
./vendor/bin/pint --test
```

Вручную: запросить сущность с этим полем — в ответе `{id, name}`, названия на русском,
без исключений перевода. И `php artisan tinker` → `{Name}Enum::list()` возвращает все кейсы
с переводами.

## Частые ошибки

- Новый case без перевода — падение Resource и `/enum/...`.
- Перевод добавлен, но с другим значением (опечатка в `value`) — «пустое» название.
- Enum-значения перечислены строкой в правилах и разошлись с кейсами.
- Enum выведен в Resource через `->value` — фронт теряет название.
- Значение enum переименовано без миграции данных — старые записи «не находятся».
- Enum-справочник добавлен в конфиг, но роут руками тоже написан — конфликт с пакетом.
