import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function containerMetrics(page: Page) {
    return page
        .locator('.container')
        .first()
        .evaluate((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return {
                width: rect.width,
                maxWidth: style.maxWidth,
                paddingLeft: style.paddingLeft,
                paddingRight: style.paddingRight,
                left: rect.left,
            };
        });
}

async function measureWith(page: Page, property: string): Promise<number> {
    return page.evaluate((customProperty) => {
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.width = `var(${customProperty})`;
        probe.style.height = '1px';
        document.body.append(probe);

        const width = probe.getBoundingClientRect().width;
        probe.remove();

        return width;
    }, property);
}

test('на 768–1199 px мобильный контейнер ограничен 520 px, фон на всю ширину', async ({ page }) => {
    for (const width of [768, 1024, 1199]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');

        const container = await containerMetrics(page);

        expect(container.width, `${width}px`).toBeLessThanOrEqual(520);
        expect(container.width, `${width}px`).toBeGreaterThan(480);
        expect(container.maxWidth, `${width}px`).toBe('520px');
        expect(container.paddingLeft, `${width}px`).toBe('16px');
        expect(container.paddingRight, `${width}px`).toBe('16px');

        const body = await page.locator('body').evaluate((element) => ({
            width: element.getBoundingClientRect().width,
            background: getComputedStyle(element).backgroundImage,
        }));

        expect(body.width, `${width}px`).toBe(width);
        expect(body.background, `${width}px`).toContain('linear-gradient');
    }
});

test('на 1200 px и шире десктопный контейнер ограничен 1440 px и центрирован', async ({ page }) => {
    for (const width of [1200, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');

        const container = await containerMetrics(page);
        const expectedPadLeft = Math.min(Math.max(32, 0.042 * width), 60);
        const expectedPadRight = Math.min(Math.max(32, 0.028 * width), 40);

        expect(container.maxWidth, `${width}px`).toBe('1440px');
        expect(container.width, `${width}px`).toBe(Math.min(width, 1440));
        expect(Number.parseFloat(container.paddingLeft), `${width}px`).toBeCloseTo(
            expectedPadLeft,
            1,
        );
        expect(Number.parseFloat(container.paddingRight), `${width}px`).toBeCloseTo(
            expectedPadRight,
            1,
        );

        if (width > 1440) {
            expect(container.left, `${width}px`).toBeCloseTo((width - 1440) / 2, 0);
        }
    }
});

test('зазор между колесом и правой колонкой задан формулой clamp(36px, 3.5vw, 50px)', async ({
    page,
}) => {
    for (const width of [768, 1200, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');

        const gap = await page.evaluate(() => {
            const probe = document.createElement('div');
            probe.className = 'desktop-grid';
            document.body.append(probe);

            const value = getComputedStyle(probe).columnGap;
            probe.remove();

            return Number.parseFloat(value);
        });

        expect(gap, `${width}px`).toBeCloseTo(Math.min(Math.max(36, 0.035 * width), 50), 1);
    }
});

test('формулы размеров совпадают со спекой на эталонных вьюпортах', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const wheel = await measureWith(page, '--wheel');
    const h1 = await measureWith(page, '--h1-size');
    const cardIcon = await measureWith(page, '--card-icon-size');

    expect(wheel).toBeCloseTo(Math.min(47 * 14.4, 900 - 170), 0);
    expect(h1).toBeCloseTo(44, 0);
    expect(cardIcon).toBeCloseTo(62, 0);

    await page.setViewportSize({ width: 1200, height: 640 });
    await page.goto('/');

    const lowWheel = await measureWith(page, '--wheel');
    const lowH1 = await measureWith(page, '--h1-size');
    const lowCardIcon = await measureWith(page, '--card-icon-size');

    expect(lowWheel).toBeCloseTo(480, 0);
    expect(lowH1).toBeCloseTo(36, 0);
    expect(lowCardIcon).toBeCloseTo(50, 0);
});

test('высота мобильной плитки и иконки заданы формулами', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const tile = await measureWith(page, '--tile');
    const tileIcon = await measureWith(page, '--tile-icon-size');

    expect(tile).toBeCloseTo(146, 0);
    expect(tileIcon).toBeCloseTo(tile * 0.42, 1);

    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');

    const shortTile = await measureWith(page, '--tile');

    expect(shortTile).toBeCloseTo(112, 0);
});

test('на ширине 320 px нет горизонтальной прокрутки', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth);
});

test('динамическая высота и safe-area учтены, reduced motion ограничивает движение', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const body = await page.locator('body').evaluate((element) => {
        const style = getComputedStyle(element);

        return {
            minHeight: Number.parseFloat(style.minHeight),
            height: window.innerHeight,
        };
    });

    expect(body.minHeight).toBeGreaterThanOrEqual(body.height);

    const css = await readFile('resources/css/layout.css', 'utf8');

    expect(css).toContain('100dvh');
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('env(safe-area-inset-left)');

    await page.emulateMedia({ reducedMotion: 'reduce' });

    const motion = await page.locator('body').evaluate((element) => {
        const style = getComputedStyle(element);

        return {
            property: style.transitionProperty,
            duration: style.transitionDuration,
            animation: style.animationName,
        };
    });

    expect(motion.property).toBe('opacity');
    expect(motion.duration).toBe('0.15s');
    expect(motion.animation).toBe('none');
});
