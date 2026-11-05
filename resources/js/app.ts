import { createApp, type Component } from 'vue';
import type { ZodType } from 'zod';
import CatalogCarousel from '@/islands/CatalogCarousel.vue';
import SeasonWheel from '@/islands/SeasonWheel.vue';
import { initSeasonNavigation } from '@/lib/season-navigation';
import { catalogCarouselSchema } from '@/types/catalog-carousel';
import { seasonWheelSchema } from '@/types/season-wheel';

interface IslandDefinition {
    component: Component;
    schema?: ZodType;
}

const islands: Record<string, IslandDefinition> = {
    'season-wheel': {
        component: SeasonWheel,
        schema: seasonWheelSchema,
    },
    'catalog-carousel': {
        component: CatalogCarousel,
        schema: catalogCarouselSchema,
    },
};

function readProps(element: HTMLElement): Record<string, unknown> | null {
    const rawProps = element.dataset.props;

    if (rawProps === undefined) {
        return {};
    }

    try {
        const parsed: unknown = JSON.parse(rawProps);

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            console.error(
                `[islands] Данные острова "${element.dataset.island}" должны быть JSON-объектом.`,
                parsed,
            );

            return null;
        }

        return parsed as Record<string, unknown>;
    } catch (error) {
        console.error(
            `[islands] Не удалось разобрать данные острова "${element.dataset.island}".`,
            error,
        );

        return null;
    }
}

function mountIslands(): void {
    document.querySelectorAll<HTMLElement>('[data-island]').forEach((element) => {
        const name = element.dataset.island;

        if (name === undefined || name === '') {
            console.warn('[islands] У контейнера не указано имя острова.');

            return;
        }

        const definition = islands[name];

        if (definition === undefined) {
            console.warn(`[islands] Остров "${name}" не зарегистрирован.`);

            return;
        }

        const props = readProps(element);

        if (props === null) {
            return;
        }

        const parsed = definition.schema?.safeParse(props) ?? {
            success: true as const,
            data: props,
        };

        if (!parsed.success) {
            console.error(`[islands] Данные острова "${name}" не прошли проверку.`, parsed.error);

            return;
        }

        try {
            const rootProps = { data: parsed.data };

            createApp(definition.component, rootProps).mount(element);
        } catch (error) {
            console.error(`[islands] Не удалось смонтировать остров "${name}".`, error);
        }
    });
}

function start(): void {
    initSeasonNavigation();
    mountIslands();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
    start();
}
