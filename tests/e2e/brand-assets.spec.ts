import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const projectRoot = process.cwd();

async function walk(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await walk(fullPath)));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function symbolMarkup(sprite: string, id: string): string {
    const match = sprite.match(new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)</symbol>`));

    if (match === null) {
        throw new Error(`В спрайте нет символа ${id}.`);
    }

    return match[1].trim();
}

function svgInner(svg: string): string {
    return svg
        .replace(/^<svg\b[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .trim();
}

test('все 29 товарных иконок и 35 UI-символов собраны', async () => {
    const productDir = path.join(projectRoot, 'resources/views/generated/product-icons');
    const productFiles = (await readdir(productDir)).filter((file) => file.endsWith('.blade.php'));
    const sprite = await readFile(
        path.join(projectRoot, 'resources/views/generated/ui-sprite.blade.php'),
        'utf8',
    );
    const symbols = sprite.match(/<symbol\b[^>]*>/g) ?? [];

    expect(productFiles).toHaveLength(29);
    expect(symbols).toHaveLength(35);
});

test('UI-символы имеют единую геометрию и наследуют цвет', async () => {
    const sprite = await readFile(
        path.join(projectRoot, 'resources/views/generated/ui-sprite.blade.php'),
        'utf8',
    );
    const symbols = sprite.match(/<symbol\b[^>]*>/g) ?? [];

    expect(symbols.length).toBeGreaterThan(0);

    for (const symbol of symbols) {
        expect(symbol).toContain('viewBox="0 0 24 24"');
        expect(symbol).toContain('stroke-width="1.8"');
        expect(symbol).toContain('stroke="currentColor"');
    }
});

test('иконка VK совпадает с эталонным ассетом handoff', async () => {
    const source = await readFile(
        path.join(projectRoot, 'resources/assets/ui-icons/vk.svg'),
        'utf8',
    );
    const sprite = await readFile(
        path.join(projectRoot, 'resources/views/generated/ui-sprite.blade.php'),
        'utf8',
    );

    expect(symbolMarkup(sprite, 'ui-vk')).toBe(svgInner(source));
});

test('контурные логотипы приведены к холсту 390 × 104.88', async () => {
    const files = ['logo-lockup-on-dark-outlined.svg', 'logo-lockup-on-light-outlined.svg'];

    for (const file of files) {
        const svg = await readFile(path.join(projectRoot, 'public/brand', file), 'utf8');

        expect(svg, file).toContain('width="390"');
        expect(svg, file).toContain('height="104.88"');
        expect(svg, file).toContain('viewBox="0 0 390 104.88"');
    }
});

test('favicon и webmanifest доступны с корня и подключены в head', async ({ page, request }) => {
    const files = [
        'favicon.svg',
        'icon-16.png',
        'icon-32.png',
        'icon-48.png',
        'icon-192.png',
        'icon-512.png',
        'apple-touch-icon.png',
        'maskable-192.png',
        'maskable-512.png',
        'site.webmanifest',
    ];

    for (const file of files) {
        const response = await request.get(`/${file}`);

        expect(response.status(), file).toBe(200);
    }

    await page.goto('/');

    const head = await page.evaluate(() => ({
        svgIcon: document
            .querySelector('link[rel="icon"][type="image/svg+xml"]')
            ?.getAttribute('href'),
        png32: document.querySelector('link[rel="icon"][sizes="32x32"]')?.getAttribute('href'),
        apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
        manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
        themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
        sprites: document.querySelectorAll('[data-ui-sprite]').length,
    }));

    expect(head.svgIcon).toContain('favicon.svg');
    expect(head.png32).toContain('icon-32.png');
    expect(head.apple).toContain('apple-touch-icon.png');
    expect(head.manifest).toContain('site.webmanifest');
    expect(head.themeColor).toBe('#22352A');
    expect(head.sprites).toBe(1);
});

test('webmanifest содержит иконки 192/512 и maskable 512', async ({ request }) => {
    const response = await request.get('/site.webmanifest');
    const manifest = await response.json();

    expect(manifest.theme_color).toBe('#22352A');

    const icons = manifest.icons as Array<{ src: string; sizes: string; purpose?: string }>;

    expect(icons.some((icon) => icon.sizes === '192x192')).toBe(true);
    expect(icons.some((icon) => icon.sizes === '512x512' && icon.purpose !== 'maskable')).toBe(
        true,
    );
    expect(icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(
        true,
    );
});

test('в ресурсах и public нет ссылок на варианты on-disc', async () => {
    const files = [
        ...(await walk(path.join(projectRoot, 'resources'))),
        ...(await walk(path.join(projectRoot, 'public'))),
    ];
    const binary = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf)$/i;
    const offenders: string[] = [];

    for (const file of files) {
        if (binary.test(file)) {
            continue;
        }

        const content = await readFile(file, 'utf8');

        if (content.includes('-on-disc.svg') || path.basename(file).includes('-on-disc.svg')) {
            offenders.push(path.relative(projectRoot, file));
        }
    }

    expect(offenders).toEqual([]);
});

test('опубликованные SVG очищены от C2PA и метаданных', async () => {
    const roots = ['public', 'resources/assets', 'resources/views/generated'];
    const files = (await Promise.all(roots.map((root) => walk(path.join(projectRoot, root)))))
        .flat()
        .filter((file) => file.endsWith('.svg') || file.endsWith('.blade.php'));

    for (const file of files) {
        const content = await readFile(file, 'utf8');

        expect(content, file).not.toMatch(/c2pa/i);
        expect(content, file).not.toMatch(/<metadata[\s>]/i);

        const namespaces = content.match(/xmlns:[a-z-]+/gi) ?? [];

        for (const namespace of namespaces) {
            expect(namespace, file).toBe('xmlns:xlink');
        }
    }
});
