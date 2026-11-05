@props(['emptyText' => null, 'fallbackSeason' => null])

@php
    $fallbackName = data_get($fallbackSeason, 'name');
    $url = route('home', ['season' => data_get($fallbackSeason, 'slug')]);
    // Кнопка называет сезон в винительном падеже: «ПОКАЗАТЬ ВЕСНУ».
    $fallbackAction = match (data_get($fallbackSeason, 'slug')) {
        'spring' => 'ВЕСНУ',
        'summer' => 'ЛЕТО',
        'autumn' => 'ОСЕНЬ',
        'winter' => 'ЗИМУ',
        default => $fallbackName === null ? null : Str::upper((string) $fallbackName),
    };
@endphp

<div class="catalog-state catalog-state--empty">
    <span class="catalog-state__icon">
        <x-ui-icon name="leaf" />
    </span>
    <h2 class="catalog-state__title">В этом сезоне пока ничего не созрело</h2>
    <p class="catalog-state__text">
        {{ $emptyText }}
        @if ($fallbackName !== null)
            Поверните колесо: в соседнем сезоне уже есть урожай.
        @endif
    </p>
    @if ($fallbackName !== null)
        <a class="catalog-state__button" href="{{ $url }}" data-season-link>
            ПОКАЗАТЬ {{ $fallbackAction }} →
        </a>
    @endif
</div>
