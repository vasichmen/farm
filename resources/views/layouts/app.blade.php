<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    @include('partials.meta')
    @include('partials.favicon')
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
    @fonts
    @stack('head')
</head>
<body data-season="{{ $season ?? 'autumn' }}">
    @include('generated.ui-sprite')
    <header class="site-header">
        <div class="container">
            <nav class="site-nav" aria-label="Основная навигация">
                <a href="{{ route('home') }}">Главная</a>
                <a href="{{ route('about') }}">О хозяйстве</a>
                <a href="{{ route('preorder') }}">Предзаказ</a>
                <a href="{{ route('how-to-order') }}">Как оформить заказ</a>
                <a href="{{ route('contacts') }}">Контакты</a>
            </nav>
        </div>
    </header>

    <main class="site-main">
        <div class="container">
            @yield('content')
        </div>
    </main>

    @stack('overlays')
</body>
</html>
