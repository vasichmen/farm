@props(['status' => null, 'stock' => null])

@php
    $statusId = data_get($status, 'id', 'in_stock');
    $stockValue = is_numeric($stock) ? (int) $stock : null;
@endphp

<div {{ $attributes->class('catalog-card__status') }} data-status="{{ $statusId }}">
    @if ($statusId === 'few')
        <span class="catalog-card__badge catalog-card__badge--few">
            {{ $stockValue === null ? 'осталось мало' : 'осталось '.$stockValue }}
        </span>
    @elseif ($statusId === 'preorder')
        <span class="catalog-card__badge catalog-card__badge--preorder">предзаказ</span>
    @elseif ($statusId === 'out')
        <span class="catalog-card__out">нет в наличии</span>
    @endif
</div>
