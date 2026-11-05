@props(['price' => 0, 'unit' => null])

@php
    $amount = number_format((int) $price, 0, ',', "\u{00A0}");
    $suffix = data_get($unit, 'id') === 'rub_per_kg' ? ' ₽/кг' : ' ₽';
@endphp

<span {{ $attributes->class('catalog-card__price') }}>{{ $amount }}{{ $suffix }}</span>
