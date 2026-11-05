/**
 * Общие помощники модальных слоёв: фокус, блокировка прокрутки, inert
 * и чтение длительностей из дизайн-токенов.
 *
 * Модуль не знает о конкретных слоях: классы блокировки и селекторы фона
 * передаются снаружи, поэтому им пользуются и окно товара, и меню сайта.
 */

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ScrollLock {
    lock: () => void;
    unlock: () => void;
}

function isAvailable(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        element.tabIndex >= 0 &&
        element.getAttribute('aria-disabled') !== 'true' &&
        !element.hasAttribute('inert') &&
        !element.closest('[inert]')
    );
}

export function focusableElements(root: ParentNode | null): HTMLElement[] {
    if (root === null) {
        return [];
    }

    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isAvailable);
}

/**
 * Удерживает Tab и Shift+Tab внутри root. Если фокус уже вне слоя,
 * возвращает его на первый или последний доступный элемент.
 */
export function trapFocus(root: ParentNode | null, event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
        return;
    }

    const focusable = focusableElements(root);

    if (focusable.length === 0) {
        event.preventDefault();

        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first === undefined || last === undefined) {
        return;
    }

    const active = document.activeElement;
    const inside = active instanceof Node && root !== null && root.contains(active);

    if (event.shiftKey) {
        if (active === first || !inside) {
            event.preventDefault();
            last.focus();
        }

        return;
    }

    if (active === last || !inside) {
        event.preventDefault();
        first.focus();
    }
}

/**
 * Блокирует прокрутку страницы и компенсирует ширину скроллбара,
 * чтобы контент не дёргался. Класс блокировки — параметр.
 */
export function createScrollLock(className: string): ScrollLock {
    let locked = false;
    let savedPaddingRight = '';

    return {
        lock(): void {
            if (locked) {
                return;
            }

            const html = document.documentElement;
            const scrollbarWidth = window.innerWidth - html.clientWidth;

            savedPaddingRight = html.style.paddingRight;

            if (scrollbarWidth > 0) {
                html.style.paddingRight = `${scrollbarWidth}px`;
            }

            html.classList.add(className);
            locked = true;
        },
        unlock(): void {
            if (!locked) {
                return;
            }

            const html = document.documentElement;

            html.classList.remove(className);
            html.style.paddingRight = savedPaddingRight;
            locked = false;
        },
    };
}

export function setInert(selectors: readonly string[]): HTMLElement[] {
    const elements: HTMLElement[] = [];

    selectors.forEach((selector) => {
        document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
            element.setAttribute('inert', '');
            elements.push(element);
        });
    });

    return elements;
}

export function clearInert(elements: HTMLElement[]): void {
    elements.forEach((element) => element.removeAttribute('inert'));
}

export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function cssDuration(name: string, fallback: number): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    if (raw.endsWith('ms')) {
        const value = Number.parseFloat(raw);

        return Number.isFinite(value) ? value : fallback;
    }

    if (raw.endsWith('s')) {
        const value = Number.parseFloat(raw);

        return Number.isFinite(value) ? value * 1000 : fallback;
    }

    return fallback;
}

export function cssEasing(name: string, fallback: string): string {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    return raw === '' ? fallback : raw;
}
