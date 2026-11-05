import { expect, test, type Page, type Route } from '@playwright/test';

const AUTUMN = '/?season=autumn';

async function prepare(page: Page, url: string): Promise<void> {
    await page.addInitScript(() => {
        window.sessionStorage.setItem('season-wheel:visited', '1');
    });
    await page.goto(url);
}

async function settleModal(page: Page): Promise<void> {
    await page.locator('[data-product-modal-panel]').evaluate(async (element) => {
        await Promise.all(
            element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
        );
    });
}

async function openDirect(page: Page, url: string): Promise<void> {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepare(page, url);
    await expect(page.getByRole('dialog')).toBeVisible();
    await settleModal(page);
}

async function interceptDocument(page: Page, transform: (html: string) => string): Promise<void> {
    await page.route('**/*', async (route: Route) => {
        if (route.request().resourceType() !== 'document') {
            await route.continue();

            return;
        }

        const response = await route.fetch();
        const body = await response.text();

        await route.fulfill({ response, body: transform(body) });
    });
}

function longDescriptionProps(html: string): string {
    const recipe = /data-island="product-modal"\s+data-props='([^']*)'/;

    if (!recipe.test(html)) {
        throw new Error('Контейнер окна товара не найден в документе.');
    }

    return html.replace(recipe, (_match, props: string) => {
        const data = JSON.parse(props) as {
            products: Array<{ slug: string; description: string }>;
            initial_product: { slug: string; description: string } | null;
        };
        const product = data.products.find((item) => item.slug === 'antonovka');

        if (product === undefined) {
            throw new Error('Товар antonovka не найден в данных окна.');
        }

        const description = Array.from(
            { length: 14 },
            () =>
                'Старой яблоне больше сорока лет, она пахнет на весь дом и до весны лежит в погребе.',
        ).join(' ');

        product.description = description;

        if (data.initial_product !== null && data.initial_product.slug === 'antonovka') {
            data.initial_product.description = description;
        }

        const encoded = JSON.stringify(data).replace(/'/g, '\\u0027');

        return `data-island="product-modal" data-props='${encoded}'`;
    });
}

test.describe('окно товара по прямой ссылке', () => {
    test('открывается и показывает данные товара', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');

        await expect(dialog.locator('.product-modal__title')).toHaveText(
            'Антоновка с дедушкиной яблони',
        );
        await expect(dialog.locator('.product-modal__overline')).toHaveText(
            'Сад · сбор 2–10 октября',
        );
        await expect(dialog.locator('.product-modal__description')).toContainText(
            'Старой яблоне больше сорока лет.',
        );
        await expect(dialog.locator('.product-modal__fact')).toHaveCount(3);
        await expect(dialog.locator('.product-modal__fact').first()).toHaveText('ящик 5 кг');
        await expect(dialog.locator('[data-product-modal-price]')).toContainText('650 ₽');
        await expect(dialog.locator('.product-modal__illustration svg')).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Закрыть' })).toBeVisible();
    });

    test('без сбора надзаголовок содержит только раздел', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=grusha-lada`);

        await expect(page.getByRole('dialog').locator('.product-modal__overline')).toHaveText(
            'Сад',
        );
    });

    test('размеры окна: 520 px, отступы 52 px, иллюстрация 120 px', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');
        const metrics = await dialog.evaluate((element) => {
            const panel = element as HTMLElement;
            const illustration = panel.querySelector<HTMLElement>('.product-modal__illustration');
            const header = panel.querySelector<HTMLElement>('.product-modal__header');
            const footer = panel.querySelector<HTMLElement>('.product-modal__footer');
            const body = panel.querySelector<HTMLElement>('.product-modal__body');

            return {
                width: Math.round(panel.getBoundingClientRect().width),
                illustration: illustration?.getBoundingClientRect().width ?? 0,
                headerPadding: header === null ? '' : getComputedStyle(header).paddingInline,
                footerPadding: footer === null ? '' : getComputedStyle(footer).paddingInline,
                bodyPadding: body === null ? '' : getComputedStyle(body).paddingInline,
            };
        });

        expect(metrics.width).toBe(520);
        expect(metrics.illustration).toBe(120);
        expect(metrics.headerPadding).toBe('52px');
        expect(metrics.footerPadding).toBe('52px');
        expect(metrics.bodyPadding).toBe('52px');
    });

    test('цена за килограмм выводится с суффиксом', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=tykva-muskatnaya`);

        await expect(page.getByRole('dialog').locator('[data-product-modal-price]')).toContainText(
            '120 ₽/кг',
        );
    });

    test('товар вне наличия открывается с состоянием «нет в наличии»', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=kartofel`);

        const dialog = page.getByRole('dialog');

        await expect(dialog.locator('.product-modal__badge--out')).toHaveText('нет в наличии');
        await expect(dialog.locator('[data-product-modal-out-note]')).toBeVisible();
        await expect(dialog.locator('[data-product-modal-preorder]')).toHaveCount(0);
    });

    test('неизвестный товар не открывает окно', async ({ page }) => {
        await prepare(page, `${AUTUMN}&product=unknown-product`);

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.locator('#catalog-column')).toBeVisible();
    });

    test('в окне нет «Отложить» и счётчика количества', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');

        await expect(dialog.getByText('Отложить', { exact: false })).toHaveCount(0);
        await expect(dialog.locator('.product-modal__qty')).toHaveCount(0);
        await expect(dialog.getByRole('button')).toHaveCount(1);
    });
});

test.describe('открытие из карточки, история и клавиатура', () => {
    test('мышь открывает окно, сохраняет сезон и закрывает крестиком', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const dialog = page.getByRole('dialog');
        const link = page.locator('.catalog-card__link').first();

        await link.click();

        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(/season=autumn/);
        await expect(page).toHaveURL(/product=antonovka/);
        await expect(page).toHaveURL(
            /product=antonovka.*season=autumn|season=autumn.*product=antonovka/,
        );

        const state = await page.evaluate(() => window.history.state);

        expect(state).not.toBeNull();
        expect((state as { productModal?: boolean }).productModal).toBe(true);

        await dialog.getByRole('button', { name: 'Закрыть' }).click();

        await expect(dialog).toHaveCount(0);
        await expect(page).not.toHaveURL(/product=/);

        const closedState = await page.evaluate(() => window.history.state);

        expect((closedState as { productModal?: boolean } | null)?.productModal).not.toBe(true);
    });

    test('Escape и клик по затемнению закрывают окно', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const dialog = page.getByRole('dialog');
        const link = page.locator('.catalog-card__link').first();

        await link.click();
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);

        await link.click();
        await expect(dialog).toBeVisible();
        await page.mouse.click(8, 8);
        await expect(dialog).toHaveCount(0);
        await expect(page).not.toHaveURL(/product=/);
    });

    test('кнопка «Назад» закрывает окно и возвращает адрес', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const dialog = page.getByRole('dialog');

        await page.locator('.catalog-card__link').first().click();
        await expect(dialog).toBeVisible();

        await page.evaluate(() => window.history.back());

        await expect(dialog).toHaveCount(0);
        await expect(page).not.toHaveURL(/product=/);
        await expect(page).toHaveURL(/season=autumn/);
    });

    test('прямая ссылка: «Назад» остаётся на странице и не дублирует историю после reload', async ({
        page,
    }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');
        const historyLength = await page.evaluate(() => window.history.length);

        expect(historyLength).toBeGreaterThan(1);

        await page.reload();
        await expect(dialog).toBeVisible();
        await settleModal(page);

        expect(await page.evaluate(() => window.history.length)).toBe(historyLength);

        await page.evaluate(() => window.history.back());

        await expect(dialog).toHaveCount(0);
        await expect(page).not.toHaveURL(/product=/);
        await expect(page).toHaveURL(/season=autumn/);
        await expect(page.locator('#catalog-column')).toBeVisible();
    });

    test('Enter открывает окно с клавиатуры', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const link = page.locator('.catalog-card__link').first();

        await link.focus();
        await page.keyboard.press('Enter');

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page).toHaveURL(/product=antonovka/);
    });

    test('Space открывает окно, а ссылка карточки имеет видимое фокус-кольцо', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        let focused = false;

        for (let step = 0; step < 40; step += 1) {
            await page.keyboard.press('Tab');

            const info = await page.evaluate(() => {
                const element = document.activeElement as HTMLElement | null;

                return {
                    slug: element?.dataset.productSlug ?? null,
                    outlineStyle: element === null ? '' : getComputedStyle(element).outlineStyle,
                };
            });

            if (info.slug !== null) {
                focused = true;
                expect(info.outlineStyle).not.toBe('none');
                break;
            }
        }

        expect(focused).toBe(true);

        await page.keyboard.press(' ');
        await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('на 1199 px прямая ссылка не открывает окно', async ({ page }) => {
        await page.setViewportSize({ width: 1199, height: 900 });
        await prepare(page, `${AUTUMN}&product=antonovka`);

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.locator('#catalog-column')).toBeVisible();

        const state = await page.evaluate(() => window.history.state);

        expect((state as { productModal?: boolean } | null)?.productModal).not.toBe(true);
    });

    test('ресайз ниже 1200 px закрывает открытое окно и снимает блокировки', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');

        await page.setViewportSize({ width: 1199, height: 900 });

        await expect(dialog).toHaveCount(0);
        await expect
            .poll(() =>
                page.evaluate(() =>
                    document.documentElement.classList.contains('product-modal-open'),
                ),
            )
            .toBe(false);
        await expect(page.locator('main.site-main')).not.toHaveAttribute('inert', '');
    });
});

test.describe('статусы наличия в окне', () => {
    test('«осталось N» показывает бейдж у цены без кнопки', async ({ page }) => {
        await openDirect(page, '/?season=winter&product=varene-smorodinovoe');

        const dialog = page.getByRole('dialog');

        await expect(dialog.locator('.product-modal__badge--few')).toHaveText('осталось 3');
        await expect(dialog.locator('[data-product-modal-preorder]')).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: 'Записаться на предзаказ' })).toHaveCount(
            0,
        );
    });

    test('предзаказ показывает бейдж и золотую кнопку на /preorder', async ({ page }) => {
        await openDirect(page, '/?season=winter&product=novogodniy-chaynyy-nabor');

        const dialog = page.getByRole('dialog');
        const button = dialog.locator('[data-product-modal-preorder]');

        await expect(dialog.locator('.product-modal__badge--preorder')).toHaveText('предзаказ');
        await expect(button).toHaveText('Записаться на предзаказ');
        await expect(button).toHaveAttribute('href', /\/preorder$/);

        const background = await button.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );

        expect(background).toBe('rgb(185, 139, 62)');

        await button.click();
        await page.waitForURL('**/preorder');
    });

    test('товар в наличии не показывает бейдж и кнопку', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');

        await expect(dialog.locator('.product-modal__badge')).toHaveCount(0);
        await expect(dialog.locator('[data-product-modal-preorder]')).toHaveCount(0);
        await expect(dialog.locator('[data-product-modal-out-note]')).toHaveCount(0);
    });

    test('товар вне наличия приглушает иллюстрацию и цену', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=kartofel`);

        const dialog = page.getByRole('dialog');
        const illustration = dialog.locator('.product-modal__illustration');
        const price = dialog.locator('[data-product-modal-price]');

        const styles = await illustration.evaluate((element) => {
            const style = getComputedStyle(element);

            return { filter: style.filter, opacity: style.opacity };
        });

        expect(styles.filter).not.toBe('none');
        expect(Number.parseFloat(styles.opacity)).toBeLessThan(1);
        await expect(price).toHaveClass(/product-modal__price--out/);
    });
});

test.describe('модальная доступность', () => {
    test('семантика диалога и начальный фокус', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog', {
            name: 'Антоновка с дедушкиной яблони',
        });

        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(dialog).toHaveAttribute('aria-labelledby', 'product-modal-title');
        await expect(dialog).toHaveAttribute('aria-describedby', 'product-modal-description');
        await expect(page.getByRole('button', { name: 'Закрыть' })).toBeFocused();
    });

    test('Tab и Shift+Tab удерживают фокус внутри окна', async ({ page }) => {
        await openDirect(page, '/?season=winter&product=novogodniy-chaynyy-nabor');

        const close = page.getByRole('button', { name: 'Закрыть' });
        const preorder = page.locator('[data-product-modal-preorder]');

        await expect(close).toBeFocused();

        await page.keyboard.press('Shift+Tab');
        await expect(preorder).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(close).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(preorder).toBeFocused();
    });

    test('фон получает inert, а после закрытия — снова доступен', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=antonovka`);

        const header = page.locator('header.site-header');
        const main = page.locator('main.site-main');

        await expect(header).toHaveAttribute('inert', '');
        await expect(main).toHaveAttribute('inert', '');

        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await expect(header).not.toHaveAttribute('inert', '');
        await expect(main).not.toHaveAttribute('inert', '');
    });

    test('прокрутка страницы блокируется и снимается при закрытии разными способами', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 680 });
        await prepare(page, AUTUMN);

        const link = page.locator('.catalog-card__link').first();
        const dialog = page.getByRole('dialog');
        const html = page.locator('html');

        const isLocked = async (): Promise<boolean> =>
            page.evaluate(() => {
                const root = document.documentElement;

                return (
                    root.classList.contains('product-modal-open') &&
                    getComputedStyle(root).overflow === 'hidden'
                );
            });

        const closeWays: Array<() => Promise<void>> = [
            async () => {
                await link.click();
                await expect(dialog).toBeVisible();
                await page.getByRole('button', { name: 'Закрыть' }).click();
            },
            async () => {
                await link.click();
                await expect(dialog).toBeVisible();
                await page.keyboard.press('Escape');
            },
            async () => {
                await link.click();
                await expect(dialog).toBeVisible();
                await page.mouse.click(8, 8);
            },
        ];

        for (const close of closeWays) {
            await close();
            await expect(dialog).toHaveCount(0);
            await expect.poll(isLocked).toBe(false);
            await expect(html).not.toHaveClass(/product-modal-open/);
        }
    });

    test('слои соответствуют токенам и одновременно открыт один диалог', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const links = page.locator('.catalog-card__link');

        await links.first().evaluate((element) => {
            (element as HTMLAnchorElement).click();
            (element as HTMLAnchorElement).click();
        });

        await expect(page.getByRole('dialog')).toHaveCount(1);
        await settleModal(page);

        const layers = await page.evaluate(() => ({
            overlay: getComputedStyle(
                document.querySelector<HTMLElement>('[data-product-modal-overlay]') as HTMLElement,
            ).zIndex,
            dialog: getComputedStyle(
                document.querySelector<HTMLElement>('[data-product-modal-panel]') as HTMLElement,
            ).zIndex,
        }));

        expect(layers.overlay).toBe('30');
        expect(layers.dialog).toBe('31');

        await links.nth(1).evaluate((element) => (element as HTMLAnchorElement).click());
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.locator('.product-modal__title')).toHaveText(
            'Антоновка с дедушкиной яблони',
        );
    });

    test('фокус возвращается на карточку, из которой открыли окно', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);

        const link = page.locator('.catalog-card__link').first();

        await link.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await expect(link).toBeFocused();
    });

    test('без карточки фокус возвращается на заголовок сезона', async ({ page }) => {
        await openDirect(page, `${AUTUMN}&product=kartofel`);

        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await expect(page.locator('#catalog-column .catalog-header__title')).toBeFocused();
    });
});

interface AnimationRecord {
    target: string;
    duration: number | null;
    keys: string[][];
    easing: string | null;
}

async function installAnimationRecorder(page: Page): Promise<void> {
    await page.evaluate(() => {
        const store = window as unknown as { __modalAnimations?: unknown[] };
        const original = Element.prototype.animate;

        store.__modalAnimations = [];

        Element.prototype.animate = function (
            this: Element,
            keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
            options?: number | KeyframeAnimationOptions,
        ): Animation {
            const animation = original.call(this, keyframes, options);
            const frames = Array.isArray(keyframes) ? keyframes : [];
            let target = this.className;

            if (this.hasAttribute('data-product-modal-panel')) {
                target = 'panel';
            } else if (this.hasAttribute('data-product-modal-overlay')) {
                target = 'overlay';
            }

            store.__modalAnimations?.push({
                target,
                duration:
                    typeof options === 'number'
                        ? options
                        : ((options as KeyframeAnimationOptions | undefined)?.duration ?? null),
                keys: frames.map((frame) => Object.keys(frame).sort()),
                easing:
                    typeof options === 'number'
                        ? null
                        : (((options as KeyframeAnimationOptions | undefined)?.easing as
                              string | null) ?? null),
            });

            return animation;
        };
    });
}

async function readAnimations(page: Page): Promise<AnimationRecord[]> {
    return page.evaluate(
        () =>
            ((window as unknown as { __modalAnimations?: AnimationRecord[] }).__modalAnimations ??
                []) as AnimationRecord[],
    );
}

async function resetAnimations(page: Page): Promise<void> {
    await page.evaluate(() => {
        (window as unknown as { __modalAnimations?: unknown[] }).__modalAnimations = [];
    });
}

test.describe('анимация окна', () => {
    test('открытие длится 400 ms, закрытие — 250 ms, анимируются только transform и opacity', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);
        await installAnimationRecorder(page);

        const dialog = page.getByRole('dialog');

        await page.locator('.catalog-card__link').first().click();
        await expect(dialog).toBeVisible();

        await expect
            .poll(async () => (await readAnimations(page)).length)
            .toBeGreaterThanOrEqual(2);

        const openRecords = await readAnimations(page);
        const openPanel = openRecords.find(
            (record) => record.target === 'panel' && record.duration === 400,
        );
        const openOverlay = openRecords.find(
            (record) => record.target === 'overlay' && record.duration === 400,
        );

        expect(openPanel).toBeDefined();
        expect(openOverlay).toBeDefined();
        expect(openPanel?.keys).toEqual([
            ['opacity', 'transform'],
            ['opacity', 'transform'],
        ]);
        expect(openOverlay?.keys).toEqual([['opacity'], ['opacity']]);
        expect(openPanel?.easing).toContain('cubic-bezier');

        await resetAnimations(page);

        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(dialog).toHaveCount(0);

        await expect
            .poll(async () => (await readAnimations(page)).length)
            .toBeGreaterThanOrEqual(2);

        const closeRecords = await readAnimations(page);
        const closePanel = closeRecords.find(
            (record) => record.target === 'panel' && record.duration === 250,
        );
        const closeOverlay = closeRecords.find(
            (record) => record.target === 'overlay' && record.duration === 250,
        );

        expect(closePanel).toBeDefined();
        expect(closeOverlay).toBeDefined();
        expect(closePanel?.keys).toEqual([
            ['opacity', 'transform'],
            ['opacity', 'transform'],
        ]);
        expect(closeOverlay?.keys).toEqual([['opacity'], ['opacity']]);
    });

    test('reduced motion оставляет только прозрачность 150 ms', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, AUTUMN);
        await installAnimationRecorder(page);

        const dialog = page.getByRole('dialog');

        await page.locator('.catalog-card__link').first().click();
        await expect(dialog).toBeVisible();

        await expect
            .poll(async () => (await readAnimations(page)).length)
            .toBeGreaterThanOrEqual(2);

        const openRecords = await readAnimations(page);
        const openPanel = openRecords.find(
            (record) => record.target === 'panel' && record.duration === 150,
        );
        const openOverlay = openRecords.find(
            (record) => record.target === 'overlay' && record.duration === 150,
        );

        expect(openPanel).toBeDefined();
        expect(openOverlay).toBeDefined();
        expect(openPanel?.keys).toEqual([['opacity'], ['opacity']]);
        expect(openOverlay?.keys).toEqual([['opacity'], ['opacity']]);

        await resetAnimations(page);
        await page.getByRole('button', { name: 'Закрыть' }).click();
        await expect(dialog).toHaveCount(0);

        await expect
            .poll(async () => (await readAnimations(page)).length)
            .toBeGreaterThanOrEqual(2);

        const closeRecords = await readAnimations(page);
        const closePanel = closeRecords.find(
            (record) => record.target === 'panel' && record.duration === 150,
        );

        expect(closePanel).toBeDefined();
        expect(closePanel?.keys).toEqual([['opacity'], ['opacity']]);
    });
});

test.describe('визуальная проверка и fallback без JavaScript', () => {
    for (const viewport of [
        { width: 1440, height: 900 },
        { width: 1200, height: 680 },
    ]) {
        test(`на ${viewport.width}×${viewport.height} нет горизонтальной прокрутки и ошибок консоли`, async ({
            page,
        }) => {
            const errors: string[] = [];

            page.on('console', (message) => {
                if (message.type() === 'error') {
                    errors.push(message.text());
                }
            });
            page.on('pageerror', (error) => errors.push(error.message));

            await page.setViewportSize(viewport);
            await prepare(page, `${AUTUMN}&product=antonovka`);
            await expect(page.getByRole('dialog')).toBeVisible();
            await settleModal(page);

            const metrics = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
            }));

            expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
            expect(errors).toEqual([]);
        });
    }

    test('без JavaScript карточка остаётся ссылкой на ?product=… и страница не ломается', async ({
        browser,
    }) => {
        const context = await browser.newContext({
            javaScriptEnabled: false,
            viewport: { width: 1440, height: 900 },
        });
        const page = await context.newPage();

        await page.goto(AUTUMN);

        const link = page.locator('.catalog-card__link').first();

        await expect(link).toHaveAttribute('href', /product=antonovka/);
        await expect(link).toHaveAttribute('aria-label', 'Открыть товар «Антоновка»');
        await expect(page.locator('[data-island="product-modal"]')).toHaveCount(1);

        await link.click();
        await page.waitForURL(/product=antonovka/);

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('#catalog-column')).toBeVisible();
        await expect(page.locator('.catalog-card')).toHaveCount(8);
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await context.close();
    });
});

test.describe('высота и прокрутка окна', () => {
    test('короткое описание не прокручивается и не обрезается', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await prepare(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');
        const body = page.locator('[data-product-modal-body]');

        await expect(dialog).toBeVisible();
        await settleModal(page);

        const metrics = await page.evaluate(() => {
            const panel = document.querySelector<HTMLElement>('[data-product-modal-panel]');
            const content = document.querySelector<HTMLElement>('[data-product-modal-body]');

            return {
                panelScroll: panel === null ? -1 : panel.scrollHeight - panel.clientHeight,
                bodyScroll: content === null ? -1 : content.scrollHeight - content.clientHeight,
            };
        });

        expect(metrics.panelScroll).toBeLessThanOrEqual(1);
        expect(metrics.bodyScroll).toBeLessThanOrEqual(1);
        await expect(page.locator('[data-product-modal-fade]')).toHaveCount(0);
        await expect(body).toBeVisible();
    });

    test('длинное описание прокручивается только внутри, шапка и низ закреплены', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1200, height: 680 });
        await interceptDocument(page, longDescriptionProps);
        await prepare(page, `${AUTUMN}&product=antonovka`);

        const dialog = page.getByRole('dialog');
        const body = page.locator('[data-product-modal-body]');

        await expect(dialog).toBeVisible();
        await settleModal(page);
        await expect(page.locator('[data-product-modal-fade]')).toBeVisible();

        const before = await page.evaluate(() => {
            const panel = document.querySelector<HTMLElement>('[data-product-modal-panel]');
            const content = document.querySelector<HTMLElement>('[data-product-modal-body]');
            const header = document.querySelector<HTMLElement>('.product-modal__header');
            const footer = document.querySelector<HTMLElement>('.product-modal__footer');

            return {
                panelHeight: panel?.getBoundingClientRect().height ?? 0,
                viewport: window.innerHeight,
                panelScroll: panel === null ? -1 : panel.scrollHeight - panel.clientHeight,
                bodyScroll: content === null ? -1 : content.scrollHeight - content.clientHeight,
                headerTop: header?.getBoundingClientRect().top ?? 0,
                footerBottom: footer?.getBoundingClientRect().bottom ?? 0,
            };
        });

        expect(before.panelHeight).toBeLessThanOrEqual(before.viewport - 64);
        expect(before.panelScroll).toBeLessThanOrEqual(1);
        expect(before.bodyScroll).toBeGreaterThan(1);

        const bodyBox = await body.boundingBox();

        expect(bodyBox).not.toBeNull();

        await body.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
        });

        const after = await page.evaluate(() => {
            const header = document.querySelector<HTMLElement>('.product-modal__header');
            const footer = document.querySelector<HTMLElement>('.product-modal__footer');
            const content = document.querySelector<HTMLElement>('[data-product-modal-body]');

            return {
                scrollTop: content?.scrollTop ?? 0,
                headerTop: header?.getBoundingClientRect().top ?? 0,
                footerBottom: footer?.getBoundingClientRect().bottom ?? 0,
            };
        });

        expect(after.scrollTop).toBeGreaterThan(0);
        expect(after.headerTop).toBeCloseTo(before.headerTop, 0);
        expect(after.footerBottom).toBeCloseTo(before.footerBottom, 0);
    });
});
