/**
 * Поведение страницы при смене сезона: выход колонки в старом документе
 * и вход в новом. Модуль не рендерит контент и не меняет серверную разметку,
 * кроме временного атрибута `data-leaving` на колонке.
 */

export const CATALOG_TRANSITION_KEY = 'catalog-column:transition';
export const SEASON_VISITED_KEY = 'season-wheel:visited';

let navigating = false;
let safetyTimer: number | null = null;

function catalogColumn(): HTMLElement | null {
    return document.getElementById('catalog-column');
}

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Переход на сезон: помечает колонку уходящей и сразу начинает навигацию,
 * не дожидаясь анимации. Выход успевает проиграться, пока браузер ждёт новый документ.
 */
export function navigateToSeason(url: string): void {
    if (navigating) {
        return;
    }

    navigating = true;

    try {
        window.sessionStorage.setItem(CATALOG_TRANSITION_KEY, '1');
    } catch {
        // Приватный режим может запрещать sessionStorage — навигация всё равно работает.
    }

    if (!prefersReducedMotion()) {
        catalogColumn()?.setAttribute('data-leaving', '');
    }

    // Страховка: если переход отменён браузером, колонка не остаётся погашенной,
    // а следующий клик по сезону снова работает.
    if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
    }

    safetyTimer = window.setTimeout(() => {
        navigating = false;
        safetyTimer = null;
        catalogColumn()?.removeAttribute('data-leaving');
    }, 5000);

    window.requestAnimationFrame(() => {
        window.location.assign(url);
    });
}

/** Возврат из bfcache: убираем следы ухода и разрешаем следующий переход. */
function onPageShow(event: PageTransitionEvent): void {
    navigating = false;

    if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
        safetyTimer = null;
    }

    if (event.persisted) {
        catalogColumn()?.removeAttribute('data-leaving');
    }
}

/**
 * Делегированный обработчик сезонных ссылок вне островов (CTA пустого сезона,
 * будущие ссылки мобильной ленты). Модифицированные клики и средняя кнопка
 * не перехватываются.
 */
function onClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0) {
        return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    const link = target.closest<HTMLAnchorElement>('a[data-season-link]');

    if (link === null) {
        return;
    }

    event.preventDefault();
    navigateToSeason(link.href);
}

export function initSeasonNavigation(): void {
    document.addEventListener('click', onClick);
    window.addEventListener('pageshow', onPageShow);
}
