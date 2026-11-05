import { expect, test, type Page } from '@playwright/test';

const HOME = '/?season=autumn';
const PANEL = '[data-site-menu-panel]';
const TRIGGER = '[data-site-menu-trigger]';
const OVERLAY = '[data-site-menu-overlay]';

async function prepare(page: Page, url: string = HOME): Promise<void> {
    await page.addInitScript(() => {
        window.sessionStorage.setItem('season-wheel:visited', '1');
    });
    await page.goto(url);
}

async function openMenu(page: Page): Promise<void> {
    await page.locator(TRIGGER).click();
    await expect(page.getByRole('dialog', { name: 'Меню сайта' })).toBeVisible();
    await expect(page.locator(PANEL)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
});

test('кнопка открывает и закрывает меню, отражая состояние', async ({ page }) => {
    await prepare(page);

    const trigger = page.locator(TRIGGER);
    const panel = page.locator(PANEL);

    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAccessibleName('Открыть меню');
    await expect(panel).not.toBeVisible();

    await trigger.click();

    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAccessibleName('Закрыть меню');
    await expect(panel).toBeVisible();

    const dialog = page.getByRole('dialog', { name: 'Меню сайта' });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await trigger.click();

    await expect(panel).not.toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAccessibleName('Открыть меню');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('меню закрывается кликом по затемнению и клавишей Escape', async ({ page }) => {
    await prepare(page);

    const trigger = page.locator(TRIGGER);

    await openMenu(page);
    await page.locator(OVERLAY).click({ position: { x: 1000, y: 400 } });
    await expect(page.locator(PANEL)).not.toBeVisible();
    await expect(trigger).toBeFocused();

    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(PANEL)).not.toBeVisible();
    await expect(trigger).toBeFocused();
});

test('меню удерживает фокус и делает фон инертным', async ({ page }) => {
    await prepare(page);
    await openMenu(page);

    const trigger = page.locator(TRIGGER);

    await expect(page.locator('main.site-main')).toHaveAttribute('inert');
    await expect(page.locator('nav.site-nav')).toHaveAttribute('inert');
    await expect(page.locator('.site-header__logo')).toHaveAttribute('inert');

    await expect(trigger).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-site-menu-item="about"]')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-site-menu-email]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();

    const activeTag = await page.evaluate(() => {
        document.querySelector<HTMLElement>('nav.site-nav a')?.focus();

        return document.activeElement?.getAttribute('data-site-menu-trigger') !== null;
    });

    expect(activeTag).toBe(true);
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(page.locator('main.site-main')).not.toHaveAttribute('inert');
    await expect(page.locator('nav.site-nav')).not.toHaveAttribute('inert');
    await expect(page.locator('.site-header__logo')).not.toHaveAttribute('inert');
    await expect(page.locator('html')).not.toHaveClass(/site-menu-open/);
    await expect(trigger).toBeFocused();
});

test('открытое меню блокирует прокрутку страницы', async ({ page }) => {
    await prepare(page);
    await openMenu(page);

    await expect(page.locator('html')).toHaveClass(/site-menu-open/);

    const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(overflow).toBe('hidden');

    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    const scrollAfter = await page.evaluate(() => window.scrollY);

    expect(scrollAfter).toBe(scrollBefore);

    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/site-menu-open/);
});

test('активный пункт меню отмечен точкой Honey', async ({ page }) => {
    await prepare(page, '/preorder');
    await openMenu(page);

    const active = page.locator('[data-site-menu-item="preorder"]');
    const inactive = page.locator('[data-site-menu-item="about"]');

    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(inactive).not.toHaveAttribute('aria-current');

    const dot = await active.evaluate((element) => {
        return getComputedStyle(element, '::before').backgroundColor;
    });
    const noDot = await inactive.evaluate((element) => {
        return getComputedStyle(element, '::before').content;
    });

    expect(dot).toBe('rgb(217, 178, 111)');
    expect(noDot).toBe('none');
});

test('футер показывает контакты, соцсети неактивны', async ({ page }) => {
    await prepare(page);
    await openMenu(page);

    await expect(page.locator('[data-site-menu-address]')).toHaveText(
        'Московская область, деревня Лыково',
    );
    await expect(page.locator('[data-site-menu-phone]')).toHaveText('+7 900 000-00-00');
    await expect(page.locator('[data-site-menu-phone]')).toHaveAttribute(
        'href',
        'tel:+79000000000',
    );
    await expect(page.locator('[data-site-menu-email]')).toHaveText('hello@lykovo.example');
    await expect(page.locator('[data-site-menu-email]')).toHaveAttribute(
        'href',
        'mailto:hello@lykovo.example',
    );

    const telegram = page.locator('[data-site-menu-social="telegram"]');
    const vk = page.locator('[data-site-menu-social="vk"]');

    await expect(telegram).toHaveAttribute('aria-disabled', 'true');
    await expect(vk).toHaveAttribute('aria-disabled', 'true');
    await expect(telegram).toHaveAttribute('tabindex', '-1');

    const url = page.url();

    await telegram.click({ force: true });
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('dialog', { name: 'Меню сайта' })).toBeVisible();

    await vk.click({ force: true });
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('dialog', { name: 'Меню сайта' })).toBeVisible();
});

test('на телефоне меню закрывается свайпом влево', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page);
    await openMenu(page);

    const panel = page.locator(PANEL);
    const trigger = page.locator(TRIGGER);

    await panel.dispatchEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 360,
        clientY: 500,
    });
    await panel.dispatchEvent('pointermove', {
        pointerType: 'touch',
        clientX: 280,
        clientY: 502,
    });
    await panel.dispatchEvent('pointerup', {
        pointerType: 'touch',
        clientX: 280,
        clientY: 502,
    });

    await expect(panel).not.toBeVisible();
    await expect(trigger).toBeFocused();
});

test('кнопка меню имеет размеры 56 px на десктопе и 44 px на телефоне', async ({ page }) => {
    await prepare(page);

    const desktop = await page.locator(TRIGGER).boundingBox();

    expect(desktop).not.toBeNull();
    expect(Math.round(desktop?.width ?? 0)).toBe(56);
    expect(Math.round(desktop?.height ?? 0)).toBe(56);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME);

    const mobile = await page.locator(TRIGGER).boundingBox();

    expect(mobile).not.toBeNull();
    expect(Math.round(mobile?.width ?? 0)).toBe(44);
    expect(Math.round(mobile?.height ?? 0)).toBe(44);
});

test('меню адаптируется: панель 430 px на десктопе и полный экран на телефоне', async ({
    page,
}) => {
    await prepare(page);
    await openMenu(page);

    const desktopPanel = await page.locator(PANEL).boundingBox();

    expect(Math.round(desktopPanel?.width ?? 0)).toBe(430);
    await expect(page.locator(OVERLAY)).toHaveCSS('opacity', '1');

    let horizontal = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontal).toBeLessThanOrEqual(0);

    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME);
    await openMenu(page);

    const mobilePanel = await page.locator(PANEL).boundingBox();
    const panelBackground = await page
        .locator(PANEL)
        .evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(Math.round(mobilePanel?.width ?? 0)).toBe(390);
    expect(panelBackground).toBe('rgb(47, 74, 58)');
    await expect(page.locator(OVERLAY)).toHaveCSS('opacity', '0');

    horizontal = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontal).toBeLessThanOrEqual(0);
});

test('открытие и закрытие меню используют заданные длительности', async ({ page }) => {
    await prepare(page);

    const trigger = page.locator(TRIGGER);
    const panel = page.locator(PANEL);

    await trigger.click();
    await expect(panel).toBeVisible();

    const opening = await panel.evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(opening).toContain('0.4s');

    const delays = await page
        .locator('.site-menu__item')
        .evaluateAll((items) =>
            items.map((item) => getComputedStyle(item).transitionDelay.split(',')[0]?.trim()),
        );
    expect(delays).toEqual(['0s', '0.05s', '0.1s', '0.15s', '0.2s']);

    const iconDuration = await page
        .locator('.site-menu__burger span')
        .nth(1)
        .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(iconDuration).toContain('0.25s');

    await trigger.click();

    const closing = await panel.evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(closing).toContain('0.25s');
});

test('уменьшенное движение оставляет только прозрачность 150 ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepare(page);
    await openMenu(page);

    const panelStyles = await page.locator(PANEL).evaluate((element) => {
        const style = getComputedStyle(element);

        return {
            property: style.transitionProperty,
            duration: style.transitionDuration,
            transform: style.transform,
        };
    });

    expect(panelStyles.property).toBe('opacity');
    expect(panelStyles.duration).toBe('0.15s');
    expect(panelStyles.transform).toBe('none');

    const itemTransform = await page
        .locator('.site-menu__item')
        .first()
        .evaluate((element) => getComputedStyle(element).transform);

    expect(itemTransform).toBe('none');
});

test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('ссылки шапки и меню присутствуют в HTML и ведут на существующие страницы', async ({
        page,
        request,
    }) => {
        const response = await page.goto(HOME);

        expect(response?.status()).toBe(200);

        await expect(page.locator('header.site-header .site-nav a')).toHaveCount(3);

        const menuLinks = page.locator('#site-menu-fallback a');

        await expect(menuLinks).toHaveCount(5);

        const hrefs = await menuLinks.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute('href')),
        );

        for (const href of hrefs) {
            expect(href).not.toBeNull();

            const direct = await request.get(href as string);
            expect(direct.status(), href as string).toBe(200);
        }
    });

    test('прямой адрес раздела открывается без JavaScript', async ({ page }) => {
        const response = await page.goto('/contacts');

        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Контакты');
    });
});
