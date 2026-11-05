@props(['title'])

<section {{ $attributes->class('page-placeholder') }}>
    <h1 class="page-placeholder__title">{{ $title }}</h1>

    <div class="page-placeholder__text">
        {{ $slot }}
    </div>

    <a class="page-placeholder__back" href="{{ route('home', absolute: false) }}">Назад</a>
</section>