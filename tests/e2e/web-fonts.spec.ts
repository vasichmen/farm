import { expect, test } from '@playwright/test';

test('шрифты отдаются с собственного домена без сторонних хостов', async ({ page }) => {
    const fontRequests: string[] = [];
    const fontResponses: Array<{ url: string; status: number; contentType: string | null }> = [];

    page.on('request', (request) => {
        if (request.resourceType() === 'font' || /\.woff2($|\?)/.test(request.url())) {
            fontRequests.push(request.url());
        }
    });

    page.on('response', (response) => {
        if (/\.woff2($|\?)/.test(response.url())) {
            fontResponses.push({
                url: response.url(),
                status: response.status(),
                contentType: response.headers()['content-type'] ?? null,
            });
        }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pageHostname = new URL(page.url()).hostname;
    const thirdParty = fontRequests.filter((url) => new URL(url).hostname !== pageHostname);

    expect(thirdParty).toEqual([]);
    expect(fontRequests.length).toBeGreaterThan(0);
    expect(fontResponses.length).toBeGreaterThan(0);

    for (const response of fontResponses) {
        expect(response.status, response.url).toBe(200);
        expect(response.contentType, response.url).toContain('font/woff2');
    }
});

test('основные начертания предзагружаются и подключаются с swap', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    const html = await page.content();

    const preloads = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) =>
        links.map((link) => ({
            href: (link as HTMLLinkElement).href,
            type: (link as HTMLLinkElement).type,
        })),
    );

    expect(preloads.length).toBeGreaterThanOrEqual(4);

    for (const preload of preloads) {
        expect(preload.href, preload.href).toMatch(/\.woff2($|\?)/);
        expect(preload.type, preload.href).toBe('font/woff2');
    }

    expect(html).toContain('font-display: swap');
    expect(html).toContain('font-family: "Cormorant Garamond"');
    expect(html).toContain('font-family: "Manrope"');
    expect(html).toContain('unicode-range:');
});

test('fallback-шрифты содержат метрики size-adjust', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    const html = await page.content();

    expect(html).toContain('size-adjust:');
    expect(html).toContain('Cormorant Garamond fallback');
    expect(html).toContain('Manrope fallback');
    expect(html).toMatch(/--font-display:\s*"Cormorant Garamond"/);
    expect(html).toMatch(/--font-ui:\s*"Manrope"/);
});

test('задержка загрузки шрифтов не сдвигает макет больше 0.1', async ({ page }) => {
    await page.addInitScript(() => {
        const state = { cls: 0 };
        (window as Window & { __cls?: number }).__cls = 0;

        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const shift = entry as PerformanceEntry & {
                    value?: number;
                    hadRecentInput?: boolean;
                };

                if (!shift.hadRecentInput) {
                    state.cls += shift.value ?? 0;
                    (window as Window & { __cls?: number }).__cls = state.cls;
                }
            }
        }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.route('**/*.woff2', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.continue();
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => (window as Window & { __cls?: number }).__cls ?? 0);

    expect(cls).toBeLessThanOrEqual(0.1);
});
