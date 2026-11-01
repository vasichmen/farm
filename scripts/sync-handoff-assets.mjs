import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertCount, cleanSvg, writeFileEnsured } from './lib/svg.mjs';

/**
 * Локальная команда: забирает иконки, логотип и favicon из handoff, очищает SVG
 * от C2PA/метаданных и раскладывает копии в resources/assets.
 *
 * docs/handoff в git нет, поэтому результат этой команды коммитится.
 */

const projectRoot = process.cwd();
const handoffDir =
    process.env.HANDOFF_DIR ?? path.join(projectRoot, 'docs', 'handoff', '03-assets');
const assetsDir = path.join(projectRoot, 'resources', 'assets');

const PRODUCTS_COUNT = 29;
const UI_ICONS_COUNT = 35;

async function readSvgNames(directory) {
    let entries;

    try {
        entries = await readdir(directory);
    } catch {
        throw new Error(
            `Не найден каталог handoff: ${directory}. ` +
                'Укажите путь через HANDOFF_DIR или положите docs/handoff/03-assets на место.',
        );
    }

    return entries.filter((entry) => entry.endsWith('.svg')).sort();
}

async function ensureHandoff() {
    try {
        await readdir(handoffDir);
    } catch {
        throw new Error(
            `Не найден каталог handoff: ${handoffDir}. ` +
                'Укажите путь через HANDOFF_DIR или положите docs/handoff/03-assets на место.',
        );
    }
}

async function syncProductIcons() {
    const sourceDir = path.join(handoffDir, 'icons');
    const targetDir = path.join(assetsDir, 'icons', 'products');
    const names = (await readSvgNames(sourceDir))
        .filter((name) => !name.endsWith('-on-disc.svg'))
        .map((name) => name.replace(/^product-/, '').replace(/\.svg$/, ''));

    assertCount('Товарные иконки', names, PRODUCTS_COUNT);

    await rm(targetDir, { recursive: true, force: true });

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, `product-${name}.svg`));

        await writeFileEnsured(path.join(targetDir, `${name}.svg`), svg);
    }

    return names;
}

async function syncUiIcons() {
    const sourceDir = path.join(handoffDir, 'ui-icons');
    const targetDir = path.join(assetsDir, 'ui-icons');
    const names = (await readSvgNames(sourceDir)).map((name) =>
        name.replace(/^ui-/, '').replace(/\.svg$/, ''),
    );

    assertCount('UI-иконки', names, UI_ICONS_COUNT);

    await rm(targetDir, { recursive: true, force: true });

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, `ui-${name}.svg`));

        await writeFileEnsured(path.join(targetDir, `${name}.svg`), svg);
    }

    return names;
}

async function syncLogo() {
    const sourceDir = path.join(handoffDir, 'logo');
    const targetDir = path.join(assetsDir, 'logo');
    const names = ['logo-lockup-on-dark-outlined.svg', 'logo-lockup-on-light-outlined.svg'];

    await rm(targetDir, { recursive: true, force: true });

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, name));

        await writeFileEnsured(path.join(targetDir, name), svg);
    }

    return names;
}

async function syncFavicon() {
    const sourceDir = path.join(handoffDir, 'favicon');
    const targetDir = path.join(assetsDir, 'favicon');
    const pngs = [
        'apple-touch-icon.png',
        'icon-16.png',
        'icon-32.png',
        'icon-48.png',
        'icon-192.png',
        'icon-512.png',
        'maskable-192.png',
        'maskable-512.png',
    ];

    await rm(targetDir, { recursive: true, force: true });
    await mkdir(targetDir, { recursive: true });

    for (const name of pngs) {
        await copyFile(path.join(sourceDir, name), path.join(targetDir, name));
    }

    const faviconSvg = await cleanSvg(path.join(sourceDir, 'favicon.svg'));

    await writeFile(path.join(targetDir, 'favicon.svg'), faviconSvg, 'utf8');
    await copyFile(
        path.join(sourceDir, 'site.webmanifest'),
        path.join(targetDir, 'site.webmanifest'),
    );

    return [...pngs, 'favicon.svg', 'site.webmanifest'];
}

async function main() {
    await ensureHandoff();

    const products = await syncProductIcons();
    const uiIcons = await syncUiIcons();
    const logos = await syncLogo();
    const favicon = await syncFavicon();

    console.log(
        `Готово: ${products.length} товарных иконок, ${uiIcons.length} UI-иконок, ` +
            `${logos.length} логотипа, ${favicon.length} файлов favicon.`,
    );
}

await main();
