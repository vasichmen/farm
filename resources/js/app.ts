import { createApp, type Component } from 'vue';
import ScaffoldProbe from '@/islands/ScaffoldProbe.vue';

const islands: Record<string, Component> = {
    'scaffold-probe': ScaffoldProbe,
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

        const component = islands[name];

        if (component === undefined) {
            console.warn(`[islands] Остров "${name}" не зарегистрирован.`);

            return;
        }

        const props = readProps(element);

        if (props === null) {
            return;
        }

        try {
            createApp(component, props).mount(element);
        } catch (error) {
            console.error(`[islands] Не удалось смонтировать остров "${name}".`, error);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountIslands, { once: true });
} else {
    mountIslands();
}
