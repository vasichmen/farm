<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import {
    clearInert,
    createScrollLock,
    setInert,
    trapFocus as trapFocusWithin,
    type ScrollLock,
} from '@/lib/layer';
import type { SiteMenuProps, SiteMenuSocial } from '@/types/site-menu';

const DESKTOP_QUERY = '(min-width: 1200px)';
const SWIPE_THRESHOLD = 60;
const PANEL_ID = 'site-menu-panel';
const INERT_SELECTORS = ['main.site-main', 'nav.site-nav', '.site-header__logo'] as const;

export default defineComponent({
    name: 'SiteMenu',
    props: {
        data: {
            type: Object as PropType<SiteMenuProps>,
            required: true,
        },
    },
    data() {
        return {
            isOpen: false,
            panelId: PANEL_ID,
            inertElements: [] as HTMLElement[],
            scrollLock: null as ScrollLock | null,
            pointerTracking: false,
            pointerStartX: 0,
            pointerStartY: 0,
            pointerLastX: 0,
            pointerLastY: 0,
        };
    },
    mounted() {
        document.addEventListener('keydown', this.onDocumentKeydown);
        document.addEventListener('focusin', this.onFocusIn);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.onDocumentKeydown);
        document.removeEventListener('focusin', this.onFocusIn);
        this.releaseLayer();
    },
    methods: {
        triggerElement(): HTMLButtonElement | null {
            return (this.$refs.trigger as HTMLButtonElement | undefined) ?? null;
        },
        rootElement(): HTMLElement | null {
            return (this.$refs.root as HTMLElement | undefined) ?? null;
        },
        panelElement(): HTMLElement | null {
            return (this.$refs.panel as HTMLElement | undefined) ?? null;
        },
        isMobile(): boolean {
            return !window.matchMedia(DESKTOP_QUERY).matches;
        },
        toggle(): void {
            if (this.isOpen) {
                this.close();

                return;
            }

            this.open();
        },
        open(): void {
            if (this.isOpen) {
                return;
            }

            this.isOpen = true;
            this.lockLayer();

            void this.$nextTick(() => {
                this.triggerElement()?.focus();
            });
        },
        close(): void {
            if (!this.isOpen) {
                return;
            }

            this.isOpen = false;
            this.pointerTracking = false;
            this.releaseLayer();

            window.requestAnimationFrame(() => this.triggerElement()?.focus());
        },
        lockLayer(): void {
            this.scrollLock ??= createScrollLock('site-menu-open');
            this.scrollLock.lock();
            this.inertElements = setInert(INERT_SELECTORS);
        },
        releaseLayer(): void {
            this.scrollLock?.unlock();
            clearInert(this.inertElements);
            this.inertElements = [];
        },
        onDocumentKeydown(event: KeyboardEvent): void {
            if (!this.isOpen) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();

                return;
            }

            if (event.key === 'Tab') {
                trapFocusWithin(this.rootElement(), event);
            }
        },
        onFocusIn(event: FocusEvent): void {
            if (!this.isOpen) {
                return;
            }

            const root = this.rootElement();

            if (root === null || !(event.target instanceof Node) || root.contains(event.target)) {
                return;
            }

            this.triggerElement()?.focus();
        },
        onPointerDown(event: PointerEvent): void {
            if (!this.isOpen || !this.isMobile()) {
                return;
            }

            this.pointerTracking = true;
            this.pointerStartX = event.clientX;
            this.pointerStartY = event.clientY;
            this.pointerLastX = event.clientX;
            this.pointerLastY = event.clientY;
        },
        onPointerMove(event: PointerEvent): void {
            if (!this.pointerTracking) {
                return;
            }

            this.pointerLastX = event.clientX;
            this.pointerLastY = event.clientY;
        },
        onPointerUp(): void {
            if (!this.pointerTracking) {
                return;
            }

            this.pointerTracking = false;

            const deltaX = this.pointerLastX - this.pointerStartX;
            const deltaY = this.pointerLastY - this.pointerStartY;

            if (deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
                this.close();
            }
        },
        onPointerCancel(): void {
            this.pointerTracking = false;
        },
        onSocialClick(event: MouseEvent, social: SiteMenuSocial): void {
            if (social.url === null) {
                event.preventDefault();
            }
        },
    },
});
</script>

<template>
    <div
        ref="root"
        class="site-menu"
        :class="{ 'is-open': isOpen }"
        :role="isOpen ? 'dialog' : undefined"
        :aria-modal="isOpen ? 'true' : undefined"
        :aria-label="isOpen ? 'Меню сайта' : undefined"
        data-site-menu-root
    >
        <button
            ref="trigger"
            type="button"
            class="site-menu__toggle"
            :class="{ 'is-open': isOpen }"
            :aria-expanded="isOpen ? 'true' : 'false'"
            :aria-label="isOpen ? 'Закрыть меню' : 'Открыть меню'"
            :aria-controls="panelId"
            data-site-menu-trigger
            @click="toggle"
        >
            <span class="site-menu__burger" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
            </span>
        </button>

        <div
            class="site-menu__overlay"
            aria-hidden="true"
            data-site-menu-overlay
            @click="close"
        ></div>

        <nav
            :id="panelId"
            ref="panel"
            class="site-menu__panel"
            aria-label="Разделы сайта"
            :aria-hidden="isOpen ? undefined : 'true'"
            :inert="isOpen ? undefined : true"
            data-site-menu-panel
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
        >
            <ul class="site-menu__list">
                <li
                    v-for="(item, index) in data.items"
                    :key="item.id"
                    class="site-menu__item"
                    :style="{ '--item-index': index }"
                >
                    <a
                        class="site-menu__link"
                        :href="item.url"
                        :aria-current="item.active ? 'page' : undefined"
                        :data-site-menu-item="item.id"
                    >
                        {{ item.label }}
                    </a>
                </li>
            </ul>

            <footer class="site-menu__footer">
                <div class="site-menu__footer-inner">
                    <address class="site-menu__contacts">
                        <span data-site-menu-address>{{ data.contacts.address }}</span>
                        <a :href="data.contacts.phone.href" data-site-menu-phone>
                            {{ data.contacts.phone.label }}
                        </a>
                        <a :href="data.contacts.email.href" data-site-menu-email>
                            {{ data.contacts.email.label }}
                        </a>
                    </address>

                    <ul class="site-menu__socials">
                        <li v-for="social in data.contacts.socials" :key="social.id">
                            <a
                                class="site-menu__social"
                                :href="social.url ?? '#'"
                                :aria-label="social.label"
                                :aria-disabled="social.url === null ? 'true' : undefined"
                                :tabindex="social.url === null ? -1 : undefined"
                                :data-site-menu-social="social.id"
                                @click="onSocialClick($event, social)"
                            >
                                <svg
                                    class="site-menu__social-icon"
                                    width="20"
                                    height="20"
                                    aria-hidden="true"
                                    focusable="false"
                                >
                                    <use :href="`#ui-${social.id}`"></use>
                                </svg>
                            </a>
                        </li>
                    </ul>
                </div>
            </footer>
        </nav>
    </div>
</template>
