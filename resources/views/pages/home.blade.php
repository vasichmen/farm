@extends('layouts.app')

@push('head')
    <script>
        (function () {
            var params = new URLSearchParams(window.location.search);

            if (params.has('season') || params.has('month')) {
                return;
            }

            var month = new Date().getMonth() + 1;
            var season = month >= 3 && month <= 5
                ? 'spring'
                : month >= 6 && month <= 8
                    ? 'summer'
                    : month >= 9 && month <= 11
                        ? 'autumn'
                        : 'winter';

            params.set('season', season);
            window.location.replace(
                window.location.pathname + '?' + params.toString() + window.location.hash,
            );
        })();
    </script>

    <script>
        (function () {
            // Ключи совпадают с resources/js/lib/season-navigation.ts и SeasonWheel.vue.
            var transitionKey = 'catalog-column:transition';
            var visitedKey = 'season-wheel:visited';
            var root = document.documentElement;

            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }

            try {
                var hasTransition = window.sessionStorage.getItem(transitionKey) === '1';

                window.sessionStorage.removeItem(transitionKey);

                if (hasTransition || window.sessionStorage.getItem(visitedKey) !== '1') {
                    root.dataset.entrance = 'on';
                }
            } catch (error) {
                // Без sessionStorage вход не проигрываем: контент важнее анимации.
            }
        })();
    </script>
@endpush

@section('content')
    <section class="home-wheel">
        <div class="desktop-grid">
            <div
                class="season-wheel"
                data-island="season-wheel"
                data-props='@json($page['wheel'], JSON_HEX_APOS | JSON_HEX_QUOT)'
            >
                <nav class="season-wheel__fallback" aria-label="Сезоны">
                    @foreach ($page['wheel']['seasons'] as $wheelSeason)
                        <a
                            id="season-tab-{{ $wheelSeason['slug'] }}"
                            href="{{ $wheelSeason['url'] }}"
                            aria-controls="catalog-column"
                            @if ($wheelSeason['slug'] === $page['wheel']['active_season']) aria-current="page" @endif
                        >
                            <span class="season-wheel__fallback-name">{{ $wheelSeason['name'] }}</span>
                            <span class="season-wheel__fallback-sub">{{ $wheelSeason['products_count'] > 0 ? $wheelSeason['sub'] : 'ПОКА ПУСТО' }}</span>
                        </a>
                    @endforeach
                </nav>
            </div>

            <x-catalog.column
                :season="$page['season']"
                :products="$page['desktop_products']"
                :next-season="$page['next_season']"
                :fallback-season="$page['fallback_season']"
                :state="count($page['desktop_products']) > 0 ? 'ready' : 'empty'"
            />
        </div>
    </section>
@endsection
