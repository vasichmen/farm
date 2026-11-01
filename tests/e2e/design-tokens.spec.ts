import { expect, test, type Page } from '@playwright/test';

async function readToken(page: Page, name: string): Promise<string> {
    return page.evaluate(
        (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
        name,
    );
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

async function backgroundFor(page: Page, season: string): Promise<string> {
    return page.evaluate((value) => {
        document.body.dataset.season = value;

        return getComputedStyle(document.body).backgroundImage;
    }, season);
}

test('ключевые токены v1.2 доступны всем стилям страницы', async ({ page }) => {
    await page.goto('/');

    await expect(readToken(page, '--color-deep-pine')).resolves.toBe('#22352A');
    await expect(readToken(page, '--color-forest')).resolves.toBe('#2F4A3A');
    await expect(readToken(page, '--color-honey')).resolves.toBe('#D9B26F');
    await expect(readToken(page, '--color-parchment')).resolves.toBe('#F3EBDB');

    await expect(readToken(page, '--wheel-icon-ratio')).resolves.toBe('0.76');
    await expect(readToken(page, '--wheel-icon-hover-scale')).resolves.toBe('1.1');
    await expect(readToken(page, '--opacity-inactive-sector-icons')).resolves.toBe('0.7');
    await expect(readToken(page, '--opacity-inactive-sector-icons-hover')).resolves.toBe('0.9');
    await expect(readToken(page, '--opacity-active-sector-icons')).resolves.toBe('1');

    await expect(readToken(page, '--radius-panel')).resolves.toBe('12px');
    await expect(readToken(page, '--radius-button')).resolves.toBe('4px');
    await expect(readToken(page, '--shadow-fab')).resolves.toBe(
        '0px 10px 24px 0px rgba(0,0,0,0.35)',
    );
    await expect(readToken(page, '--z-tooltip')).resolves.toBe('50');
    await expect(readToken(page, '--z-menu')).resolves.toBe('40');
    await expect(readToken(page, '--dur-fast')).resolves.toBe('150ms');
    await expect(readToken(page, '--dur-wheel')).resolves.toBe('700ms');

    const wheel = await measureWith(page, '--wheel');
    const activeDisc = await measureWith(page, '--wheel-disc-active');
    const inactiveDisc = await measureWith(page, '--wheel-disc-inactive');

    expect(wheel).toBeGreaterThanOrEqual(480);
    expect(wheel).toBeLessThanOrEqual(680);
    expect(activeDisc).toBeCloseTo((wheel * 50) / 700, 1);
    expect(inactiveDisc).toBeCloseTo((wheel * 40) / 700, 1);
});

test('четыре сезона задают разные вертикальные градиенты', async ({ page }) => {
    await page.goto('/');

    const autumn = await backgroundFor(page, 'autumn');
    const winter = await backgroundFor(page, 'winter');
    const spring = await backgroundFor(page, 'spring');
    const summer = await backgroundFor(page, 'summer');

    expect(autumn).toMatch(/linear-gradient\(/);
    expect(autumn).toContain('rgb(47, 74, 58)');
    expect(autumn).toContain('rgb(34, 53, 42)');

    expect(winter).toContain('rgb(43, 62, 68)');
    expect(winter).toContain('rgb(31, 46, 51)');

    expect(spring).toContain('rgb(58, 90, 71)');
    expect(spring).toContain('rgb(47, 74, 58)');

    expect(summer).toContain('rgb(68, 88, 58)');
    expect(summer).toContain('rgb(45, 62, 42)');

    expect(new Set([autumn, winter, spring, summer]).size).toBe(4);
});

test('фокус-индикатор различим на тёмном и светлом фоне', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="on-dark"><button id="focus-on-dark" type="button">Тёмный</button></div>
            <div class="on-light"><button id="focus-on-light" type="button">Светлый</button></div>
        `;
        document.body.prepend(wrapper);
    });

    await page.keyboard.press('Tab');

    const darkFocus = await page.locator('#focus-on-dark').evaluate((element) => ({
        focused: element.matches(':focus-visible'),
        color: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth,
    }));

    expect(darkFocus.focused).toBe(true);
    expect(darkFocus.color).toBe('rgb(217, 178, 111)');
    expect(darkFocus.width).toBe('2px');

    await page.keyboard.press('Tab');

    const lightFocus = await page.locator('#focus-on-light').evaluate((element) => ({
        focused: element.matches(':focus-visible'),
        color: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth,
    }));

    expect(lightFocus.focused).toBe(true);
    expect(lightFocus.color).toBe('rgb(127, 93, 31)');
    expect(lightFocus.width).toBe('2px');
});

test('reduced motion оставляет только изменение прозрачности 150 ms', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const motion = await page.evaluate(() => {
        const match = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const bodyStyle = getComputedStyle(document.body);

        return {
            match,
            bodyTransition: bodyStyle.transitionProperty,
            bodyDuration: bodyStyle.transitionDuration,
            bodyAnimation: bodyStyle.animationName,
        };
    });

    expect(motion.match).toBe(true);
    expect(motion.bodyTransition).toBe('opacity');
    expect(motion.bodyDuration).toBe('0.15s');
    expect(motion.bodyAnimation).toBe('none');
});

test('видимый интерфейсный текст не меньше 12 px', async ({ page }) => {
    await page.goto('/');

    const tooSmall = await page.evaluate(() => {
        const allowedExceptions = ['.t-label', '[data-logo-caption]'];
        const results: Array<{ text: string; size: number; className: string }> = [];

        for (const element of Array.from(document.body.querySelectorAll('*'))) {
            if (element.closest('svg, script, style, noscript, template')) {
                continue;
            }

            const ownText = Array.from(element.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent?.trim() ?? '')
                .join('')
                .trim();

            if (ownText === '') {
                continue;
            }

            if (allowedExceptions.some((selector) => element.matches(selector))) {
                continue;
            }

            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);

            if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') {
                continue;
            }

            const size = Number.parseFloat(style.fontSize);

            if (size < 12) {
                results.push({ text: ownText, size, className: element.className });
            }
        }

        return results;
    });

    expect(tooSmall).toEqual([]);
});
