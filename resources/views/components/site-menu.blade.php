@php
    $items = collect(config('navigation.items'))
        ->filter(fn (array $item): bool => $item['in_menu'])
        ->map(fn (array $item): array => [
            'id' => $item['id'],
            'label' => $item['label'],
            'url' => route($item['route']),
            'active' => request()->routeIs($item['route']),
        ])
        ->values()
        ->all();

    $props = [
        'items' => $items,
        'contacts' => config('navigation.contacts'),
    ];
@endphp

<div
    data-island="site-menu"
    data-props='@json($props, JSON_HEX_APOS | JSON_HEX_QUOT)'
>
    <button
        type="button"
        class="site-menu__toggle"
        aria-label="Открыть меню"
        aria-expanded="false"
        aria-controls="site-menu-fallback"
    >
        <span class="site-menu__burger" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
        </span>
    </button>

    <noscript>
        <ul class="site-menu__fallback-list" id="site-menu-fallback">
            @foreach ($items as $item)
                <li>
                    <a
                        href="{{ $item['url'] }}"
                        @if ($item['active']) aria-current="page" @endif
                    >{{ $item['label'] }}</a>
                </li>
            @endforeach
        </ul>
    </noscript>
</div>