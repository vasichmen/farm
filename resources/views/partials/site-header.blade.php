@php
    $headerItems = collect(config('navigation.items'))
        ->filter(fn (array $item): bool => $item['in_header'])
        ->values();
@endphp

<header class="site-header">
    <div class="container site-header__inner">
        <div class="site-header__menu">
            <x-site-menu />
        </div>

        <a class="site-header__logo" href="{{ route('home') }}">
            <x-logo theme="dark" />
        </a>

        <nav class="site-nav" aria-label="Основная навигация">
            @foreach ($headerItems as $item)
                <a
                    href="{{ route($item['route']) }}"
                    @if (request()->routeIs($item['route'])) aria-current="page" @endif
                >{{ $item['label'] }}</a>
            @endforeach
        </nav>
    </div>
</header>