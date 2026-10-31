<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @include('partials.meta')
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
</head>
<body>
    <header class="site-header">
        <nav class="site-nav" aria-label="Основная навигация">
            <a href="{{ route('home') }}">Главная</a>
            <a href="{{ route('about') }}">О хозяйстве</a>
            <a href="{{ route('preorder') }}">Предзаказ</a>
            <a href="{{ route('how-to-order') }}">Как оформить заказ</a>
            <a href="{{ route('contacts') }}">Контакты</a>
        </nav>
    </header>

    <main class="site-main">
        @yield('content')
    </main>
</body>
</html>
