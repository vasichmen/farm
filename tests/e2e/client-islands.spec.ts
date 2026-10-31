import { expect, test, type Page } from '@playwright/test';

async function injectIntoHome(page: Page, markup: string): Promise<void> {
    await page.route('**/*', async (route) => {
        if (route.request().resourceType() !== 'document') {
            await route.continue();

            return;
        }

        const response = await route.fetch();
        const body = await response.text();

        await route.fulfill({
            response,
            body: body.replace('</main>', `${markup}</main>`),
        });
    });
}

test('зарегистрированный остров монтируется и показывает данные из data-props', async ({
    page,
}) => {
    await page.goto('/');

    const island = page.locator('[data-island="scaffold-probe"]');

    await expect(island).toContainText('Проверочный остров: клиентские скрипты подключены.');
    await expect(island.locator('button')).toHaveText('Проверить интерактивность');

    await island.locator('button').click();
    await expect(island.locator('button')).toHaveText('Нажатий: 1');
});

test('неизвестное имя острова даёт предупреждение и не ломает соседний остров', async ({
    page,
}) => {
    const warnings: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'warning') {
            warnings.push(message.text());
        }
    });

    await injectIntoHome(
        page,
        `<div data-island="unknown-island"></div>
         <div data-island="scaffold-probe" data-props='{"message":"Соседний остров работает."}'></div>`,
    );

    await page.goto('/');

    await expect(page.getByText('Соседний остров работает.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
    expect(warnings.some((message) => message.includes('unknown-island'))).toBe(true);
});

test('некорректный JSON пропускает только этот остров и сообщает об ошибке', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    await injectIntoHome(
        page,
        `<div data-island="scaffold-probe" data-props="{broken"></div>
         <div data-island="scaffold-probe" data-props='{"message":"Второй остров работает."}'></div>`,
    );

    await page.goto('/');

    const brokenIsland = page.locator('[data-island="scaffold-probe"][data-props="{broken"]');
    await expect(brokenIsland).toBeEmpty();
    await expect(page.getByText('Второй остров работает.')).toBeVisible();
    expect(errors.some((message) => message.includes('Не удалось разобрать данные'))).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
});

test('серверный текст рядом с контейнером не меняется при монтировании', async ({ page }) => {
    await injectIntoHome(
        page,
        `<p id="server-marker">Серверный текст рядом с островом.</p>
         <div data-island="scaffold-probe" data-props='{"message":"Остров рядом."}'></div>
         <script>window.__serverMarkerText = document.getElementById('server-marker').textContent;</script>`,
    );

    await page.goto('/');

    const marker = page.locator('#server-marker');
    const textBeforeMount = await page.evaluate(
        () => (window as Window & { __serverMarkerText?: string }).__serverMarkerText,
    );
    const textAfterMount = await marker.textContent();

    expect(textAfterMount).toBe(textBeforeMount);
    expect(textAfterMount).toBe('Серверный текст рядом с островом.');
    await expect(page.getByText('Остров рядом.')).toBeVisible();
});
