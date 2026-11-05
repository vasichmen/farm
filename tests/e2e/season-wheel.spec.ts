import { expect, test, type Page } from '@playwright/test';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'];

async function openWheel(page: Page, url = '/?season=autumn'): Promise<void> {
    await page.goto(url);
    await expect(page.locator('[data-season-wheel] [role="tablist"]')).toBeVisible();
}

async function rotation(page: Page): Promise<number> {
    const value = await page.locator('[data-season-wheel] svg').getAttribute('data-rotation');

    return Number.parseFloat(value ?? '0');
}

async function expectRotation(page: Page, expected: number): Promise<void> {
    await expect
        .poll(async () => (((await rotation(page)) % 360) + 360) % 360, { timeout: 5000 })
        .toBeCloseTo(((expected % 360) + 360) % 360, 0);
}

async function wheelCenter(page: Page): Promise<{ x: number; y: number }> {
    const box = await page.locator('[data-season-wheel] svg').boundingBox();

    if (box === null) {
        throw new Error('Колесо не найдено на странице.');
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('состав колеса', () => {
    test('колесо показывает четыре сезона, кольцо месяцев и центр', async ({ page }) => {
        await openWheel(page);

        await expect(page.getByRole('tab')).toHaveCount(4);
        await expect(page.locator('[data-wheel-season]')).toHaveCount(4);
        await expect(page.locator('[data-month]')).toHaveCount(12);
        await expect(page.locator('[data-tick]')).toHaveCount(12);
        const center = page.locator('.season-wheel__center');

        await expect(center).toContainText('Колесо года');
        await expect(page.locator('[data-wheel-year]')).toContainText('ЛЫКОВО');
        await expect(page.locator('[data-wheel-year]')).toContainText(
            String(new Date().getFullYear()),
        );
        await expect(center.locator('image')).toHaveAttribute('href', /logo-lockup-on-dark/);
    });

    test('активный сезон стоит справа, порядок сезонов задан константой', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await expectRotation(page, 0);

        const labels = await page
            .locator('[data-season-label]')
            .evaluateAll((elements) =>
                elements.map((element) => element.getAttribute('data-season-label')),
            );

        expect(labels).toEqual(['summer', 'autumn', 'winter', 'spring']);

        const autumn = await page.locator('[data-season-label="autumn"]').boundingBox();
        const center = await wheelCenter(page);

        expect(autumn).not.toBeNull();
        expect((autumn as { x: number }).x).toBeGreaterThan(center.x);
    });

    test('подписи месяцев и сезонов остаются прямыми', async ({ page }) => {
        await openWheel(page, '/?season=winter');

        await expectRotation(page, -90);

        const seasonLabel = page.locator('[data-season-label="winter"]');
        const transform = await seasonLabel.getAttribute('transform');
        const current = await rotation(page);

        expect(transform).toContain('rotate(');

        const counter = Number.parseFloat(
            (transform ?? '').replace('rotate(', '').trim().split(' ')[0] ?? '0',
        );

        expect(counter).toBeCloseTo(-current, 0);

        const months = await page.locator('[data-month]').evaluateAll((elements) =>
            elements.map((element) => ({
                month: element.getAttribute('data-month'),
                transform: element.getAttribute('transform') ?? '',
            })),
        );

        expect(months).toHaveLength(12);

        for (const item of months) {
            expect(item.transform, item.month).toContain('rotate(');
        }
    });

    test('текущий месяц отмечен подписью и точкой', async ({ page }) => {
        await page.addInitScript(() => {
            const fixed = new Date('2026-10-15T12:00:00Z').getTime();
            const OriginalDate = Date;

            class FixedDate extends OriginalDate {
                constructor(...args: ConstructorParameters<typeof Date>) {
                    if (args.length === 0) {
                        super(fixed);
                    } else {
                        super(...args);
                    }
                }

                static now(): number {
                    return fixed;
                }
            }

            Object.defineProperty(window, 'Date', { value: FixedDate, configurable: true });
        });

        await openWheel(page);

        await expect(page.locator('[data-current-month="true"]')).toHaveAttribute(
            'data-month',
            'окт',
        );
        await expect(page.locator('.season-wheel__month-dot')).toHaveCount(1);
    });

    test('активный сектор показывает до четырёх иконок, неактивный — до трёх', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await expect(page.locator('[data-season-icons="autumn"] [data-product-icon]')).toHaveCount(
            4,
        );

        for (const slug of ['summer', 'winter', 'spring']) {
            await expect(
                page.locator(`[data-season-icons="${slug}"] [data-product-icon]`),
            ).toHaveCount(3);
        }

        await expect(page.locator('[data-product-icon]').first()).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    test('пустой сезон показывает «ПОКА ПУСТО» без иконок', async ({ page }) => {
        await page.route('**/*', async (route) => {
            if (route.request().resourceType() !== 'document') {
                await route.continue();

                return;
            }

            const response = await route.fetch();
            const body = await response.text();

            const props = {
                active_season: 'autumn',
                seasons: SEASONS.map((slug) => ({
                    slug,
                    name: { summer: 'Лето', autumn: 'Осень', winter: 'Зима', spring: 'Весна' }[
                        slug
                    ],
                    sub: { summer: 'ЯГОДЫ', autumn: 'УРОЖАЙ', winter: 'ЗАПАСЫ', spring: 'ЗЕЛЕНЬ' }[
                        slug
                    ],
                    url: `/?season=${slug}`,
                    products_count: slug === 'winter' ? 0 : 8,
                    products:
                        slug === 'winter' ? [] : [{ name: 'Товар', icon: 'product-apples.svg' }],
                })),
            };

            const markup = `<div data-island="season-wheel" data-props='${JSON.stringify(props)}'></div>`;

            await route.fulfill({
                response,
                body: body.replace('</main>', `${markup}</main>`),
            });
        });

        await page.goto('/?season=autumn');

        const emptySector = page
            .locator('[data-island="season-wheel"]')
            .last()
            .locator('[data-wheel-season="winter"]');

        await expect(emptySector).toContainText('ПОКА ПУСТО');
        await expect(emptySector.locator('[data-product-icon]')).toHaveCount(0);
    });
});

test.describe('выбор сезона', () => {
    test('клик по сектору открывает страницу сезона и возвращает фокус', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await page.locator('[data-season-label="winter"]').click();

        await page.waitForURL('**/?season=winter');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'winter');
        await expect(page.getByRole('tab', { selected: true })).toHaveAttribute(
            'aria-label',
            /Зима/,
        );

        const focused = await page.evaluate(() =>
            document.activeElement?.getAttribute('aria-label'),
        );

        expect(focused).toContain('Зима');
        await expectRotation(page, -90);
    });

    test('клик по активному сектору не запускает навигацию', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await page.locator('[data-season-label="autumn"]').click();
        await page.waitForTimeout(400);

        expect(page.url()).toContain('season=autumn');
    });

    test('модифицированный клик не перехватывается', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await page.locator('[data-season-label="winter"]').click({ modifiers: ['Control'] });
        await page.waitForTimeout(500);

        expect(page.url()).toContain('season=autumn');
    });

    test('анимация входа проигрывается один раз за сессию', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await page.waitForTimeout(900);
        expect(await rotation(page)).toBeCloseTo(0, 0);

        await page.goto('/?season=autumn');
        await expect(page.locator('[data-season-wheel] [role="tablist"]')).toBeVisible();

        await expectRotation(page, 0);
        const visited = await page.evaluate(() =>
            window.sessionStorage.getItem('season-wheel:visited'),
        );

        expect(visited).toBe('1');
    });

    test('клавиатура: стрелки, Home и End выбирают сезон по кругу', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForURL('**/?season=winter');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'winter');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('ArrowLeft');
        await page.waitForURL('**/?season=autumn');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'autumn');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('End');
        await page.waitForURL('**/?season=spring');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'spring');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForURL('**/?season=summer');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'summer');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('Home');
        await page.waitForURL('**/?season=summer');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'summer');
    });

    test('переход через границу не делает лишний оборот', async ({ page }) => {
        await openWheel(page, '/?season=spring');

        await page.getByRole('tab', { selected: true }).focus();
        await page.keyboard.press('ArrowRight');
        await page.waitForURL('**/?season=summer');

        await expectRotation(page, 90);

        const value = await rotation(page);
        const normalized = ((value % 360) + 360) % 360;

        expect(normalized).toBeCloseTo(90, 0);
        expect(Math.abs(value)).toBeLessThanOrEqual(270);
    });

    test('при уменьшенном движении колесо меняет положение мгновенно', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openWheel(page, '/?season=autumn');

        await page.locator('[data-season-label="winter"]').click();
        await page.waitForURL('**/?season=winter');
        await expect(page.locator('[data-season-wheel] [role="tablist"]')).toBeVisible();

        await expectRotation(page, -90);
    });
});

test.describe('перетаскивание', () => {
    test('колесо следует за указателем и возвращается к активному сезону', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        const center = await wheelCenter(page);
        const start = { x: center.x, y: center.y - 200 };

        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 40, start.y + 20, { steps: 5 });

        const dragged = await rotation(page);

        expect(Math.abs(dragged)).toBeGreaterThan(1);

        await page.mouse.up();
        await page.waitForTimeout(900);

        expect(page.url()).toContain('season=autumn');
        await expectRotation(page, 0);
    });

    test('перетаскивание больше порога не запускает клик по сектору', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        const center = await wheelCenter(page);
        const start = { x: center.x, y: center.y - 200 };

        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 60, start.y + 40, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(900);

        expect(page.url()).toContain('season=autumn');
    });
});

test.describe('наведение и подсказка', () => {
    test('подсказка появляется через задержку и исчезает', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        const icon = page.locator('[data-product-icon="winter-1"]');

        await icon.hover();
        await expect(page.locator('[data-tooltip]')).toHaveCount(0);

        await expect(page.locator('[data-tooltip]')).toHaveText('Варенье малиновое', {
            timeout: 2000,
        });

        const opacity = await page
            .locator('[data-season-icons="winter"]')
            .evaluate((element) => getComputedStyle(element).opacity);

        expect(Number.parseFloat(opacity)).toBeCloseTo(0.9, 1);

        await page.mouse.move(10, 10);
        await expect(page.locator('[data-tooltip]')).toHaveCount(0);
    });

    test('на сенсорном экране подсказки нет, тап выбирает сектор', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            hasTouch: true,
        });
        const page = await context.newPage();

        await openWheel(page, '/?season=autumn');

        const icon = page.locator('[data-product-icon="winter-1"]');
        const box = await icon.boundingBox();

        expect(box).not.toBeNull();

        await page.touchscreen.tap(
            (box as { x: number }).x + (box as { width: number }).width / 2,
            (box as { y: number }).y + (box as { height: number }).height / 2,
        );

        await page.waitForURL('**/?season=winter');
        await expect(page.locator('[data-tooltip]')).toHaveCount(0);

        await context.close();
    });
});

test.describe('доступность', () => {
    test('сектора образуют группу вкладок с доступными именами', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await expect(page.getByRole('tablist', { name: 'Сезоны' })).toHaveCount(1);
        await expect(page.getByRole('tab')).toHaveCount(4);
        await expect(page.getByRole('tab', { selected: true })).toHaveAttribute(
            'aria-label',
            /Осень: .*Антоновка/,
        );

        const tabs = await page
            .getByRole('tab')
            .evaluateAll((elements) =>
                elements.map((element) => element.getAttribute('aria-label') ?? ''),
            );

        expect(tabs.join(' ')).toContain('Зима:');
    });

    test('в порядок фокуса входят только сектора', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        const tabindexes = await page
            .locator('[data-season-wheel] [role="tab"]')
            .evaluateAll((elements) => elements.map((element) => element.getAttribute('tabindex')));

        expect(tabindexes.filter((value) => value === '0')).toHaveLength(1);
        expect(tabindexes.filter((value) => value === '-1')).toHaveLength(3);
        await expect(page.locator('[data-product-icon]').first()).not.toHaveAttribute('tabindex');
    });

    test('live-регион объявляет сезон и число продуктов', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        await expect(page.locator('[data-live]')).toHaveAttribute('aria-live', 'polite');
        await expect(page.locator('[data-live]')).toHaveText('Осень, 9 продуктов');

        await page.locator('[data-season-label="spring"]').click();
        await page.waitForURL('**/?season=spring');
        await expect(page.locator('[data-live]')).toHaveText('Весна, 8 продуктов');
    });

    test('фокус на секторе виден', async ({ page }) => {
        await openWheel(page, '/?season=autumn');

        const activeTab = page.getByRole('tab', { selected: true });

        await activeTab.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');

        await expect(activeTab).toBeFocused();

        await expect
            .poll(
                async () =>
                    Number.parseFloat(
                        await page
                            .locator(
                                '.season-wheel__season[data-wheel-season="autumn"] .season-wheel__focus-ring',
                            )
                            .evaluate((element) => getComputedStyle(element).opacity),
                    ),
                { timeout: 3000 },
            )
            .toBeGreaterThan(0);
    });
});

test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('подписи секторов читаемы, ссылки на сезоны работают', async ({ page }) => {
        await page.goto('/?season=autumn');

        const fallback = page.locator('.season-wheel__fallback');

        await expect(fallback).toBeVisible();
        await expect(fallback.locator('a')).toHaveCount(4);
        await expect(fallback).toContainText('Лето');
        await expect(fallback).toContainText('Осень');
        await expect(fallback).toContainText('Зима');
        await expect(fallback).toContainText('Весна');
        await expect(fallback).toContainText('УРОЖАЙ');

        await fallback.getByRole('link', { name: /Зима/ }).click();
        await page.waitForURL('**/?season=winter');
        await expect(page.locator('body')).toHaveAttribute('data-season', 'winter');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
            'Зимой в Лыково заваривают травы и открывают варенье',
        );
    });
});
