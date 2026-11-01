@props(['theme' => 'dark'])

<img
    {{ $attributes->class('logo-lockup')->merge([
        'src' => asset('brand/logo-lockup-on-'.$theme.'-outlined.svg'),
        'alt' => 'Усадьба Лыково',
    ]) }}
>