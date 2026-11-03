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
@endpush

@section('content')
    <section class="home-wheel" aria-label="Колесо года">
        <div class="desktop-grid">
            <div
                class="season-wheel"
                data-island="season-wheel"
                data-props='@json($page['wheel'], JSON_HEX_APOS | JSON_HEX_QUOT)'
            >
                <nav class="season-wheel__fallback" aria-label="Сезоны">
                    @foreach ($page['wheel']['seasons'] as $wheelSeason)
                        <a
                            href="{{ $wheelSeason['url'] }}"
                            @if ($wheelSeason['slug'] === $page['wheel']['active_season']) aria-current="page" @endif
                        >
                            <span class="season-wheel__fallback-name">{{ $wheelSeason['name'] }}</span>
                            <span class="season-wheel__fallback-sub">{{ $wheelSeason['products_count'] > 0 ? $wheelSeason['sub'] : 'ПОКА ПУСТО' }}</span>
                        </a>
                    @endforeach
                </nav>
            </div>
        </div>
    </section>

    <section class="prose">
        <h1>Усадьба Лыково</h1>
        <p>
            Здесь скоро появится главная страница: сезоны, продукты с фермы и прогулки по хозяйству.
            Пока это каркас сайта — он уже открывается по прямому адресу и работает без JavaScript.
        </p>
    </section>
@endsection
