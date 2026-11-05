import { expect, test, type Page, type Route } from '@playwright/test';

const AUTUMN = '/?season=autumn';
const CARD = '.catalog-card';
const CARD_TITLE = '.catalog-card__title';

/** Открывает колонку без входной анимации: карточки уже на месте. */
async function openColumn(page: Page, url = AUTUMN): Promise<void> {
    await page.addInitScript(() => {
        window.sessionStorage.setItem('season-wheel:visited', '1');
    });
    await page.goto(url);
    await expect(page.locator(CARD).first()).toBeVisible();
}

async function cardNames(page: Page): Promise<string[]> {
    return page.locator(CARD_TITLE).allInnerTexts();
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

function replaceColumn(html: string, markup: string): string {
    const column = /<section\s+id="catalog-column"[\s\S]*?<\/section>/;

    if (!column.test(html)) {
        throw new Error('Колонка каталога не найдена в документе.');
    }

    return html.replace(column, markup);
}

function columnShell(inner: string, state = 'ready'): string {
    return `<section id="catalog-column" class="catalog-column" role="tabpanel" aria-labelledby="season-tab-autumn" data-state="${state}">
        <div class="catalog-header">
            <h1 class="catalog-header__title" tabindex="-1">Осенью в Лыково пахнет антоновкой и сушёными травами</h1>
            <p class="catalog-header__lead">Мы не держим склад: что созрело, то и в наличии.</p>
        </div>
        ${inner}
    </section>`;
}

function emptyMarkup(): string {
    return columnShell(
        `<div class="catalog-state catalog-state--empty">
            <span class="catalog-state__icon"><svg class="ui-icon"><use href="#ui-leaf"></use></svg></span>
            <h2 class="catalog-state__title">В этом сезоне пока ничего не созрело</h2>
            <p class="catalog-state__text">Урожай ещё не собран. Загляните через пару недель. Поверните колесо: в соседнем сезоне уже есть урожай.</p>
            <a class="catalog-state__button" href="/?season=spring" data-season-link>ПОКАЗАТЬ ВЕСНУ →</a>
        </div>`,
        'empty',
    );
}

function loadingMarkup(): string {
    const cards = Array.from(
        { length: 8 },
        () => `<div class="catalog-skeleton__card">
            <div class="catalog-skeleton__icon"></div>
            <div class="catalog-skeleton__line"></div>
            <div class="catalog-skeleton__line catalog-skeleton__line--short"></div>
        </div>`,
    ).join('');

    return `<section id="catalog-column" class="catalog-column" role="tabpanel" aria-labelledby="season-tab-autumn" data-state="loading" >
        <div class="catalog-skeleton" aria-hidden="true">
            <div class="catalog-skeleton__title"></div>
            <div class="catalog-skeleton__title catalog-skeleton__title--short"></div>
            <div class="catalog-skeleton__lead"></div>
            <div class="catalog-skeleton__lead catalog-skeleton__lead--short"></div>
            <div class="card-grid catalog-skeleton__grid">${cards}</div>
        </div>
    </section>`;
}

function errorMarkup(): string {
    return columnShell(
        `<div class="catalog-state catalog-state--error">
            <span class="catalog-state__icon catalog-state__icon--error"><svg class="ui-icon"><use href="#ui-spinner"></use></svg></span>
            <h2 class="catalog-state__title">Не получилось загрузить товары</h2>
            <p class="catalog-state__text">Проверьте интернет и попробуйте ещё раз. Колесо и сезоны работают, товары подгрузятся.</p>
            <a class="catalog-state__button catalog-state__button--filled" href="/?season=autumn">ПОВТОРИТЬ</a>
        </div>`,
        'error',
    );
}

function extractCards(html: string): string[] {
    return html.match(/<li\s+class="catalog-card[\s\S]*?<\/li>/g) ?? [];
}

function carouselMarkup(cards: string[]): string {
    return columnShell(
        `<div class="catalog-carousel">
            <ul class="catalog-carousel__track" id="catalog-track" tabindex="0" role="group" aria-label="Товары сезона">
                ${cards.join('')}
            </ul>
            <div class="catalog-carousel__island" data-island="catalog-carousel" data-props='{"track_id":"catalog-track"}'></div>
        </div>`,
    );
}

test.describe('серверный HTML колонки', () => {
    test('осенняя колонка показывает восемь карточек с полями товара', async ({ page }) => {
        await page.goto(AUTUMN);

        await expect(page.locator(CARD)).toHaveCount(8);
        await expect(page.locator('#catalog-column')).toHaveAttribute('data-state', 'ready');

        const names = await cardNames(page);

        expect(names[0]).toBe('Антоновка');
        expect(names[7]).toBe('Сбор «Усадебный»');
        await expect(page.locator(CARD).first().locator('.catalog-card__overline')).toHaveText(
            'Сад · 2–10 октября',
        );
        await expect(page.locator(CARD).first().locator('.catalog-card__pack')).toHaveText(
            'ящик 5 кг',
        );
        await expect(page.locator(CARD).first().locator('.catalog-card__price')).toHaveText(
            '650 ₽',
        );
        await expect(page.locator(CARD).nth(4).locator('.catalog-card__price')).toHaveText(
            '120 ₽/кг',
        );
    });

    test('девятый товар и товар вне наличия не попадают в колонку', async ({ page }) => {
        await page.goto(AUTUMN);

        await expect(page.getByText('Мята', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Картофель', { exact: true })).toHaveCount(0);
        await expect(page.locator('.catalog-card--out')).toHaveCount(0);
    });

    test('статусы наличия показаны на зимнем сезоне', async ({ page }) => {
        await page.goto('/?season=winter');

        await expect(page.locator('.catalog-card__badge--few')).toHaveCount(1);
        await expect(page.locator('.catalog-card__badge--few')).toHaveText('осталось 3');
        await expect(page.locator('.catalog-card__badge--preorder')).toHaveCount(1);
        await expect(page.locator('.catalog-card__badge--preorder')).toHaveText('предзаказ');
    });

    test('товар в наличии не показывает бейдж статуса', async ({ page }) => {
        await page.goto(AUTUMN);

        await expect(page.locator('.catalog-card__badge')).toHaveCount(0);
        await expect(page.locator('[data-status="in_stock"]')).toHaveCount(8);
    });

    test('полоса «Дальше» показывает следующий сезон и замыкает цепочку', async ({ page }) => {
        const expected: Array<[string, string]> = [
            ['spring', 'Дальше — лето.'],
            ['summer', 'Дальше — осень.'],
            ['autumn', 'Дальше — зима.'],
            ['winter', 'Дальше — весна.'],
        ];

        for (const [slug, label] of expected) {
            await page.goto(`/?season=${slug}`);

            const band = page.locator('.catalog-next');

            await expect(band, slug).toBeVisible();
            await expect(band.locator('.catalog-next__text'), slug).toContainText(label);
            await expect(band, slug).toHaveAttribute('href', /\/preorder$/);
            await expect(band.locator('.catalog-next__icon svg'), slug).toBeVisible();
            await expect(band.locator('.catalog-next__cta'), slug).toHaveText('ПРЕДЗАКАЗ →');
        }
    });
});

test.describe('состояния колонки', () => {
    test('пустой сезон показывает текст сезона и кнопку к соседнему сезону', async ({ page }) => {
        await interceptDocument(page, (html) => replaceColumn(html, emptyMarkup()));
        await page.goto(AUTUMN);

        await expect(page.locator('.catalog-state--empty')).toBeVisible();
        await expect(page.locator('.catalog-state__text')).toContainText(
            'Урожай ещё не собран. Загляните через пару недель.',
        );
        await expect(page.locator('.catalog-state__button')).toHaveText('ПОКАЗАТЬ ВЕСНУ →');
        await expect(page.locator('.catalog-state__button')).toHaveAttribute(
            'href',
            '/?season=spring',
        );
        await expect(page.locator('.catalog-next')).toHaveCount(0);
        await expect(page.locator(CARD)).toHaveCount(0);
        await expect(page.locator('.catalog-state__icon svg')).toBeVisible();
    });

    test('загрузка показывает скелетоны заголовка, лида и восьми карточек', async ({ page }) => {
        await interceptDocument(page, (html) => replaceColumn(html, loadingMarkup()));
        await page.goto(AUTUMN);

        await expect(page.locator('.catalog-skeleton')).toBeVisible();
        await expect(page.locator('.catalog-skeleton__card')).toHaveCount(8);
        await expect(page.locator('.catalog-skeleton__title')).toHaveCount(2);
        await expect(page.locator('.catalog-skeleton__lead')).toHaveCount(2);
    });

    test('ошибка показывает экран с кнопкой повтора на текущий адрес', async ({ page }) => {
        await interceptDocument(page, (html) => replaceColumn(html, errorMarkup()));
        await page.goto(AUTUMN);

        await expect(page.locator('.catalog-state--error')).toBeVisible();
        await expect(page.locator('.catalog-state__title')).toHaveText(
            'Не получилось загрузить товары',
        );

        const retry = page.locator('.catalog-state__button');

        await expect(retry).toHaveText('ПОВТОРИТЬ');
        await expect(retry).toHaveAttribute('href', '/?season=autumn');
        await expect(page.locator('.catalog-next')).toHaveCount(0);
    });
});

test.describe('вёрстка колонки', () => {
    test('сетка два ряда по четыре карточки', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openColumn(page);

        const boxes = await page.locator(CARD).evaluateAll((elements) =>
            elements.map((element) => {
                const rect = element.getBoundingClientRect();

                return { x: Math.round(rect.x), y: Math.round(rect.y) };
            }),
        );

        const rows = new Set(boxes.map((box) => box.y));
        const columns = new Set(boxes.map((box) => box.x));

        expect(rows.size).toBe(2);
        expect(columns.size).toBe(4);
    });

    test('шесть карточек не растягиваются на всю ширину', async ({ page }) => {
        await interceptDocument(page, (html) => {
            const cards = extractCards(html).slice(0, 6);

            return replaceColumn(
                html,
                columnShell(`<ul class="card-grid catalog-column__grid">${cards.join('')}</ul>`),
            );
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        await expect(page.locator(CARD)).toHaveCount(6);

        const widths = await page
            .locator(CARD)
            .evaluateAll((elements) =>
                elements.map((element) => Math.round(element.getBoundingClientRect().width)),
            );

        expect(new Set(widths).size).toBe(1);
        expect(widths[0]).toBeLessThan(200);
    });

    test('надзаголовок обрезается и не переполняет карточку', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openColumn(page);

        const metrics = await page
            .locator('.catalog-card__overline')
            .first()
            .evaluate((element) => {
                const style = getComputedStyle(element);

                return {
                    overflow: element.scrollWidth > element.clientWidth,
                    whiteSpace: style.whiteSpace,
                    textOverflow: style.textOverflow,
                };
            });

        expect(metrics.whiteSpace).toBe('nowrap');
        expect(metrics.textOverflow).toBe('ellipsis');
        expect(typeof metrics.overflow).toBe('boolean');

        const cardOverflow = await page
            .locator(CARD)
            .evaluateAll((elements) =>
                elements.map((element) => element.scrollWidth - element.clientWidth),
            );

        expect(cardOverflow.every((value) => value <= 1)).toBe(true);
    });

    test('верх карточек в ряду выровнен при разных статусах', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openColumn(page, '/?season=winter');

        const tops = await page
            .locator(CARD)
            .evaluateAll((elements) =>
                elements
                    .slice(0, 4)
                    .map((element) => Math.round(element.getBoundingClientRect().top)),
            );

        expect(new Set(tops).size).toBe(1);

        const statusHeights = await page
            .locator('.catalog-card__status')
            .evaluateAll((elements) =>
                elements
                    .slice(0, 4)
                    .map((element) => Math.round(element.getBoundingClientRect().height)),
            );

        expect(new Set(statusHeights).size).toBe(1);
    });

    test('полоса «Дальше» занимает всю ширину колонки', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openColumn(page);

        const widths = await page.evaluate(() => {
            const column = document.getElementById('catalog-column');
            const band = document.querySelector('.catalog-next');

            if (column === null || band === null) {
                return null;
            }

            return {
                column: Math.round(column.getBoundingClientRect().width),
                band: Math.round(band.getBoundingClientRect().width),
            };
        });

        expect(widths).not.toBeNull();
        expect((widths as { band: number }).band).toBeCloseTo(
            (widths as { column: number }).column,
            -1,
        );
    });
});

test.describe('адаптивность', () => {
    test('на 1199 px карточки скрыты, заголовок и лид остаются', async ({ page }) => {
        await page.setViewportSize({ width: 1199, height: 900 });
        await page.goto(AUTUMN);

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('.catalog-header__lead')).toBeVisible();
        await expect(page.locator(CARD).first()).toBeHidden();
        await expect(page.locator('.catalog-next')).toBeHidden();
    });

    for (const viewport of [
        { width: 1200, height: 680 },
        { width: 1440, height: 900 },
        { width: 1920, height: 1080 },
    ]) {
        test(`на ${viewport.width}×${viewport.height} нет горизонтальной прокрутки`, async ({
            page,
        }) => {
            await page.setViewportSize(viewport);
            await page.goto(AUTUMN);

            await expect(page.locator(CARD).first()).toBeVisible();

            const metrics = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
            }));

            expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
        });
    }
});

test.describe('hover и reduced motion', () => {
    test('при уменьшенном движении карточка не сдвигается', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        const card = page.locator(CARD).first();

        await card.hover();

        const styles = await card.evaluate((element) => {
            const style = getComputedStyle(element);

            return {
                transform: style.transform,
                transitionProperty: style.transitionProperty,
                animationName: style.animationName,
            };
        });

        expect(styles.transform).toBe('none');
        expect(styles.transitionProperty).toBe('opacity');
        expect(styles.animationName).toBe('none');
    });

    test('наведение поднимает карточку и увеличивает иллюстрацию', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        const card = page.locator(CARD).first();

        await card.hover();
        await page.waitForTimeout(400);

        const transform = await card.evaluate((element) => getComputedStyle(element).transform);

        expect(transform).not.toBe('none');
    });
});

test.describe('карусель', () => {
    test('девять карточек включают карусель со стрелками и прогрессом', async ({ page }) => {
        await interceptDocument(page, (html) => {
            const cards = extractCards(html);

            return replaceColumn(html, carouselMarkup([...cards, cards[0] ?? '']));
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        await expect(page.locator(CARD)).toHaveCount(9);
        await expect(page.locator('.catalog-carousel__track')).toBeVisible();
        await expect(page.locator('.catalog-carousel__arrow')).toHaveCount(2);
        await expect(page.locator('[data-carousel-prev]')).toHaveAttribute('aria-disabled', 'true');
        await expect(page.locator('[data-carousel-next]')).toHaveAttribute(
            'aria-disabled',
            'false',
        );
        await expect(page.locator('[data-carousel-progress]')).toHaveAttribute(
            'style',
            /width: 0%/,
        );
    });

    test('стрелка вперёд открывает следующую группу и двигает прогресс', async ({ page }) => {
        await interceptDocument(page, (html) => {
            const cards = extractCards(html);

            return replaceColumn(html, carouselMarkup([...cards, cards[0] ?? '']));
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        const track = page.locator('#catalog-track');
        const before = await track.evaluate((element) => element.scrollLeft);

        await page.locator('[data-carousel-next]').click();
        await expect
            .poll(async () => track.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(before);

        await expect(page.locator('[data-carousel-prev]')).toHaveAttribute(
            'aria-disabled',
            'false',
        );

        const progress = await page
            .locator('[data-carousel-progress]')
            .evaluate((element) => Number.parseFloat((element as HTMLElement).style.width));

        expect(progress).toBeGreaterThan(0);
    });

    test('в конце трека стрелка вперёд становится неактивной', async ({ page }) => {
        await interceptDocument(page, (html) => {
            const cards = extractCards(html);

            return replaceColumn(html, carouselMarkup([...cards, cards[0] ?? '']));
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        const track = page.locator('#catalog-track');

        await track.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
        });

        await expect(page.locator('[data-carousel-next]')).toHaveAttribute('aria-disabled', 'true');
        await expect(page.locator('[data-carousel-progress]')).toHaveAttribute(
            'style',
            /width: 100%/,
        );
    });

    test('остров не меняет серверную разметку карточек', async ({ page }) => {
        await interceptDocument(page, (html) => {
            const cards = extractCards(html);

            return replaceColumn(html, carouselMarkup([...cards, cards[0] ?? '']));
        });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        const before = await page.locator('#catalog-track').innerHTML();

        await page.locator('[data-carousel-next]').click();
        await page.waitForTimeout(400);

        const after = await page.locator('#catalog-track').innerHTML();

        expect(after).toBe(before);
    });

    test('без переполнения стрелки и полоса скрыты', async ({ page }) => {
        await interceptDocument(page, (html) =>
            replaceColumn(html, carouselMarkup(extractCards(html).slice(0, 4))),
        );
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(AUTUMN);

        await expect(page.locator('[data-carousel-controls]')).toBeHidden();
    });
});

test.describe('связка колеса и колонки', () => {
    test('колонка ссылается на активную вкладку колеса', async ({ page }) => {
        await page.goto('/?season=winter');

        await expect(page.locator('#catalog-column')).toHaveAttribute(
            'aria-labelledby',
            'season-tab-winter',
        );
        await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute(
            'id',
            'season-tab-winter',
        );
        await expect(page.locator('#season-tab-winter')).toHaveAttribute(
            'aria-controls',
            'catalog-column',
        );
    });

    test('без JavaScript идентификаторы сезонов не дублируются', async ({ browser }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        await page.goto('/?season=winter');

        const ids = await page
            .locator('[id^="season-tab-"]')
            .evaluateAll((elements) => elements.map((element) => element.id));

        expect(new Set(ids).size).toBe(ids.length);
        await expect(page.locator('#catalog-column')).toHaveAttribute(
            'aria-labelledby',
            'season-tab-winter',
        );

        await context.close();
    });
});

test.describe('смена сезона', () => {
    test('выход запускается сразу, а вход проигрывается на новой странице', async ({ page }) => {
        await page.addInitScript(() => {
            window.addEventListener(
                'click',
                () => {
                    window.sessionStorage.setItem('test:clickedAt', String(Date.now()));
                },
                { capture: true, once: true },
            );

            document.addEventListener('DOMContentLoaded', () => {
                const column = document.getElementById('catalog-column');

                if (column === null) {
                    return;
                }

                new MutationObserver(() => {
                    if (!column.hasAttribute('data-leaving')) {
                        return;
                    }

                    const card = document.querySelector('.catalog-card');

                    window.sessionStorage.setItem(
                        'test:leaving',
                        JSON.stringify({
                            attribute: true,
                            animation: card === null ? '' : getComputedStyle(card).animationName,
                            flag: window.sessionStorage.getItem('catalog-column:transition'),
                        }),
                    );
                }).observe(column, { attributes: true });
            });
        });

        await page.goto(AUTUMN);

        let requestedAt = 0;

        await page.route('**/?season=winter*', async (route) => {
            if (route.request().resourceType() !== 'document') {
                await route.continue();

                return;
            }

            requestedAt = Date.now();

            const response = await route.fetch();
            const body = await response.text();

            await new Promise((resolve) => setTimeout(resolve, 400));

            await route.fulfill({ response, body });
        });

        await page.locator('[data-season-label="winter"]').click();
        await page.waitForURL('**/?season=winter');

        const state = await page.evaluate(() => ({
            leaving: window.sessionStorage.getItem('test:leaving'),
            clickedAt: Number(window.sessionStorage.getItem('test:clickedAt')),
            entrance: document.documentElement.dataset.entrance ?? '',
            flag: window.sessionStorage.getItem('catalog-column:transition'),
        }));

        expect(state.leaving).not.toBeNull();

        const leaving = JSON.parse(state.leaving as string) as {
            attribute: boolean;
            animation: string;
            flag: string | null;
        };

        expect(leaving.attribute).toBe(true);
        expect(leaving.animation).toBe('catalog-card-out');
        expect(leaving.flag).toBe('1');
        expect(state.entrance).toBe('on');
        expect(state.flag).toBeNull();

        expect(state.clickedAt).toBeGreaterThan(0);
        expect(requestedAt - state.clickedAt).toBeLessThan(400);
    });

    test('вход проигрывается при первом заходе и не повторяется', async ({ page }) => {
        await page.goto(AUTUMN);

        await expect(page.locator('html')).toHaveAttribute('data-entrance', 'on');

        await page.reload();

        await expect(page.locator('html')).not.toHaveAttribute('data-entrance', 'on');
    });

    test('при уменьшенном движении вход не запускается', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(AUTUMN);

        await expect(page.locator('html')).not.toHaveAttribute('data-entrance', 'on');
    });

    test('карточки входят по одной с шагом из токена', async ({ page }) => {
        await page.goto(AUTUMN);

        const delays = await page
            .locator(CARD)
            .evaluateAll((elements) =>
                elements.map((element) => getComputedStyle(element).animationDelay),
            );

        expect(new Set(delays).size).toBeGreaterThan(1);
        expect(delays[0]).not.toBe(delays[1]);
    });

    test('CTA пустого сезона ведёт на соседний сезон через модуль навигации', async ({ page }) => {
        await interceptDocument(page, (html) => replaceColumn(html, emptyMarkup()));
        await page.goto(AUTUMN);

        await page.locator('.catalog-state__button').click();
        await page.waitForURL('**/?season=spring');

        await expect(page.locator('body')).toHaveAttribute('data-season', 'spring');
        await expect(page.locator('html')).toHaveAttribute('data-entrance', 'on');
    });
});
