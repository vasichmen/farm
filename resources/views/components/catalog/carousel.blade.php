@props(['products' => [], 'trackId' => 'catalog-track'])

<div class="catalog-carousel">
    <ul
        class="catalog-carousel__track"
        id="{{ $trackId }}"
        tabindex="0"
        role="group"
        aria-label="Товары сезона"
    >
        @foreach ($products as $index => $product)
            <x-catalog.card :product="$product" :index="$index" />
        @endforeach
    </ul>

    <div
        class="catalog-carousel__island"
        data-island="catalog-carousel"
        data-props='@json(['track_id' => $trackId])'
    ></div>
</div>
