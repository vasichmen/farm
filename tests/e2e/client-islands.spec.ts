import { expect, test, type Page } from '@playwright/test';

const validWheelProps = {
    active_season: 'autumn',
    seasons: [
        {
            slug: 'summer',
            name: 'Лето',
            sub: 'ЯГОДЫ',
            url: '/?season=summer',
            products_count: 9,
            products: [{ name: 'Малина', icon: 'product-raspberry.svg' }],
        },
        {
            slug: 'autumn',
            name: 'Осень',
            sub: 'УРОЖАЙ',
            url: '/?season=autumn',
            products_count: 9,
            products: [{ name: 'Антоновка', icon: 'product-apples.svg' }],
        },
        {
            slug: 'winter',
            name: 'Зима',
            sub: 'ЗАПАСЫ',
            url: '/?season=winter',
            products_count: 9,
            products: [{ name: 'Варенье малиновое', icon: 'product-jam-raspberry.svg' }],
        },
        {
            slug: 'spring',
            name: 'Весна',
            sub: 'ЗЕЛЕНЬ',
            url: '/?season=spring',
            products_count: 8,
            products: [{ name: 'Укроп', icon: 'product-dill.svg' }],
        },
    ],
};

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

function islandMarkup(props: unknown): string {
    return `<div data-island="season-wheel" data-props='${JSON.stringify(props)}'></div>`;
}

test('зарегистрированный остров монтируется и показывает данные из data-props', async ({
    page,
}) => {
    await page.goto('/?season=autumn');

    const island = page.locator('[data-island="season-wheel"]');

    await expect(island.getByRole('tablist', { name: 'Сезоны' })).toBeVisible();
    await expect(island.getByRole('tab')).toHaveCount(4);
    await expect(island.getByRole('tab', { selected: true })).toHaveAttribute(
        'aria-label',
        /Осень/,
    );
    await expect(island.locator('[data-season-label="winter"]')).toHaveText('Зима');
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
         ${islandMarkup(validWheelProps)}`,
    );

    await page.goto('/?season=autumn');

    await expect(page.locator('[data-island="season-wheel"]').last().getByRole('tab')).toHaveCount(
        4,
    );
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
        `<div data-island="season-wheel" data-props="{broken"></div>
         ${islandMarkup(validWheelProps)}`,
    );

    await page.goto('/?season=autumn');

    const brokenIsland = page.locator('[data-island="season-wheel"][data-props="{broken"]');
    await expect(brokenIsland).toBeEmpty();
    await expect(page.locator('[data-island="season-wheel"]').last().getByRole('tab')).toHaveCount(
        4,
    );
    expect(errors.some((message) => message.includes('Не удалось разобрать данные'))).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
});

test('данные, не прошедшие проверку схемой, оставляют серверный fallback', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });

    await page.route('**/*', async (route) => {
        if (route.request().resourceType() !== 'document') {
            await route.continue();

            return;
        }

        const response = await route.fetch();
        const body = await response.text();
        const props = JSON.parse(
            body.match(/data-props='([^']+)'/)?.[1].replace(/&#039;/g, "'") ?? '{}',
        );

        props.seasons = props.seasons.map((season: { slug: string; sub: string }) =>
            season.slug === 'winter' ? { ...season, sub: 'СЛИШКОМ ДЛИННО' } : season,
        );

        await route.fulfill({
            response,
            body: body.replace(
                /data-props='[^']+'/,
                `data-props='${JSON.stringify(props).replace(/'/g, '&#039;')}'`,
            ),
        });
    });

    await page.goto('/?season=autumn');

    const island = page.locator('[data-island="season-wheel"]');

    await expect(island.getByRole('tablist')).toHaveCount(0);
    await expect(island.locator('.season-wheel__fallback a')).toHaveCount(4);
    await expect(island.locator('.season-wheel__fallback')).toContainText('УРОЖАЙ');
    expect(errors.some((message) => message.includes('не прошли проверку'))).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Усадьба Лыково');
});

test('серверный текст рядом с контейнером не меняется при монтировании', async ({ page }) => {
    await injectIntoHome(
        page,
        `<p id="server-marker">Серверный текст рядом с островом.</p>
         ${islandMarkup(validWheelProps)}
         <script>window.__serverMarkerText = document.getElementById('server-marker').textContent;</script>`,
    );

    await page.goto('/?season=autumn');

    const marker = page.locator('#server-marker');
    const textBeforeMount = await page.evaluate(
        () => (window as Window & { __serverMarkerText?: string }).__serverMarkerText,
    );
    const textAfterMount = await marker.textContent();

    expect(textAfterMount).toBe(textBeforeMount);
    expect(textAfterMount).toBe('Серверный текст рядом с островом.');
    await expect(page.locator('[data-island="season-wheel"]').last().getByRole('tab')).toHaveCount(
        4,
    );
});
