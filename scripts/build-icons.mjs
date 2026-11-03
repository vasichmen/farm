import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { assertCount, cleanSvg, writeFileEnsured } from './lib/svg.mjs';

/**
 * Собирает из очищенных resources/assets:
 * - 29 Blade-партиалов товарных иконок с inline <svg>;
 * - JSON-модуль с внутренностями тех же иконок для Vue-острова колеса;
 * - один спрайт UI-иконок (35 <symbol>);
 * - контурные логотипы и favicon-набор в public/.
 *
 * Команда детерминирована: повторный запуск не меняет содержимое файлов.
 */

const projectRoot = process.cwd();
const assetsDir = path.join(projectRoot, 'resources', 'assets');
const generatedDir = path.join(projectRoot, 'resources', 'views', 'generated');
const generatedJsDir = path.join(projectRoot, 'resources', 'js', 'generated');
const publicDir = path.join(projectRoot, 'public');

const PRODUCTS_COUNT = 29;
const UI_ICONS_COUNT = 35;

const FORBIDDEN_OUTPUT = [/c2pa/i, /<metadata[\s>]/i, /xmlns:(?!xlink)[a-z-]+/i];

function assertClean(label, content) {
    for (const pattern of FORBIDDEN_OUTPUT) {
        if (pattern.test(content)) {
            throw new Error(`В ${label} остались служебные метаданные (${pattern}).`);
        }
    }
}

function splitSvg(svg) {
    const match = svg.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/);

    if (match === null) {
        throw new Error('Не удалось разобрать корневой <svg>.');
    }

    return { attributes: match[1].trim(), inner: match[2].trim() };
}

function readAttribute(attributes, name) {
    const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`));

    return match?.[1] ?? null;
}

async function listSvgFiles(directory) {
    const entries = await readdir(directory);

    return entries.filter((entry) => entry.endsWith('.svg')).sort();
}

async function buildProductIcons() {
    const sourceDir = path.join(assetsDir, 'icons', 'products');
    const targetDir = path.join(generatedDir, 'product-icons');
    const names = await listSvgFiles(sourceDir);

    assertCount('Товарные иконки', names, PRODUCTS_COUNT);
    await rm(targetDir, { recursive: true, force: true });

    const iconModule = {};

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, name));
        const { attributes, inner } = splitSvg(svg);
        const viewBox = readAttribute(attributes, 'viewBox') ?? '0 0 100 100';
        const width = readAttribute(attributes, 'width') ?? '100';
        const height = readAttribute(attributes, 'height') ?? '100';

        const partial = [
            `<svg {{ $attributes }} xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">`,
            inner,
            '</svg>',
            '',
        ].join('\n');

        assertClean(`product-icons/${name}`, partial);
        await writeFileEnsured(path.join(targetDir, name.replace(/\.svg$/, '.blade.php')), partial);

        iconModule[name.replace(/^product-/, '').replace(/\.svg$/, '')] = inner;
    }

    const iconModuleContent = `${JSON.stringify(iconModule, null, 2)}\n`;

    assertClean('generated/product-icons.json', iconModuleContent);
    await writeFileEnsured(path.join(generatedJsDir, 'product-icons.json'), iconModuleContent);

    return names;
}

async function buildUiSprite() {
    const sourceDir = path.join(assetsDir, 'ui-icons');
    const names = await listSvgFiles(sourceDir);

    assertCount('UI-иконки', names, UI_ICONS_COUNT);

    const symbols = [];

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, name));
        const { attributes, inner } = splitSvg(svg);
        const id = name.replace(/\.svg$/, '');

        symbols.push(
            `<symbol id="ui-${id}" viewBox="${readAttribute(attributes, 'viewBox') ?? '0 0 24 24'}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">${inner}</symbol>`,
        );
    }

    const sprite = [
        '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-ui-sprite style="display: none">',
        ...symbols,
        '</svg>',
        '',
    ].join('\n');

    assertClean('generated/ui-sprite.blade.php', sprite);
    await writeFileEnsured(path.join(generatedDir, 'ui-sprite.blade.php'), sprite);

    return names;
}

async function buildLogos() {
    const sourceDir = path.join(assetsDir, 'logo');
    const targetDir = path.join(publicDir, 'brand');
    const names = await listSvgFiles(sourceDir);

    assertCount('Контурные логотипы', names, 2);
    await mkdir(targetDir, { recursive: true });

    for (const name of names) {
        const svg = await cleanSvg(path.join(sourceDir, name));
        const normalized = svg.replace(/<svg\b[^>]*>/, (tag) => {
            const cleaned = tag
                .replace(/\swidth="[^"]*"/, '')
                .replace(/\sheight="[^"]*"/, '')
                .replace(/\sviewBox="[^"]*"/, '');

            return cleaned.replace(
                '<svg',
                '<svg width="390" height="104.88" viewBox="0 0 390 104.88"',
            );
        });

        assertClean(`public/brand/${name}`, normalized);
        await writeFileEnsured(path.join(targetDir, name), normalized);
    }

    return names;
}

async function buildFavicon() {
    const sourceDir = path.join(assetsDir, 'favicon');
    const names = (await readdir(sourceDir)).sort();
    const files = [
        'apple-touch-icon.png',
        'icon-16.png',
        'icon-32.png',
        'icon-48.png',
        'icon-192.png',
        'icon-512.png',
        'maskable-192.png',
        'maskable-512.png',
        'favicon.svg',
        'site.webmanifest',
    ];

    for (const name of files) {
        if (!names.includes(name)) {
            throw new Error(`В resources/assets/favicon нет ${name}.`);
        }
    }

    for (const name of files) {
        await copyFile(path.join(sourceDir, name), path.join(publicDir, name));
    }

    // Пустой favicon.ico из каркаса больше не нужен: favicon задаётся SVG/PNG.
    await rm(path.join(publicDir, 'favicon.ico'), { force: true });

    return files;
}

async function main() {
    const products = await buildProductIcons();
    const uiIcons = await buildUiSprite();
    const logos = await buildLogos();
    const favicon = await buildFavicon();

    console.log(
        `Готово: ${products.length} партиалов и записей JSON, ${uiIcons.length} символов спрайта, ` +
            `${logos.length} логотипа, ${favicon.length} файлов favicon.`,
    );
}

await main();
