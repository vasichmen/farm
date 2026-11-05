@props([
    'season' => null,
    'products' => [],
    'nextSeason' => null,
    'fallbackSeason' => null,
    'state' => 'ready',
])

@php
    $slug = (string) data_get($season, 'slug', '');
    $count = count($products);
    $mode = match (true) {
        $state !== 'ready' => $state,
        $count === 0 => 'empty',
        $count > 8 => 'carousel',
        default => 'grid',
    };
@endphp

<section
    id="catalog-column"
    class="catalog-column"
    role="tabpanel"
    aria-labelledby="season-tab-{{ $slug }}"
    data-state="{{ $state }}"
>
    @if ($state === 'loading')
        <x-catalog.skeleton />
    @else
        <x-catalog.header :season="$season" />

        @if ($mode === 'error')
            <x-catalog.error />
        @elseif ($mode === 'empty')
            <x-catalog.empty :empty-text="data_get($season, 'empty_text')" :fallback-season="$fallbackSeason" />
        @else
            @if ($mode === 'carousel')
                <x-catalog.carousel :products="$products" />
            @else
                <ul class="card-grid catalog-column__grid">
                    @foreach ($products as $index => $product)
                        <x-catalog.card :product="$product" :index="$index" />
                    @endforeach
                </ul>
            @endif

            <x-catalog.next-season :season="$season" :next-season="$nextSeason" />
        @endif
    @endif
</section>
