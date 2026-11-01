@props(['name', 'label' => null])

@php
    $accessibility = $label === null
        ? ['aria-hidden' => 'true', 'focusable' => 'false']
        : ['role' => 'img', 'aria-label' => $label];
@endphp

<svg {{ $attributes->class('ui-icon')->merge($accessibility + ['width' => 24, 'height' => 24]) }}>
    <use href="#ui-{{ $name }}"></use>
</svg>