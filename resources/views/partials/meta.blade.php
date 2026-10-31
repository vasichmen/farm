@php
    $metaTitle = $meta['title'] ?? config('app.name');
    $metaDescription = $meta['description'] ?? 'Усадьба Лыково — фермерские продукты и сезонные прогулки.';
    $metaCanonical = $meta['canonical'] ?? url()->current();
@endphp
<title>{{ $metaTitle }}</title>
<meta name="description" content="{{ $metaDescription }}">
<link rel="canonical" href="{{ $metaCanonical }}">
