@props([
    'products' => [],
    'initialProduct' => null,
    'preorderUrl' => null,
])

@php
    $props = [
        'products' => $products,
        'initial_product' => $initialProduct,
        'preorder_url' => $preorderUrl,
    ];
@endphp

<div
    data-island="product-modal"
    data-props='@json($props, JSON_HEX_APOS | JSON_HEX_QUOT)'
></div>