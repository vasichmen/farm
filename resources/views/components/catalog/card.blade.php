@props(['product', 'index' => 0])

@php
    $statusId = data_get($product, 'status.id', 'in_stock');
    $isOut = $statusId === 'out';
    $overline = collect([data_get($product, 'category.name'), data_get($product, 'harvest')])
        ->filter(static fn ($part): bool => is_string($part) && $part !== '')
        ->implode(' · ');
    $icon = Str::of((string) data_get($product, 'icon', ''))
        ->replaceFirst('product-', '')
        ->replaceLast('.svg', '')
        ->value();
    $slug = (string) data_get($product, 'slug', '');
    $name = (string) data_get($product, 'name', '');
    $href = request()->fullUrlWithQuery(['product' => $slug]);
@endphp

<li
    {{ $attributes->class(['catalog-card', 'catalog-card--out' => $isOut]) }}
    style="--card-index: {{ (int) $index }}"
>
    <div class="catalog-card__pic">
        <x-product-icon :name="$icon" />
    </div>

    @if ($overline !== '')
        <p class="catalog-card__overline" title="{{ $overline }}">{{ $overline }}</p>
    @endif

    <p class="catalog-card__title">{{ data_get($product, 'name') }}</p>
    <p class="catalog-card__pack">{{ data_get($product, 'pack') }}</p>

    <div class="catalog-card__footer">
        @unless ($isOut)
            <x-catalog.price :price="data_get($product, 'price', 0)" :unit="data_get($product, 'price_unit')" />
        @endunless

        <x-catalog.status :status="data_get($product, 'status')" :stock="data_get($product, 'stock')" />
    </div>

    <a
        class="catalog-card__link"
        href="{{ $href }}"
        aria-label="Открыть товар «{{ $name }}»"
        aria-haspopup="dialog"
        data-product-modal
        data-product-slug="{{ $slug }}"
    ></a>
</li>
