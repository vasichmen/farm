import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';
import svgoConfig from '../../svgo.config.mjs';

const FORBIDDEN = [/c2pa/i, /<metadata[\s>]/i, /xmlns:(?!xlink)[a-z-]+/i];

/**
 * Прогоняет SVG через SVGO и падает, если в результате остались метаданные.
 *
 * @param {string} filePath абсолютный путь к исходному файлу
 * @returns {Promise<string>} очищенный SVG
 */
export async function cleanSvg(filePath) {
    const source = await readFile(filePath, 'utf8');
    const result = optimize(source, { path: filePath, ...svgoConfig });

    for (const pattern of FORBIDDEN) {
        if (pattern.test(result.data)) {
            throw new Error(`После SVGO в ${filePath} остались служебные метаданные (${pattern}).`);
        }
    }

    return result.data;
}

export async function writeFileEnsured(filePath, content) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
}

export function assertCount(label, items, expected) {
    if (items.length !== expected) {
        throw new Error(
            `${label}: ожидалось ${expected} файлов, найдено ${items.length}. ` +
                'Проверьте docs/handoff/03-assets и повторите синхронизацию.',
        );
    }
}
