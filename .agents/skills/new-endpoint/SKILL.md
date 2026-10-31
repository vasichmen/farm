---
name: new-endpoint
description: Чек-лист добавления нового роута в lyk-farm — страница в routes/web.php или JSON-эндпоинт в routes/api.php, контроллер, Request, DTO, сервис, репозиторий, Resource, презентер, Swagger, enum'ы, проверка через route:list. Использовать при создании нового метода API, новой страницы сайта, CRUD-операции или нового контроллера.
---

# Новый роут

Правила и запреты — `AGENTS.md` §4–5, `rules.md` §1–2. Здесь только порядок действий.
Для сущности с нуля — skill `new-entity`.

## 1. Определи тип роута

| Тип | Файл | Возвращает |
|---|---|---|
| Страница сайта | `routes/web.php` | `view(...)` с данными из сервиса |
| JSON API (свой) | `routes/api.php` | Resource в презентере |
| Справочник / enum | не пишется руками | генерирует `laravel-handbooks` |

Если это справочник — сразу skill `handbooks` и запись в `config/handbooks.php`.

## 2. Контракт

- Действие: `list`, `detail`, `create`, `update`, `delete` или составное (`set-active`).
- HTTP-метод: чтение — `GET`, изменение — `POST`, удаление — `DELETE`.
- Вход: для страниц — параметры роута и query; для API — id в query (`GET`) или body
  (`POST`/`DELETE`).
- Выход: Blade-шаблон или презентер (`DataResultPresenter` / `PaginatedDataPresenter`).
- Доступ: публично или `auth:api` (Passport), см. skill `access-control`.

## 3. Страница сайта

```php
// routes/web.php
use App\Http\Controllers\HomeController;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/about', [AboutController::class, 'index'])->name('about');
```

```php
// app/Http/Controllers/HomeController.php
class HomeController extends Controller
{
    public function index(): View
    {
        return view('pages.home', HomeService::getHomePage());
    }
}
```

- Контроллер не обращается к моделям и БД: только вызов сервиса и `view()`.
- Индексируемый контент (шапка, `h1`, тексты сезонов, сетка каталога, цены) рисует Blade.
- Интерактив подключается островом: `<div data-island="season-wheel" data-props='@json($props)'></div>`.
- Метатеги, OG, canonical, JSON-LD — в Blade-партиале, не в JS.
- Заглушки разделов (`/about`, `/preorder`, `/how-to-order`, `/contacts`) — один общий шаблон
  с заголовком, текстом и кнопкой «Назад».
- Острова, токены и шрифты — skill `frontend-islands`.

## 4. JSON-эндпоинт

```php
// routes/api.php
Route::prefix('{entity}')->group(function () {
    Route::get('list', [{Entity}Controller::class, 'list']);
    Route::get('detail', [{Entity}Controller::class, 'detail']);
    Route::post('create', [{Entity}Controller::class, 'create']);
    Route::post('update', [{Entity}Controller::class, 'update']);
    Route::delete('delete', [{Entity}Controller::class, 'delete']);
});
```

- Префикс — kebab-case имя сущности.
- Закрытая группа — `->middleware('auth:api')` на группу, не на каждый роут.
- Имена действий не заменять на `get`/`set`/`save`/`remove`.
- Для своих эндпоинтов path-параметров нет: `GET` — id и фильтры в query, `POST`/`DELETE` —
  id в теле. Path допустим только в web-роутах страниц и в контракте пакета справочников.

## 5. Request и DTO

- Стандартные случаи — пакетные `GetListRequest` / `GetEntityRequest`.
- Иначе — `app/Http/Requests/{Entity}/{Action}{Entity}Request.php` с правилами,
  `messages()`, `attributes()`, `protected ?string $dtoClassName`.
- Update наследуется от Create.
- Детали — skill `request-dto`.

## 6. Сервис и репозиторий

- Статический метод в `app/Services/{Entity}Service.php`, первым параметром DTO.
- Проверка доступа — до чтения/мутации.
- Бизнес-логика и транзакции — здесь.
- Выборки — методами `{Entity}Repository`; мутации — только через репозиторий.

## 7. Resource и презентер

Если ответ отдаёт новые поля/связи — дополнить `{Entity}Resource` (`getFields`, `getRelation`,
`getEnum`, `getDate`). Детали — skill `resource-presenter`.

## 8. Документация API

`darkaonline/l5-swagger` в проекте пока не подключён — отдельного требования документировать
API в MVP нет. Пока OA-аннотации не пишутся.

Если пакет подключат отдельной задачей, правила будут такие:

- `path` — без префикса API (`/{entity}/detail`);
- `GET` — `#[OA\Parameter]` на каждый query-параметр;
- `POST` — тело через `#[OA\Schema]` в Request-классе, в контроллере только `ref`;
- `responses` и `tags` — в контроллере;
- после правки — `php artisan l5-swagger:generate`.

Не добавлять `#[OA\...]` «на будущее», пока пакета нет: это мёртвый код без эффекта.

## 9. Enum'ы

Новые enum-поля → enum + перевод в `lang/ru/enums.php` (skill `enums-and-translations`).

## 10. Проверка

```bash
php -l routes/web.php app/Http/Controllers/HomeController.php
php artisan route:list
```

`route:list` показывает полный URI и middleware — убедиться, что путь не дублирует
существующий и попал в нужную группу. Плюс чек-лист `definition-of-done`.

## Частые ошибки

- JSON-роут добавлен в `routes/web.php` (или наоборот) — не то middleware и не тот ответ.
- Path-параметр `{id}` в собственном API-роуте вместо query/body.
- Роут не подключён или добавлен не в тот блок — нет нужной авторизации.
- `path` в Swagger с префиксом API или не совпадает с фактическим URI.
- Забыты `responses` или `#[OA\Parameter]` для GET.
- Роут для справочника написан руками вместо записи в `config/handbooks.php`.
- Проверка прав в контроллере вместо middleware/Policy.
- Валидация в контроллере «потому что правило простое».
- Возврат пагинатора без `PaginatedDataPresenter`.
- SEO-контент отдан только островом — поисковик и мессенджеры его не видят.
