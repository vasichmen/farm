---
name: frontend-islands
description: Фронтенд lyk-farm — Blade отдаёт контент, Vue 3 (Options API) работает островами через единый entry-point app.ts, data-props, модули-сторы, токены из docs/handoff/04-tokens, шрифты, SVG-пайплайн, reduced-motion. Использовать при добавлении острова или Vue-компонента, при переносе макета в Blade, при подключении токенов и шрифтов и при разборе «блок не работает / не индексируется».
---

# Фронтенд: Blade + Vue-острова

Правила: `rules.md` §7, `AGENTS.md` §5.10. Эталон вёрстки — `docs/tz/TZ-lyk-farm.md` §5–§14
и токены `docs/handoff/04-tokens`. Ответы дизайнера перенесены в ТЗ, отдельных файлов нет.

## 1. Что рисует Blade, а что остров

| Блок | Кто рисует |
|---|---|
| Шапка, меню, подвал, ссылки | Blade |
| `h1`, лид, тексты сезонов | Blade |
| Сетка каталога, карточки, цены | Blade |
| FAQ | Blade + `<details>` |
| Переключатель сезонов | Blade-ссылки `?season=` |
| Колесо сезонов | остров |
| Модалка/шторка товара, карусель, меню-оверлей, тост FAB | остров |

Правило: если текст должен попасть в индекс или в превью мессенджера — Blade. Если блок
бесполезен без клика — остров.

## 2. Реестр островов

`resources/js/app.ts` — единственный entry-point:

```ts
import { createApp } from 'vue';
import SeasonWheel from './islands/SeasonWheel.vue';
import ProductModal from './islands/ProductModal.vue';

const registry: Record<string, Component> = {
    'season-wheel': SeasonWheel,
    'product-modal': ProductModal,
};

document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => {
    const name = el.dataset.island ?? '';
    const component = registry[name];
    if (!component) {
        console.warn(`[islands] неизвестный остров: ${name}`);
        return;
    }
    createApp(component, JSON.parse(el.dataset.props ?? '{}')).mount(el);
});
```

- Отдельный бандл на остров не создаём: он продублирует модули и разведёт состояние.
- Компонент острова — обычный `.vue` на Options API, он не знает, что он остров.
- Острова не вкладываем друг в друга.
- Ниже фолда — ленивая загрузка (`IntersectionObserver` + динамический `import()`).

## 3. Данные в остров

```blade
<div
    data-island="season-wheel"
    data-props='@json($wheelProps)'
></div>
```

- Данные приходят пропсами из HTML, а не запросом в `mounted()` — нет состояния загрузки,
  контент виден по исходнику страницы.
- `@json` с `JSON_HEX_APOS|JSON_HEX_QUOT`, если внутри строк есть кавычки; кавычки вокруг
  атрибута — одинарные, как в примере.
- Большой массив (>~30 КБ) — отдавать через `<script type="application/json">` и читать
  из него, а не раздувать атрибут.
- Типы пропсов описываются в `resources/js/types/`, ответы API проверяются zod.

## 4. Состояние

- Общее состояние (выбранный сезон, открытый товар, фильтр) — модуль-стор:
  `resources/js/stores/season.ts` на `reactive`, экспортируется синглтоном.
- Состояние в `window`, в `data-` атрибутах «на запись» и в глобальном `app.config.globalProperties`
  не держим.
- URL — источник истины для `season`, `cat`, `product`: открытие слоя — `pushState`,
  закрытие крестиком — `history.back()`, смена сезона — `replaceState`.

## 5. Стили, токены, шрифты

- Все цвета, отступы, радиусы, тени, z-index — из `docs/handoff/04-tokens/tokens.css`
  (`var(--z-modal)` и т.п.), не «на глаз».
- Брейкпоинт 1200 px: ниже — мобильная вёрстка в контейнере `max-width: 520px` по центру,
  фон сезона на всю ширину.
- Шрифты (Cormorant Garamond 500/600/700 + italic 500, Manrope 400/600/700/800) хостим сами:
  WOFF2, сабсеты cyrillic+latin, `font-display: swap`, fallback-метрики, лицензия OFL в репозиторий.
- Иконки: UI — спрайт 24×24 на `currentColor`, товарные — inline SVG.
- SVG из `docs/handoff/03-assets` чистим на сборке: SVGO с `removeMetadata` (C2PA), `removeDimensions`
  не включать без нужды.

## 6. Поведение и доступность

- `prefers-reduced-motion` — только opacity 150 ms: без сдвигов, поворотов и полёта иллюстрации.
- Фокус возвращается на карточку-источник; если её нет — на заголовок сезона с `tabindex="-1"`.
- При открытом слое скролл блокируется; открыт одновременно только один слой
  (z-index из токенов).
- Формат данных на фронте: цена «1 080 ₽» (неразрывный пробел), вес «5 кг», «2–4 кг»
  (запятая, короткое тире), склонения — `Intl.PluralRules('ru')`, даты и локальный месяц —
  по часовому поясу пользователя. Сервер отдаёт UTC и сырые значения.
- Без JS страница остаётся читаемой: ссылки работают, контент виден, слои просто не открываются.

## 7. Проверка

```bash
npm run lint
npx vue-tsc --noEmit
npm run build
npx playwright test        # когда настроен
```

Вручную: открыть страницу с отключённым JS (контент и ссылки на месте), 390 px и 1440 px,
`prefers-reduced-motion`, навигация с клавиатуры по колесу и модалке, «Назад» в браузере
закрывает слой.

## Частые ошибки

- SEO-контент внутри контейнера острова — `mount()` его затирает, поисковик не видит.
- Данные острова грузятся в `mounted()` — лишняя загрузка, мигание, дубль запроса.
- Второй entry-point или отдельный бандл на остров — состояние разъезжается.
- Composition API / `setup()` — в проекте только Options API.
- `vue-router` для переходов — возвращает SPA-проблемы с индексацией.
- Стили «своими» значениями вместо токенов — вёрстка расходится с эталоном.
- Забыт `min-height` контейнера — скачок layout (CLS).
- `data-props` собран без экранирования кавычек — остров падает на `JSON.parse`.
