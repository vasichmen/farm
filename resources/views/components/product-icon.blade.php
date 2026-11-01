@props(['name', 'label' => null])

@php
    $accessibility = $label === null
        ? ['aria-hidden' => 'true', 'focusable' => 'false']
        : ['role' => 'img', 'aria-label' => $label];
@endphp

@includeIf('generated.product-icons.'.$name, [
    'attributes' => $attributes->merge($accessibility),
])