<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @include('partials.meta')
    <style>
        :root {
            color-scheme: light;
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            font-family: Georgia, 'Times New Roman', serif;
            color: #22352a;
            background: #f3ebdb;
        }

        .error-page {
            max-width: 36rem;
        }

        .error-page h1 {
            margin: 0 0 16px;
            font-size: 40px;
            font-weight: 600;
            line-height: 1.1;
        }

        .error-page p {
            margin: 0 0 16px;
            font-size: 18px;
            line-height: 1.5;
        }

        .error-page a {
            color: #7f5d1f;
        }
    </style>
</head>
<body>
    <main class="error-page">
        @yield('content')
    </main>
</body>
</html>
