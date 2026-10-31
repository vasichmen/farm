import { expect, test } from '@playwright/test';

const pages = [
    { path: '/', heading: 'Усадьба Лыково' },
    { path: '/about', heading: 'О хозяйстве' },
    { path: '/preorder', heading: 'Предзаказ' },
    { path: '/how-to-order', heading: 'Как оформить заказ' },
    { path: '/contacts', heading: 'Контакты' },
];

test('главная страница отдаёт HTML с заголовком и текстом заглушки', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
    await expect(page.getByText(/Здесь скоро появится главная страница/)).toBeVisible();
});

test('каждая страница содержит базовые метаданные и один h1', async ({ page }) => {
    for (const item of pages) {
        const response = await page.goto(item.path);
        expect(response?.status(), item.path).toBe(200);

        const title = await page.title();
        expect(title.trim(), item.path).not.toBe('');

        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description?.trim(), item.path).not.toBe('');

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical, item.path).toMatch(/^https?:\/\//);

        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(item.heading);
    }
});

test('метаданные страниц-заглушек отличаются от главной', async ({ page }) => {
    await page.goto('/');
    const homeTitle = await page.title();
    const homeDescription = await page.locator('meta[name="description"]').getAttribute('content');

    for (const item of pages.filter((page) => page.path !== '/')) {
        await page.goto(item.path);

        expect(await page.title(), item.path).not.toBe(homeTitle);
        expect(
            await page.locator('meta[name="description"]').getAttribute('content'),
            item.path,
        ).not.toBe(homeDescription);
    }
});

test('страницы-заглушки содержат ссылку возврата на главную', async ({ page }) => {
    for (const item of pages.filter((page) => page.path !== '/')) {
        await page.goto(item.path);

        await expect(page.locator('a[href="/"]')).toHaveCount(1);
    }
});

test('неизвестный адрес возвращает 404 с HTML-страницей ошибки', async ({ page }) => {
    const response = await page.goto('/no-such-page');

    expect(response?.status()).toBe(404);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Страница не найдена');
});

test('ссылки навигации ведут на существующие страницы', async ({ page, request }) => {
    await page.goto('/');

    const links = page.locator('header.site-header a');
    await expect(links).toHaveCount(5);

    const hrefs = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')),
    );

    for (const href of hrefs) {
        expect(href).not.toBeNull();

        const response = await request.get(href as string);
        expect(response.status(), href as string).toBe(200);
    }
});

test.describe('без JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('главная страница содержит заголовок и текст заглушки в исходном HTML', async ({
        page,
    }) => {
        const response = await page.goto('/');

        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
        await expect(page.getByText(/Здесь скоро появится главная страница/)).toBeVisible();
    });
});
