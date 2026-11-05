<?php

namespace App\Http\Controllers;

use App\DTO\Request\HomePage\HomePageRequestDTO;
use App\Http\Requests\HomePage\HomePageRequest;
use App\Http\Resources\DTO\HomePageResource;
use App\Services\HomePageService;
use Illuminate\Http\Response;
use Illuminate\View\View;

class PageController extends Controller
{
    public function home(HomePageRequest $request): View
    {
        /** @var HomePageRequestDTO $dto */
        $dto = $request->validated();

        $page = (new HomePageResource(HomePageService::getHomePage(
            $dto->season,
            $dto->product,
            $dto->month,
        )))->resolve();

        return view('pages.home', [
            'meta' => self::meta(
                'Усадьба Лыково — фермерские продукты и сезонные прогулки',
                'Усадьба Лыково: сезонные продукты с фермы, прогулки по хозяйству и предзаказ к сезону.',
                'home',
            ),
            'page' => $page,
            'season' => $page['season']['slug'],
        ]);
    }

    public function about(): View
    {
        return view('pages.about', [
            'meta' => self::meta(
                'О семье — Усадьба Лыково',
                'Короткий рассказ о семье «Усадьба Лыково» и о том, что здесь можно увидеть.',
                'about',
            ),
        ]);
    }

    public function preorder(): View
    {
        return view('pages.preorder', [
            'meta' => self::meta(
                'Предзаказ — Усадьба Лыково',
                'Предзаказ сезонных продуктов «Усадьбы Лыково»: как выбрать сезон и оформить заявку.',
                'preorder',
            ),
        ]);
    }

    public function howToOrder(): View
    {
        return view('pages.how-to-order', [
            'meta' => self::meta(
                'Как заказать — Усадьба Лыково',
                'Пошаговое описание заказа продуктов «Усадьбы Лыково»: выбор, предзаказ и получение.',
                'how-to-order',
            ),
        ]);
    }

    public function contacts(): View
    {
        return view('pages.contacts', [
            'meta' => self::meta(
                'Контакты — Усадьба Лыково',
                'Контакты «Усадьбы Лыково»: как связаться, где находится хозяйство и когда приехать.',
                'contacts',
            ),
        ]);
    }

    public function notFound(): Response
    {
        return response()->view('errors.404', [
            'meta' => [
                'title' => 'Страница не найдена — Усадьба Лыково',
                'description' => 'Запрошенная страница не найдена. Вернитесь на главную страницу «Усадьбы Лыково».',
                'canonical' => url()->current(),
            ],
        ], 404);
    }

    /**
     * @return array{title: string, description: string, canonical: string}
     */
    private static function meta(string $title, string $description, string $routeName): array
    {
        return [
            'title' => $title,
            'description' => $description,
            'canonical' => route($routeName),
        ];
    }
}
