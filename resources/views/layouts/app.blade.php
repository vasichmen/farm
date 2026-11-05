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
    @include('partials.site-header')

    <main class="site-main">
        <div class="container">
            @yield('content')
        </div>
    </main>

    @stack('overlays')
</body>
</html>
