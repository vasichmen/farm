@props(['season' => null, 'nextSeason' => null])

@php
    // Поля next_label и teaser_icon описывают следующий сезон и хранятся у активного
    // сезона: у осени подпись «Дальше — зима» и иконка зимнего варенья.
    $label = data_get($season, 'next_label');
    $teaser = (string) data_get($season, 'teaser_icon', '');
    $nextName = data_get($nextSeason, 'name');
    $icon = Str::of($teaser)
        ->replaceFirst('product-', '')
        ->replaceLast('.svg', '')
        ->value();
@endphp

@if ($season !== null && $label !== null)
    <a
        class="catalog-next"
        href="{{ route('preorder') }}"
        @if ($nextName !== null) aria-label="Дальше — {{ $nextName }}. Предзаказ" @endif
    >
        <span class="catalog-next__icon">
            <x-product-icon :name="$icon" />
        </span>
        <span class="catalog-next__text">{{ $label }}</span>
        <span class="catalog-next__cta t-button">ПРЕДЗАКАЗ →</span>
    </a>
@endif
