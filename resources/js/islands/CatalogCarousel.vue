<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { CatalogCarouselProps } from '@/types/catalog-carousel';

/**
 * Остров-контроллер карусели: серверный трек с карточками не перерисовывается,
 * остров только прокручивает его и показывает стрелки с полосой прогресса.
 */
export default defineComponent({
    name: 'CatalogCarousel',
    props: {
        data: {
            type: Object as PropType<CatalogCarouselProps>,
            required: true,
        },
    },
    data() {
        return {
            track: null as HTMLElement | null,
            scrollLeft: 0,
            scrollWidth: 0,
            clientWidth: 0,
            resizeObserver: null as ResizeObserver | null,
        };
    },
    computed: {
        overflow(): boolean {
            return this.scrollWidth - this.clientWidth > 1;
        },
        atStart(): boolean {
            return this.scrollLeft <= 1;
        },
        atEnd(): boolean {
            return this.scrollLeft >= this.scrollWidth - this.clientWidth - 1;
        },
        progress(): number {
            const maxScroll = this.scrollWidth - this.clientWidth;

            if (maxScroll <= 0) {
                return 0;
            }

            return Math.min(Math.max((this.scrollLeft / maxScroll) * 100, 0), 100);
        },
    },
    mounted() {
        const track = document.getElementById(this.data.track_id);

        if (track === null) {
            console.error(`[catalog-carousel] Не найден трек карусели "${this.data.track_id}".`);

            return;
        }

        this.track = track;
        track.addEventListener('scroll', this.updateGeometry, { passive: true });

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.updateGeometry);
            this.resizeObserver.observe(track);
        }

        window.addEventListener('resize', this.updateGeometry);
        this.updateGeometry();
    },
    beforeUnmount() {
        this.track?.removeEventListener('scroll', this.updateGeometry);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.removeEventListener('resize', this.updateGeometry);
    },
    methods: {
        updateGeometry(): void {
            const track = this.track;

            if (track === null) {
                return;
            }

            this.scrollLeft = track.scrollLeft;
            this.scrollWidth = track.scrollWidth;
            this.clientWidth = track.clientWidth;
        },
        prefersReducedMotion(): boolean {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        scrollToPosition(left: number): void {
            const track = this.track;

            if (track === null) {
                return;
            }

            track.scrollTo({
                left,
                behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
            });
        },
        scrollByPage(direction: -1 | 1): void {
            const track = this.track;

            if (track === null) {
                return;
            }

            const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
            const step = track.clientWidth * direction;
            const next = Math.min(Math.max(track.scrollLeft + step, 0), maxScroll);

            this.scrollToPosition(next);
        },
        previous(): void {
            this.scrollByPage(-1);
        },
        next(): void {
            this.scrollByPage(1);
        },
    },
});
</script>

<template>
    <div
        class="catalog-carousel__controls"
        :class="{ 'catalog-carousel__controls--inactive': !overflow }"
        data-carousel-controls
    >
        <button
            type="button"
            class="catalog-carousel__arrow"
            aria-label="Предыдущие товары"
            :aria-disabled="atStart ? 'true' : 'false'"
            data-carousel-prev
            @click="previous"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M14.5 6.5 9 12l5.5 5.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </button>

        <div class="catalog-carousel__progress" aria-hidden="true">
            <div
                class="catalog-carousel__progress-bar"
                :style="{ width: `${progress}%` }"
                data-carousel-progress
            ></div>
        </div>

        <button
            type="button"
            class="catalog-carousel__arrow"
            aria-label="Следующие товары"
            :aria-disabled="atEnd ? 'true' : 'false'"
            data-carousel-next
            @click="next"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M9.5 6.5 15 12l-5.5 5.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </button>
    </div>
</template>
