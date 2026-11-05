<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import productIcons from '@/generated/product-icons.json';
import { navigateToSeason } from '@/lib/season-navigation';
import {
    WHEEL_ORDER,
    type SeasonWheelProps,
    type WheelProduct,
    type WheelSeason,
} from '@/types/season-wheel';

const PRODUCT_ICONS = productIcons as Record<string, string>;

const MONTHS = ['июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек', 'янв', 'фев', 'мар', 'апр', 'май'];

const SECTOR_INNER_RADIUS = 130;
const SECTOR_OUTER_RADIUS = 288;
const SECTOR_GAP = 1.2;
const SEASON_LABEL_RADIUS = 190;
const ICON_RADIUS = 252;
const ICON_STEP = 19;
const MONTH_LABEL_RADIUS = 314;
const TICK_INNER_RADIUS = 296;
const TICK_OUTER_RADIUS = 332;
const MONTH_DOT_RADIUS = 346;
const ACTIVE_DISC_DIAMETER = 50;
const INACTIVE_DISC_DIAMETER = 40;
const ICON_RATIO = 0.76;
const WHEEL_DURATION = 700;
const TOOLTIP_DELAY = 300;
const TRANSITION_KEY = 'season-wheel:transition';
const VISITED_KEY = 'season-wheel:visited';
const TRANSITION_TTL = 30000;

interface Point {
    x: number;
    y: number;
}

interface TransitionRecord {
    rotation: number;
    season: string;
    focus: boolean;
    at: number;
}

interface IconView {
    key: string;
    index: number;
    name: string;
    x: number;
    y: number;
    diameter: number;
    iconSize: number;
    inner: string;
    hovered: boolean;
    counterRotation: string;
}

interface SectorView {
    slug: string;
    name: string;
    url: string;
    active: boolean;
    empty: boolean;
    subText: string;
    ariaLabel: string;
    path: string;
    focusPath: string;
    labelX: number;
    labelY: number;
    labelTransform: string;
    icons: IconView[];
}

interface MonthView {
    key: string;
    label: string;
    x: number;
    y: number;
    angle: number;
    flip: boolean;
    current: boolean;
    tickX1: number;
    tickY1: number;
    tickX2: number;
    tickY2: number;
}

interface HoveredProduct {
    season: string;
    index: number;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function pointAt(radius: number, angle: number): Point {
    const radians = ((angle - 90) * Math.PI) / 180;

    return {
        x: round(radius * Math.cos(radians)),
        y: round(radius * Math.sin(radians)),
    };
}

function wedgePath(inner: number, outer: number, start: number, end: number): string {
    const outerStart = pointAt(outer, start);
    const outerEnd = pointAt(outer, end);
    const innerEnd = pointAt(inner, end);
    const innerStart = pointAt(inner, start);

    return [
        `M${outerStart.x} ${outerStart.y}`,
        `A${outer} ${outer} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
        `L${innerEnd.x} ${innerEnd.y}`,
        `A${inner} ${inner} 0 0 0 ${innerStart.x} ${innerStart.y}`,
        'Z',
    ].join(' ');
}

function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

function normalizeDelta(delta: number): number {
    return ((((delta + 180) % 360) + 360) % 360) - 180;
}

function nearestEquivalent(target: number, current: number): number {
    return target + 360 * Math.round((current - target) / 360);
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number): (value: number) => number {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleX = (time: number): number => ((ax * time + bx) * time + cx) * time;
    const sampleY = (time: number): number => ((ay * time + by) * time + cy) * time;

    const solveX = (x: number): number => {
        let time = x;

        for (let step = 0; step < 8; step += 1) {
            const difference = sampleX(time) - x;

            if (Math.abs(difference) < 1e-6) {
                break;
            }

            const derivative = (3 * ax * time + 2 * bx) * time + cx;

            if (Math.abs(derivative) < 1e-6) {
                break;
            }

            time -= difference / derivative;
        }

        return Math.min(Math.max(time, 0), 1);
    };

    return (value: number): number => sampleY(solveX(Math.min(Math.max(value, 0), 1)));
}

const springEase = cubicBezier(0.34, 1.56, 0.64, 1);

export default defineComponent({
    name: 'SeasonWheel',
    props: {
        data: {
            type: Object as PropType<SeasonWheelProps>,
            required: true,
        },
    },
    data() {
        return {
            rotation: 0,
            dragging: false,
            pointerActive: false,
            dragMoved: false,
            suppressClick: false,
            hoveredProduct: null as HoveredProduct | null,
            tooltipProduct: null as HoveredProduct | null,
            announcement: '',
            currentMonthIndex: 0,
            currentYear: 0,
            logoUrl: '/brand/logo-lockup-on-dark-outlined.svg',
            canHover: false,
            tooltipTimer: null as number | null,
            animationFrame: null as number | null,
            dragPointerId: null as number | null,
            dragStartX: 0,
            dragStartY: 0,
            dragStartAngle: 0,
            dragStartRotation: 0,
            pendingTransition: null as TransitionRecord | null,
            pendingEntrance: false,
            entering: false,
        };
    },
    computed: {
        activeSlug(): string {
            return this.data.active_season;
        },
        seasons(): WheelSeason[] {
            const order = WHEEL_ORDER as readonly string[];

            return [...this.data.seasons].sort(
                (first, second) => order.indexOf(first.slug) - order.indexOf(second.slug),
            );
        },
        activeSeason(): WheelSeason | undefined {
            return this.seasons.find((season) => season.slug === this.activeSlug);
        },
        targetRotation(): number {
            return this.targetForSlug(this.activeSlug);
        },
        sectors(): SectorView[] {
            return this.seasons.map((season, index) => {
                const start = -45 + index * 90;
                const end = start + 90;
                const label = pointAt(SEASON_LABEL_RADIUS, start + 45);
                const active = season.slug === this.activeSlug;
                const empty = season.products_count === 0;
                const limit = active ? 4 : 3;
                const products = empty ? [] : season.products.slice(0, limit);
                const diameter = active ? ACTIVE_DISC_DIAMETER : INACTIVE_DISC_DIAMETER;

                return {
                    slug: season.slug,
                    name: season.name,
                    url: season.url,
                    active,
                    empty,
                    subText: empty ? 'ПОКА ПУСТО' : season.sub,
                    ariaLabel: this.sectorAriaLabel(season),
                    path: wedgePath(
                        SECTOR_INNER_RADIUS,
                        SECTOR_OUTER_RADIUS,
                        start + SECTOR_GAP,
                        end - SECTOR_GAP,
                    ),
                    focusPath: wedgePath(
                        SECTOR_INNER_RADIUS - 6,
                        SECTOR_OUTER_RADIUS + 6,
                        start + 0.2,
                        end - 0.2,
                    ),
                    labelX: label.x,
                    labelY: label.y,
                    labelTransform: `rotate(${round(-this.rotation)} ${label.x} ${label.y})`,
                    icons: products.map((product, productIndex) =>
                        this.buildIcon(
                            season,
                            product,
                            productIndex,
                            start,
                            products.length,
                            diameter,
                        ),
                    ),
                };
            });
        },
        months(): MonthView[] {
            return MONTHS.map((label, index) => {
                const angle = -30 + index * 30;
                const point = pointAt(MONTH_LABEL_RADIUS, angle);
                const boundary = -45 + index * 30;
                const tickStart = pointAt(TICK_INNER_RADIUS, boundary);
                const tickEnd = pointAt(TICK_OUTER_RADIUS, boundary);

                return {
                    key: label,
                    label,
                    x: point.x,
                    y: point.y,
                    angle,
                    flip: this.isMonthFlipped(angle + this.targetRotation),
                    current: index === this.currentMonthIndex,
                    tickX1: tickStart.x,
                    tickY1: tickStart.y,
                    tickX2: tickEnd.x,
                    tickY2: tickEnd.y,
                };
            });
        },
        currentMonthPoint(): Point {
            return pointAt(MONTH_DOT_RADIUS, -30 + this.currentMonthIndex * 30);
        },
        groupTransform(): string {
            return `rotate(${round(this.rotation)})`;
        },
        yearLabel(): string {
            return `ЛЫКОВО · ${this.currentYear}`;
        },
        tooltipStyle(): Record<string, string> {
            const icon = this.tooltipIcon;

            if (icon === null) {
                return {};
            }

            const center = this.rotatePoint(icon.x, icon.y);
            const point = { x: center.x, y: center.y - icon.diameter / 2 - 12 };
            const left = Math.min(Math.max(((point.x + 350) / 700) * 100, 8), 92);
            const top = Math.max(((point.y + 350) / 700) * 100, 2);

            return {
                left: `${round(left)}%`,
                top: `${round(top)}%`,
            };
        },
        tooltipIcon(): IconView | null {
            if (this.tooltipProduct === null) {
                return null;
            }

            const sector = this.sectors.find((item) => item.slug === this.tooltipProduct?.season);

            return sector?.icons[this.tooltipProduct.index] ?? null;
        },
        tooltipName(): string {
            return this.tooltipIcon?.name ?? '';
        },
    },
    created() {
        this.canHover = window.matchMedia('(hover: hover)').matches;

        const now = new Date();
        this.currentMonthIndex = (now.getMonth() + 7) % 12;
        this.currentYear = now.getFullYear();

        const target = this.targetForSlug(this.activeSlug);
        const stored = this.readTransition();

        if (stored !== null) {
            if (stored.season === this.activeSlug) {
                this.pendingTransition = stored;
                this.rotation = stored.rotation;
            } else {
                this.clearTransition();
                this.rotation = target;
            }

            return;
        }

        if (!this.hasVisited()) {
            this.rotation = this.prefersReducedMotion() ? target : target - 20;
            this.pendingEntrance = true;
            this.entering = true;

            return;
        }

        this.rotation = target;
    },
    mounted() {
        const target = this.targetForSlug(this.activeSlug);

        void this.$nextTick(() => {
            if (this.activeSeason !== undefined) {
                this.announce(this.activeSeason);
            }

            if (this.pendingTransition?.focus === true) {
                this.focusActiveTab();
            }

            if (this.pendingTransition !== null) {
                this.clearTransition();
                this.pendingTransition = null;
            }

            if (this.pendingEntrance) {
                this.markVisited();
                this.pendingEntrance = false;
                this.animateTo(target);
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        this.entering = false;
                    });
                });
                window.setTimeout(() => {
                    this.entering = false;
                }, WHEEL_DURATION);

                return;
            }

            if (this.rotation !== target) {
                this.animateTo(target);
            }
        });
    },
    beforeUnmount() {
        this.cancelAnimation();
        this.clearTooltipTimer();
    },
    methods: {
        iconInner(product: WheelProduct): string {
            const name = product.icon.replace(/^product-/, '').replace(/\.svg$/, '');

            return PRODUCT_ICONS[name] ?? '';
        },
        productsLabel(count: number): string {
            const form = new Intl.PluralRules('ru').select(count);
            const word = form === 'one' ? 'продукт' : form === 'few' ? 'продукта' : 'продуктов';

            return `${count} ${word}`;
        },
        sectorAriaLabel(season: WheelSeason): string {
            if (season.products_count === 0) {
                return `${season.name}: пока пусто`;
            }

            const names = season.products.map((product) => product.name).join(', ');
            const products = names === '' ? this.productsLabel(season.products_count) : names;

            return `${season.name}: ${products}`;
        },
        buildIcon(
            season: WheelSeason,
            product: WheelProduct,
            index: number,
            sectorStart: number,
            count: number,
            diameter: number,
        ): IconView {
            const angle = sectorStart + 45 + (index - (count - 1) / 2) * ICON_STEP;
            const point = pointAt(ICON_RADIUS, angle);

            return {
                key: `${season.slug}-${index}`,
                index,
                name: product.name,
                x: point.x,
                y: point.y,
                diameter,
                iconSize: diameter * ICON_RATIO,
                inner: this.iconInner(product),
                hovered:
                    this.hoveredProduct !== null &&
                    this.hoveredProduct.season === season.slug &&
                    this.hoveredProduct.index === index,
                counterRotation: `rotate(${round(-this.rotation)} ${point.x} ${point.y})`,
            };
        },
        isMonthFlipped(angle: number): boolean {
            const normalized = normalizeAngle(angle);

            return normalized > 90 && normalized < 270;
        },
        rotatePoint(x: number, y: number): Point {
            const radians = (this.rotation * Math.PI) / 180;

            return {
                x: x * Math.cos(radians) - y * Math.sin(radians),
                y: x * Math.sin(radians) + y * Math.cos(radians),
            };
        },
        monthTransform(month: MonthView): string {
            const rotation = month.angle + (month.flip ? 180 : 0);

            return `rotate(${round(rotation)} ${month.x} ${month.y})`;
        },
        targetForSlug(slug: string): number {
            const index = this.seasons.findIndex((season) => season.slug === slug);

            return -(index - 1) * 90;
        },
        announce(season: WheelSeason): void {
            this.announcement =
                season.products_count === 0
                    ? `${season.name}, пока пусто`
                    : `${season.name}, ${this.productsLabel(season.products_count)}`;
        },
        focusActiveTab(): void {
            const root = this.$el as HTMLElement | undefined;
            const activeTab = root?.querySelector<HTMLElement>(
                '[role="tab"][aria-selected="true"]',
            );

            activeTab?.focus();
        },
        onSectorClick(event: MouseEvent, sector: SectorView): void {
            if (this.suppressClick) {
                this.suppressClick = false;
                event.preventDefault();

                return;
            }

            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            if (sector.active) {
                event.preventDefault();

                return;
            }

            this.storeTransition(sector.slug);
            event.preventDefault();
            navigateToSeason(sector.url);
        },
        onKeydown(event: KeyboardEvent, sector: SectorView): void {
            const currentIndex = this.seasons.findIndex((item) => item.slug === sector.slug);
            let nextIndex: number;

            switch (event.key) {
                case 'ArrowLeft':
                    nextIndex = (currentIndex - 1 + this.seasons.length) % this.seasons.length;
                    break;
                case 'ArrowRight':
                    nextIndex = (currentIndex + 1) % this.seasons.length;
                    break;
                case 'Home':
                    nextIndex = 0;
                    break;
                case 'End':
                    nextIndex = this.seasons.length - 1;
                    break;
                default:
                    return;
            }

            event.preventDefault();

            const next = this.seasons[nextIndex];

            if (next === undefined || next.slug === this.activeSlug) {
                return;
            }

            this.navigateTo(next);
        },
        navigateTo(season: WheelSeason): void {
            if (season.slug === this.activeSlug) {
                return;
            }

            this.storeTransition(season.slug);
            navigateToSeason(season.url);
        },
        storeTransition(season: string): void {
            const record: TransitionRecord = {
                rotation: this.rotation,
                season,
                focus: true,
                at: Date.now(),
            };

            try {
                window.sessionStorage.setItem(TRANSITION_KEY, JSON.stringify(record));
            } catch {
                // Приватный режим может запрещать sessionStorage — навигация всё равно работает.
            }
        },
        readTransition(): TransitionRecord | null {
            try {
                const raw = window.sessionStorage.getItem(TRANSITION_KEY);

                if (raw === null) {
                    return null;
                }

                const data: unknown = JSON.parse(raw);

                if (data === null || typeof data !== 'object') {
                    return null;
                }

                const record = data as Partial<TransitionRecord>;

                if (
                    typeof record.rotation !== 'number' ||
                    typeof record.season !== 'string' ||
                    typeof record.focus !== 'boolean' ||
                    typeof record.at !== 'number'
                ) {
                    return null;
                }

                if (Date.now() - record.at > TRANSITION_TTL) {
                    return null;
                }

                return record as TransitionRecord;
            } catch {
                return null;
            }
        },
        clearTransition(): void {
            try {
                window.sessionStorage.removeItem(TRANSITION_KEY);
            } catch {
                // Ничего не делаем: запись могла не создаться.
            }
        },
        hasVisited(): boolean {
            try {
                return window.sessionStorage.getItem(VISITED_KEY) === '1';
            } catch {
                return false;
            }
        },
        markVisited(): void {
            try {
                window.sessionStorage.setItem(VISITED_KEY, '1');
            } catch {
                // Ничего не делаем: без sessionStorage анимация входа повторится.
            }
        },
        prefersReducedMotion(): boolean {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        animateTo(target: number): void {
            this.cancelAnimation();

            const destination = nearestEquivalent(target, this.rotation);

            if (this.prefersReducedMotion()) {
                this.rotation = destination;

                return;
            }

            const from = this.rotation;
            const start = performance.now();

            const step = (now: number): void => {
                const progress = Math.min((now - start) / WHEEL_DURATION, 1);
                this.rotation = from + (destination - from) * springEase(progress);

                if (progress < 1) {
                    this.animationFrame = window.requestAnimationFrame(step);

                    return;
                }

                this.rotation = destination;
                this.animationFrame = null;
            };

            this.animationFrame = window.requestAnimationFrame(step);
        },
        cancelAnimation(): void {
            if (this.animationFrame !== null) {
                window.cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
        },
        pointerAngle(event: PointerEvent): number {
            const svg = this.$refs.svg as SVGSVGElement | undefined;

            if (svg === undefined) {
                return 0;
            }

            const rect = svg.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            return (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI;
        },
        onPointerDown(event: PointerEvent): void {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            this.cancelAnimation();
            this.dragging = false;
            this.dragMoved = false;
            this.dragStartX = event.clientX;
            this.dragStartY = event.clientY;
            this.dragStartAngle = this.pointerAngle(event);
            this.dragStartRotation = this.rotation;
            this.dragPointerId = event.pointerId;
            this.pointerActive = true;
        },
        onPointerMove(event: PointerEvent): void {
            if (!this.pointerActive || event.pointerId !== this.dragPointerId) {
                return;
            }

            if (!this.dragging) {
                if (
                    Math.hypot(event.clientX - this.dragStartX, event.clientY - this.dragStartY) <=
                    5
                ) {
                    return;
                }

                this.dragging = true;
                this.dragMoved = true;

                const svg = this.$refs.svg as SVGSVGElement | undefined;
                svg?.setPointerCapture(event.pointerId);
            }
            const delta = normalizeDelta(this.pointerAngle(event) - this.dragStartAngle);
            this.rotation = this.dragStartRotation + delta;
        },
        onPointerUp(event: PointerEvent): void {
            if (!this.pointerActive) {
                return;
            }

            const moved = this.dragMoved;

            this.pointerActive = false;
            this.dragging = false;
            this.dragMoved = false;
            this.releasePointer(event);

            if (!moved) {
                return;
            }

            this.suppressClick = true;
            window.setTimeout(() => {
                this.suppressClick = false;
            }, 400);

            const nearest = this.nearestSeason();

            if (nearest === null) {
                return;
            }

            if (nearest.season.slug !== this.activeSlug) {
                this.navigateTo(nearest.season);

                return;
            }

            this.animateTo(nearest.target);
        },
        onPointerCancel(event: PointerEvent): void {
            this.pointerActive = false;
            this.dragging = false;
            this.dragMoved = false;
            this.releasePointer(event);

            const nearest = this.nearestSeason();

            if (nearest !== null) {
                this.animateTo(nearest.target);
            }
        },
        releasePointer(event: PointerEvent): void {
            const svg = this.$refs.svg as SVGSVGElement | undefined;

            if (svg !== undefined && svg.hasPointerCapture(event.pointerId)) {
                svg.releasePointerCapture(event.pointerId);
            }

            this.dragPointerId = null;
        },
        nearestSeason(): { season: WheelSeason; target: number; distance: number } | null {
            let nearest: { season: WheelSeason; target: number; distance: number } | null = null;

            this.seasons.forEach((season, index) => {
                const target = nearestEquivalent(-(index - 1) * 90, this.rotation);
                const distance = Math.abs(target - this.rotation);

                if (nearest === null || distance < nearest.distance) {
                    nearest = { season, target, distance };
                }
            });

            return nearest;
        },
        onIconEnter(event: PointerEvent, season: string, index: number): void {
            if (event.pointerType !== 'mouse' || !this.canHover) {
                return;
            }

            this.clearTooltipTimer();
            this.hoveredProduct = { season, index };
            this.tooltipTimer = window.setTimeout(() => {
                this.tooltipProduct = { season, index };
            }, TOOLTIP_DELAY);
        },
        onIconLeave(): void {
            this.clearTooltipTimer();
            this.hoveredProduct = null;
            this.tooltipProduct = null;
        },
        clearTooltipTimer(): void {
            if (this.tooltipTimer !== null) {
                window.clearTimeout(this.tooltipTimer);
                this.tooltipTimer = null;
            }
        },
    },
});
</script>

<template>
    <div
        class="season-wheel__root"
        :class="{
            'season-wheel__root--entering': entering,
            'season-wheel__root--dragging': dragging,
        }"
        data-season-wheel
    >
        <svg
            ref="svg"
            class="season-wheel__svg"
            viewBox="-350 -350 700 700"
            role="tablist"
            aria-label="Сезоны"
            :data-rotation="rotation.toFixed(2)"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
            @dragstart.prevent
        >
            <circle class="season-wheel__ring" r="332" />
            <circle class="season-wheel__ring" r="296" />

            <g class="season-wheel__rotating" :transform="groupTransform" data-wheel-rotating>
                <g class="season-wheel__months">
                    <g v-for="month in months" :key="month.key">
                        <line
                            class="season-wheel__tick"
                            :x1="month.tickX1"
                            :y1="month.tickY1"
                            :x2="month.tickX2"
                            :y2="month.tickY2"
                            data-tick
                        />
                        <text
                            class="season-wheel__month"
                            :class="{ 'season-wheel__month--current': month.current }"
                            :x="month.x"
                            :y="month.y"
                            :transform="monthTransform(month)"
                            :data-month="month.label"
                            :data-current-month="month.current ? 'true' : 'false'"
                        >
                            {{ month.label.toUpperCase() }}
                        </text>
                    </g>

                    <circle
                        class="season-wheel__month-dot"
                        :cx="currentMonthPoint.x"
                        :cy="currentMonthPoint.y"
                        r="4"
                    />
                </g>

                <g class="season-wheel__sectors">
                    <g
                        v-for="sector in sectors"
                        :key="sector.slug"
                        class="season-wheel__season"
                        :class="{ 'season-wheel__season--active': sector.active }"
                        :data-wheel-season="sector.slug"
                        :data-active="sector.active ? 'true' : 'false'"
                    >
                        <a
                            :id="`season-tab-${sector.slug}`"
                            :href="sector.url"
                            class="season-wheel__sector-link"
                            role="tab"
                            draggable="false"
                            aria-controls="catalog-column"
                            :aria-selected="sector.active ? 'true' : 'false'"
                            :aria-label="sector.ariaLabel"
                            :tabindex="sector.active ? 0 : -1"
                            @click="onSectorClick($event, sector)"
                            @keydown="onKeydown($event, sector)"
                        >
                            <path class="season-wheel__sector" :d="sector.path" />
                            <path class="season-wheel__focus-outline" :d="sector.focusPath" />
                            <path class="season-wheel__focus-ring" :d="sector.focusPath" />

                            <text
                                class="season-wheel__season-name"
                                :x="sector.labelX"
                                :y="sector.labelY - 6"
                                :transform="sector.labelTransform"
                                :data-season-label="sector.slug"
                            >
                                {{ sector.name }}
                            </text>
                            <text
                                class="season-wheel__season-sub"
                                :class="{ 'season-wheel__season-sub--empty': sector.empty }"
                                :x="sector.labelX"
                                :y="sector.labelY + 13"
                                :transform="sector.labelTransform"
                                :data-season-sub="sector.slug"
                            >
                                {{ sector.subText }}
                            </text>

                            <g
                                class="season-wheel__icons"
                                :class="{
                                    'season-wheel__icons--hovered':
                                        hoveredProduct?.season === sector.slug,
                                }"
                                :data-season-icons="sector.slug"
                            >
                                <g
                                    v-for="icon in sector.icons"
                                    :key="icon.key"
                                    class="season-wheel__product"
                                    :transform="icon.counterRotation"
                                    :data-product-icon="icon.key"
                                    :data-product-name="icon.name"
                                    aria-hidden="true"
                                    @pointerenter="onIconEnter($event, sector.slug, icon.index)"
                                    @pointerleave="onIconLeave"
                                >
                                    <g
                                        class="season-wheel__product-scale"
                                        :class="{
                                            'season-wheel__product-scale--hovered': icon.hovered,
                                        }"
                                        :style="{
                                            transformOrigin: `${icon.x}px ${icon.y}px`,
                                        }"
                                    >
                                        <circle
                                            class="season-wheel__disc"
                                            :cx="icon.x"
                                            :cy="icon.y"
                                            :r="icon.diameter / 2"
                                        />
                                        <circle
                                            v-if="icon.hovered"
                                            class="season-wheel__icon-ring"
                                            :cx="icon.x"
                                            :cy="icon.y"
                                            :r="icon.diameter / 2 + 3"
                                        />
                                        <!-- eslint-disable vue/no-v-html -- очищенный SVG из generated/product-icons.json -->
                                        <g
                                            :transform="`translate(${icon.x - icon.iconSize / 2} ${icon.y - icon.iconSize / 2}) scale(${icon.iconSize / 100})`"
                                            v-html="icon.inner"
                                        />
                                        <!-- eslint-enable vue/no-v-html -->
                                    </g>
                                </g>
                            </g>
                        </a>
                    </g>
                </g>
            </g>

            <g class="season-wheel__center">
                <circle class="season-wheel__center-disc" r="118" />
                <circle class="season-wheel__center-ring" r="110" />
                <image :href="logoUrl" x="-90" y="-78" width="180" height="48.4" />
                <text class="season-wheel__center-title" y="8" text-anchor="middle">
                    Колесо года
                </text>
                <text class="season-wheel__center-year" y="32" text-anchor="middle" data-wheel-year>
                    {{ yearLabel }}
                </text>
            </g>
        </svg>

        <div
            v-if="tooltipIcon !== null"
            class="season-wheel__tooltip"
            :style="tooltipStyle"
            data-tooltip
        >
            {{ tooltipName }}
        </div>

        <p class="season-wheel__live" aria-live="polite" data-live>
            {{ announcement }}
        </p>

        <nav class="season-wheel__mobile" aria-label="Сезоны">
            <ul>
                <li v-for="season in seasons" :key="season.slug">
                    <a
                        :href="season.url"
                        :aria-current="season.slug === activeSlug ? 'page' : undefined"
                    >
                        <span class="season-wheel__mobile-name">{{ season.name }}</span>
                        <span class="season-wheel__mobile-sub">
                            {{ season.products_count > 0 ? season.sub : 'ПОКА ПУСТО' }}
                        </span>
                    </a>
                </li>
            </ul>
        </nav>
    </div>
</template>
