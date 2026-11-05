<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import productIcons from '@/generated/product-icons.json';
import { formatPrice } from '@/lib/format-price';
import {
    type ProductModalProduct,
    type ProductModalProps,
    type ProductStatusId,
} from '@/types/product-modal';

const PRODUCT_ICONS = productIcons as Record<string, string>;
const MODAL_TITLE_ID = 'product-modal-title';
const MODAL_DESCRIPTION_ID = 'product-modal-description';
const REDUCED_MOTION_DURATION = 150;
const DESKTOP_QUERY = '(min-width: 1200px)';

interface ProductModalHistoryState {
    productModal?: boolean;
}

function isHistoryState(value: unknown): value is ProductModalHistoryState {
    return value !== null && typeof value === 'object';
}

export default defineComponent({
    name: 'ProductModal',
    props: {
        data: {
            type: Object as PropType<ProductModalProps>,
            required: true,
        },
    },
    data() {
        return {
            currentProduct: null as ProductModalProduct | null,
            isOpen: false,
            isClosing: false,
            closeQueued: false,
            hasOverflow: false,
            sourceLink: null as HTMLAnchorElement | null,
            sourceRect: null as DOMRect | null,
            desktopQuery: null as MediaQueryList | null,
            inertElements: [] as HTMLElement[],
            scrollLocked: false,
            savedPaddingRight: '',
            titleId: MODAL_TITLE_ID,
            descriptionId: MODAL_DESCRIPTION_ID,
        };
    },
    computed: {
        product(): ProductModalProduct | null {
            return this.currentProduct;
        },
        statusId(): ProductStatusId {
            return this.product?.status.id ?? 'in_stock';
        },
        isOut(): boolean {
            return this.statusId === 'out';
        },
        overline(): string {
            const product = this.product;

            if (product === null) {
                return '';
            }

            const parts = [product.category.name];

            if (product.harvest !== null && product.harvest !== '') {
                parts.push(`сбор ${product.harvest}`);
            }

            return parts.join(' · ');
        },
        title(): string {
            const product = this.product;

            if (product === null) {
                return '';
            }

            return product.story_title ?? product.name;
        },
        iconMarkup(): string {
            const icon = this.product?.icon ?? '';
            const key = icon.replace(/^product-/, '').replace(/\.svg$/, '');

            return PRODUCT_ICONS[key] ?? '';
        },
        facts(): string[] {
            return this.product?.facts ?? [];
        },
        priceLabel(): string {
            const product = this.product;

            if (product === null) {
                return '';
            }

            return formatPrice(product.price, product.price_unit);
        },
        badgeText(): string {
            if (this.product === null) {
                return '';
            }

            switch (this.statusId) {
                case 'few':
                    return this.product.stock === null
                        ? 'осталось мало'
                        : `осталось ${this.product.stock}`;
                case 'preorder':
                    return 'предзаказ';
                case 'out':
                    return 'нет в наличии';
                default:
                    return '';
            }
        },
        badgeClass(): string {
            return `product-modal__badge--${this.statusId}`;
        },
    },
    mounted() {
        document.addEventListener('click', this.onDocumentClick);
        document.addEventListener('keydown', this.onDocumentKeydown);
        document.addEventListener('focusin', this.onFocusIn);
        window.addEventListener('popstate', this.onPopState);
        window.addEventListener('resize', this.onResize);
        window.addEventListener('pageshow', this.onPageShow);

        this.desktopQuery = window.matchMedia(DESKTOP_QUERY);
        this.desktopQuery.addEventListener('change', this.onBreakpointChange);

        this.openInitialProduct();
    },
    beforeUnmount() {
        document.removeEventListener('click', this.onDocumentClick);
        document.removeEventListener('keydown', this.onDocumentKeydown);
        document.removeEventListener('focusin', this.onFocusIn);
        window.removeEventListener('popstate', this.onPopState);
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('pageshow', this.onPageShow);
        this.desktopQuery?.removeEventListener('change', this.onBreakpointChange);
        this.desktopQuery = null;
        this.unlockScroll();
        this.removeInert();
    },
    methods: {
        isDesktop(): boolean {
            return window.matchMedia(DESKTOP_QUERY).matches;
        },
        panelElement(): HTMLElement | null {
            return (this.$refs.panel as HTMLElement | undefined) ?? null;
        },
        overlayElement(): HTMLElement | null {
            return (this.$refs.overlay as HTMLElement | undefined) ?? null;
        },
        bodyElement(): HTMLElement | null {
            return (this.$refs.body as HTMLElement | undefined) ?? null;
        },
        closeButtonElement(): HTMLButtonElement | null {
            return (this.$refs.close as HTMLButtonElement | undefined) ?? null;
        },
        findProduct(slug: string): ProductModalProduct | null {
            if (this.data.initial_product?.slug === slug) {
                return this.data.initial_product;
            }

            return this.data.products.find((product) => product.slug === slug) ?? null;
        },
        findSourceLink(slug: string): HTMLAnchorElement | null {
            const links = document.querySelectorAll<HTMLAnchorElement>('a[data-product-slug]');

            for (const link of links) {
                if (link.dataset.productSlug !== slug) {
                    continue;
                }

                if (link.getBoundingClientRect().width > 0) {
                    return link;
                }
            }

            return null;
        },
        measureSourceLink(): DOMRect | null {
            const link = this.sourceLink;

            if (link === null || !link.isConnected) {
                return null;
            }

            const rect = link.getBoundingClientRect();

            return rect.width > 0 && rect.height > 0 ? rect : null;
        },
        openInitialProduct(): void {
            const product = this.data.initial_product;

            if (
                product === null ||
                !this.isDesktop() ||
                new URL(window.location.href).searchParams.get('product') !== product.slug
            ) {
                return;
            }

            if (
                !isHistoryState(window.history.state) ||
                window.history.state.productModal !== true
            ) {
                const base = new URL(window.location.href);
                const target = new URL(window.location.href);

                base.searchParams.delete('product');
                window.history.replaceState(null, '', base.toString());
                window.history.pushState(
                    { productModal: true } satisfies ProductModalHistoryState,
                    '',
                    target.toString(),
                );
            }

            void this.openProduct(product, this.findSourceLink(product.slug));
        },
        async openProduct(
            product: ProductModalProduct,
            sourceLink: HTMLAnchorElement | null,
        ): Promise<void> {
            if (this.isOpen || this.isClosing) {
                return;
            }

            this.currentProduct = product;
            this.sourceLink = sourceLink ?? this.findSourceLink(product.slug);
            this.sourceRect = this.measureSourceLink();
            this.isOpen = true;
            this.closeQueued = false;
            this.lockScroll();
            this.applyInert();

            await this.$nextTick();

            this.measureOverflow();
            this.animateOpen();
            this.closeButtonElement()?.focus();

            void document.fonts?.ready.then(() => this.measureOverflow());
        },
        requestClose(): void {
            if (!this.isOpen || this.isClosing || this.closeQueued) {
                return;
            }

            this.closeQueued = true;

            if (
                isHistoryState(window.history.state) &&
                window.history.state.productModal === true
            ) {
                window.history.back();

                return;
            }

            const url = new URL(window.location.href);
            url.searchParams.delete('product');
            window.history.replaceState(null, '', url.toString());
            void this.closeWithAnimation();
        },
        async closeWithAnimation(): Promise<void> {
            if (!this.isOpen || this.isClosing) {
                return;
            }

            this.isClosing = true;

            const panel = this.panelElement();
            const overlay = this.overlayElement();
            const reduced = this.prefersReducedMotion();
            const duration = reduced
                ? REDUCED_MOTION_DURATION
                : this.cssDuration('--dur-base', 250);
            const easing = reduced ? 'ease-in' : this.cssEasing('--ease-exit', 'ease-in');
            const animations: Animation[] = [];

            if (panel !== null) {
                if (reduced) {
                    animations.push(
                        panel.animate([{ opacity: 1 }, { opacity: 0 }], {
                            duration,
                            easing,
                            fill: 'forwards',
                        }),
                    );
                } else {
                    const target = panel.getBoundingClientRect();
                    const source = this.measureSourceLink() ?? this.sourceRect;
                    let transform = 'translate(-50%, -50%) scale(0.94)';

                    if (source !== null && target.width > 0 && target.height > 0) {
                        transform = this.flipTransform(target, source);
                    }

                    animations.push(
                        panel.animate(
                            [
                                { transform: 'translate(-50%, -50%)', opacity: 1 },
                                { transform, opacity: 0 },
                            ],
                            { duration, easing, fill: 'forwards' },
                        ),
                    );
                }
            }

            if (overlay !== null) {
                animations.push(
                    overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
                        duration,
                        easing,
                        fill: 'forwards',
                    }),
                );
            }

            await Promise.all(
                animations.map((animation) => animation.finished.catch(() => undefined)),
            );

            this.finishClose();
        },
        finishClose(): void {
            const focusTarget =
                this.sourceLink?.isConnected === true
                    ? this.sourceLink
                    : document.querySelector<HTMLElement>('#catalog-column .catalog-header__title');

            this.isOpen = false;
            this.isClosing = false;
            this.closeQueued = false;
            this.currentProduct = null;
            this.hasOverflow = false;
            this.sourceLink = null;
            this.sourceRect = null;
            this.unlockScroll();
            this.removeInert();

            window.requestAnimationFrame(() => focusTarget?.focus());
        },
        animateOpen(): void {
            const panel = this.panelElement();
            const overlay = this.overlayElement();
            const reduced = this.prefersReducedMotion();
            const duration = reduced
                ? REDUCED_MOTION_DURATION
                : this.cssDuration('--dur-slow', 400);
            const easing = reduced
                ? 'ease-out'
                : this.cssEasing('--ease-standard', 'cubic-bezier(0.2, 0, 0, 1)');

            if (panel !== null) {
                if (reduced) {
                    panel.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration,
                        easing,
                        fill: 'none',
                    });
                } else {
                    const target = panel.getBoundingClientRect();
                    const source = this.sourceRect;
                    const from =
                        source !== null && target.width > 0 && target.height > 0
                            ? this.flipTransform(target, source)
                            : 'translate(-50%, -50%) scale(0.94)';

                    panel.animate(
                        [
                            { transform: from, opacity: 0 },
                            { transform: 'translate(-50%, -50%)', opacity: 1 },
                        ],
                        { duration, easing, fill: 'none' },
                    );
                }
            }

            if (overlay !== null) {
                overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration,
                    easing,
                    fill: 'none',
                });
            }
        },
        flipTransform(target: DOMRect, source: DOMRect): string {
            const dx = source.left + source.width / 2 - (target.left + target.width / 2);
            const dy = source.top + source.height / 2 - (target.top + target.height / 2);
            const scaleX = source.width / target.width;
            const scaleY = source.height / target.height;

            return `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
        },
        measureOverflow(): void {
            const body = this.bodyElement();

            if (body === null) {
                this.hasOverflow = false;

                return;
            }

            this.hasOverflow = body.scrollHeight - body.clientHeight > 1;
        },
        focusableElements(): HTMLElement[] {
            const panel = this.panelElement();

            if (panel === null) {
                return [];
            }

            return Array.from(
                panel.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((element) => element.getBoundingClientRect().width > 0);
        },
        trapFocus(event: KeyboardEvent): void {
            const focusable = this.focusableElements();

            if (focusable.length === 0) {
                event.preventDefault();

                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (first === undefined || last === undefined) {
                return;
            }

            if (event.shiftKey) {
                if (active === first || active === null || !this.panelElement()?.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }

                return;
            }

            if (active === last || active === null || !this.panelElement()?.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        },
        onDocumentClick(event: MouseEvent): void {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const link = target.closest<HTMLAnchorElement>('a[data-product-modal]');

            if (link === null || !this.isDesktop()) {
                return;
            }

            const slug = link.dataset.productSlug ?? '';
            const product = this.findProduct(slug);

            if (product === null) {
                return;
            }

            event.preventDefault();

            if (this.isOpen) {
                return;
            }

            window.history.pushState(
                { productModal: true } satisfies ProductModalHistoryState,
                '',
                link.href,
            );
            void this.openProduct(product, link);
        },
        onDocumentKeydown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                if (this.isOpen) {
                    event.preventDefault();
                    this.requestClose();
                }

                return;
            }

            if (event.key === 'Tab' && this.isOpen) {
                this.trapFocus(event);

                return;
            }

            if ((event.key === ' ' || event.key === 'Spacebar') && !this.isOpen) {
                const target = event.target;

                if (!(target instanceof Element)) {
                    return;
                }

                const link = target.closest<HTMLAnchorElement>('a[data-product-modal]');

                if (link === null) {
                    return;
                }

                event.preventDefault();
                link.click();
            }
        },
        onFocusIn(event: FocusEvent): void {
            if (!this.isOpen) {
                return;
            }

            const panel = this.panelElement();

            if (panel === null || !(event.target instanceof Node) || panel.contains(event.target)) {
                return;
            }

            this.closeButtonElement()?.focus();
        },
        onPopState(): void {
            const slug = new URL(window.location.href).searchParams.get('product');
            const product = slug === null ? null : this.findProduct(slug);

            this.closeQueued = false;

            if (product !== null) {
                if (!this.isOpen) {
                    void this.openProduct(product, this.findSourceLink(product.slug));
                } else if (this.currentProduct?.slug !== product.slug) {
                    this.currentProduct = product;
                    void this.$nextTick(() => this.measureOverflow());
                }

                return;
            }

            if (this.isOpen) {
                void this.closeWithAnimation();
            }
        },
        onResize(): void {
            this.measureOverflow();

            if (this.isOpen && !this.isDesktop()) {
                this.requestClose();
            }
        },
        onBreakpointChange(event: MediaQueryListEvent): void {
            if (!event.matches && this.isOpen) {
                this.requestClose();
            }
        },
        onPageShow(event: PageTransitionEvent): void {
            if (!event.persisted) {
                return;
            }

            const slug = new URL(window.location.href).searchParams.get('product');
            const product = slug === null ? null : this.findProduct(slug);

            if (product !== null && !this.isOpen && this.isDesktop()) {
                void this.openProduct(product, this.findSourceLink(product.slug));
            } else if (product === null && this.isOpen) {
                void this.closeWithAnimation();
            }
        },
        lockScroll(): void {
            if (this.scrollLocked) {
                return;
            }

            const html = document.documentElement;
            const scrollbarWidth = window.innerWidth - html.clientWidth;

            this.savedPaddingRight = html.style.paddingRight;

            if (scrollbarWidth > 0) {
                html.style.paddingRight = `${scrollbarWidth}px`;
            }

            html.classList.add('product-modal-open');
            this.scrollLocked = true;
        },
        unlockScroll(): void {
            if (!this.scrollLocked) {
                return;
            }

            const html = document.documentElement;

            html.classList.remove('product-modal-open');
            html.style.paddingRight = this.savedPaddingRight;
            this.scrollLocked = false;
        },
        applyInert(): void {
            this.removeInert();

            document
                .querySelectorAll<HTMLElement>('header.site-header, main.site-main')
                .forEach((element) => {
                    element.setAttribute('inert', '');
                    this.inertElements.push(element);
                });
        },
        removeInert(): void {
            this.inertElements.forEach((element) => element.removeAttribute('inert'));
            this.inertElements = [];
        },
        prefersReducedMotion(): boolean {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        cssDuration(name: string, fallback: number): number {
            const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

            if (raw.endsWith('ms')) {
                const value = Number.parseFloat(raw);

                return Number.isFinite(value) ? value : fallback;
            }

            if (raw.endsWith('s')) {
                const value = Number.parseFloat(raw);

                return Number.isFinite(value) ? value * 1000 : fallback;
            }

            return fallback;
        },
        cssEasing(name: string, fallback: string): string {
            const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

            return raw === '' ? fallback : raw;
        },
    },
});
</script>

<template>
    <div v-if="isOpen && product !== null" class="product-modal__root">
        <div
            ref="overlay"
            class="product-modal__overlay"
            data-product-modal-overlay
            @click="requestClose"
        ></div>

        <section
            ref="panel"
            class="product-modal"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="descriptionId"
            data-product-modal-panel
        >
            <button
                ref="close"
                type="button"
                class="product-modal__close"
                aria-label="Закрыть"
                data-product-modal-close
                @click="requestClose"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="M6 6l12 12M18 6L6 18"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                    />
                </svg>
            </button>

            <div class="product-modal__header">
                <div
                    class="product-modal__illustration"
                    :class="{ 'product-modal__illustration--out': isOut }"
                >
                    <!-- eslint-disable vue/no-v-html -- очищенный SVG из generated/product-icons.json -->
                    <svg
                        class="product-modal__icon"
                        width="92"
                        height="92"
                        viewBox="0 0 100 100"
                        aria-hidden="true"
                        focusable="false"
                        v-html="iconMarkup"
                    ></svg>
                    <!-- eslint-enable vue/no-v-html -->
                </div>

                <p class="product-modal__overline">{{ overline }}</p>
                <h2 :id="titleId" class="product-modal__title">{{ title }}</h2>
            </div>

            <div class="product-modal__content">
                <div ref="body" class="product-modal__body" data-product-modal-body>
                    <p :id="descriptionId" class="product-modal__description">
                        {{ product.description }}
                    </p>

                    <ul
                        v-if="facts.length > 0"
                        class="product-modal__facts"
                        aria-label="Факты о товаре"
                    >
                        <li v-for="fact in facts" :key="fact" class="product-modal__fact">
                            {{ fact }}
                        </li>
                    </ul>
                </div>

                <div
                    v-if="hasOverflow"
                    class="product-modal__fade"
                    aria-hidden="true"
                    data-product-modal-fade
                ></div>
            </div>

            <div class="product-modal__footer">
                <div class="product-modal__buy">
                    <p
                        class="product-modal__price"
                        :class="{ 'product-modal__price--out': isOut }"
                        data-product-modal-price
                    >
                        <span>{{ priceLabel }}</span>
                        <span
                            v-if="badgeText !== ''"
                            class="product-modal__badge"
                            :class="badgeClass"
                        >
                            {{ badgeText }}
                        </span>
                    </p>
                </div>

                <a
                    v-if="statusId === 'preorder'"
                    class="product-modal__button"
                    :href="data.preorder_url"
                    data-product-modal-preorder
                >
                    Записаться на предзаказ
                </a>

                <p v-else-if="isOut" class="product-modal__out-note" data-product-modal-out-note>
                    Товар закончился в этом сезоне. Снова появится в следующем сезоне.
                </p>
            </div>
        </section>
    </div>
</template>
