<?php

namespace App\Http\Resources\DTO;

use App\DTO\HomePageDTO;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\SeasonResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Season;
use Illuminate\Support\Str;
use Laravel\Foundation\Abstracts\AbstractResource;

class HomePageResource extends AbstractResource
{
    /**
     * Порядок сезонов по часовой стрелке на колесе: лето → осень → зима → весна.
     */
    private const WHEEL_ORDER = ['summer', 'autumn', 'winter', 'spring'];

    private HomePageDTO $data;

    public function __construct(HomePageDTO $data)
    {
        parent::__construct($data);

        $this->data = $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'season' => $this->renderSeason($this->data->season),
            'categories' => $this->data->categories
                ->map(fn (Category $category): array => (new CategoryResource($category))
                    ->withProductsCount($this->data->categoryCounts->get($category->id))
                    ->resolve())
                ->values()
                ->all(),
            'desktop_products' => ProductResource::collection($this->data->desktopProducts)->resolve(),
            'mobile_products' => ProductResource::collection($this->data->mobileProducts)->resolve(),
            'product' => $this->data->product !== null
                ? (new ProductResource($this->data->product))->withPivot($this->data->productPivot)->resolve()
                : null,
            'seasons' => $this->data->seasons
                ->map(fn (Season $season): array => $this->renderSeason($season))
                ->values()
                ->all(),
            'next_season' => $this->data->nextSeason !== null
                ? $this->renderSeason($this->data->nextSeason)
                : null,
            'fallback_season' => $this->data->fallbackSeason !== null
                ? $this->renderSeason($this->data->fallbackSeason)
                : null,
            'products_count' => $this->data->productsCount,
            'wheel' => [
                'active_season' => $this->data->season->slug,
                'seasons' => $this->data->seasons
                    ->sortBy(fn (Season $season): int => (int) collect(self::WHEEL_ORDER)
                        ->search($season->slug))
                    ->values()
                    ->map(fn (Season $season): array => $this->renderWheelSeason($season))
                    ->all(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function renderWheelSeason(Season $season): array
    {
        return [
            'slug' => $season->slug,
            'name' => $season->name,
            'sub' => $season->sub,
            'url' => Str::finish(route('home'), '/').'?season='.$season->slug,
            'products_count' => $this->data->seasonProductsCounts->get($season->id, 0),
            'products' => $this->data->wheelProductsBySeason
                ->get($season->id, collect())
                ->map(static fn (Product $product): array => [
                    'name' => $product->name,
                    'icon' => $product->icon,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function renderSeason(Season $season): array
    {
        return (new SeasonResource($season))
            ->withWheelProducts($this->data->wheelProductsBySeason->get($season->id, collect()))
            ->withProductsCount($this->data->seasonProductsCounts->get($season->id, 0))
            ->resolve();
    }
}
