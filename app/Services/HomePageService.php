<?php

namespace App\Services;

use App\DTO\HomePageDTO;
use App\Exceptions\SeasonNotFoundException;
use App\Models\Category;
use App\Models\Product;
use App\Models\Season;
use App\Repositories\CategoryRepository;
use App\Repositories\ProductRepository;
use App\Repositories\SeasonRepository;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractService;

class HomePageService extends AbstractService
{
    private const WHEEL_LIMIT = 4;

    /**
     * @param  int|null  $month  локальный месяц пользователя (1–12), если сезон не задан в URL
     */
    public static function getHomePage(
        ?string $seasonSlug = null,
        ?string $productSlug = null,
        ?int $month = null,
    ): HomePageDTO {
        /** @var Collection<int, Season> $seasons */
        $seasons = SeasonRepository::getAllOrderedWithVisibleProducts();

        if ($seasons->isEmpty()) {
            throw new SeasonNotFoundException;
        }

        /** @var Collection<int, Category> $categories */
        $categories = CategoryRepository::getAllOrdered();

        /** @var Collection<string, Collection<int, Product>> $seasonProducts */
        $seasonProducts = $seasons->mapWithKeys(
            static fn (Season $season): array => [
                $season->id => $season->products
                    ->sortBy(static fn (Product $product): int => (int) self::pivotValue($product, 'sort_order'))
                    ->values(),
            ],
        );

        $activeSeason = self::resolveActiveSeason($seasons, $seasonSlug, $month);
        $activeProducts = $seasonProducts->get($activeSeason->id, collect())->values();

        $desktopProducts = $activeProducts
            ->filter(static fn (Product $product): bool => self::pivotValue($product, 'show_on_desktop'))
            ->values();

        $wheelProductsBySeason = $seasonProducts->map(
            static fn (Collection $products): Collection => self::buildWheelProducts($products),
        );

        $seasonProductsCounts = $seasonProducts->map(
            static fn (Collection $products): int => $products->count(),
        );

        $activeIndex = (int) $seasons->search(
            static fn (Season $season): bool => $season->id === $activeSeason->id,
        );

        $nextSeasonModel = $seasons->get(($activeIndex + 1) % $seasons->count());

        [$product, $productPivot] = self::resolveProduct($productSlug, $activeProducts);

        return new HomePageDTO(
            season: $activeSeason,
            categories: $categories,
            desktopProducts: $desktopProducts,
            mobileProducts: $activeProducts,
            product: $product,
            productPivot: $productPivot,
            seasons: $seasons,
            nextSeason: $nextSeasonModel instanceof Season ? $nextSeasonModel : null,
            fallbackSeason: self::resolveFallbackSeason(
                $seasons,
                $seasonProducts,
                $activeSeason->id,
                $activeIndex,
            ),
            productsCount: $activeProducts->count(),
            categoryCounts: $activeProducts->countBy('category_id'),
            wheelProductsBySeason: $wheelProductsBySeason,
            seasonProductsCounts: $seasonProductsCounts,
        );
    }

    /**
     * @param  Collection<int, Season>  $seasons
     */
    private static function resolveActiveSeason(
        Collection $seasons,
        ?string $seasonSlug,
        ?int $month,
    ): Season {
        if ($seasonSlug !== null && $seasonSlug !== '') {
            $explicitSeason = $seasons->firstWhere('slug', $seasonSlug);

            if ($explicitSeason instanceof Season) {
                return $explicitSeason;
            }
        }

        $monthSlug = $month !== null ? self::seasonSlugForMonth($month) : null;
        $monthSeason = $monthSlug !== null ? $seasons->firstWhere('slug', $monthSlug) : null;

        if ($monthSeason instanceof Season) {
            return $monthSeason;
        }

        /** @var Season $firstSeason */
        $firstSeason = $seasons->first();

        return $firstSeason;
    }

    private static function seasonSlugForMonth(int $month): ?string
    {
        return match ($month) {
            12, 1, 2 => 'winter',
            3, 4, 5 => 'spring',
            6, 7, 8 => 'summer',
            9, 10, 11 => 'autumn',
            default => null,
        };
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return Collection<int, Product>
     */
    private static function buildWheelProducts(Collection $products): Collection
    {
        return $products
            ->filter(static fn (Product $product): bool => self::pivotValue($product, 'show_on_wheel'))
            ->sortBy(static fn (Product $product): int => (int) (
                self::pivotValue($product, 'wheel_order') ?? self::pivotValue($product, 'sort_order')
            ))
            ->take(self::WHEEL_LIMIT)
            ->values();
    }

    /**
     * @param  Collection<int, Season>  $seasons
     * @param  Collection<string, Collection<int, Product>>  $seasonProducts
     */
    private static function resolveFallbackSeason(
        Collection $seasons,
        Collection $seasonProducts,
        string $activeSeasonId,
        int $activeIndex,
    ): ?Season {
        if ($seasonProducts->get($activeSeasonId, collect())->isNotEmpty()) {
            return null;
        }

        $seasonsCount = $seasons->count();

        for ($offset = 1; $offset < $seasonsCount; $offset++) {
            $candidate = $seasons->get(($activeIndex + $offset) % $seasonsCount);

            if (! $candidate instanceof Season) {
                continue;
            }

            if ($seasonProducts->get($candidate->id, collect())->isNotEmpty()) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, Product>  $activeProducts
     * @return array{0: Product|null, 1: Pivot|null}
     */
    private static function resolveProduct(?string $productSlug, Collection $activeProducts): array
    {
        if ($productSlug === null || $productSlug === '') {
            return [null, null];
        }

        $product = ProductRepository::getBySlugWithRelations($productSlug);

        if ($product === null) {
            return [null, null];
        }

        $activeProduct = $activeProducts->firstWhere('id', $product->id);

        if ($activeProduct instanceof Product) {
            return [$activeProduct, self::productPivot($activeProduct)];
        }

        /** @var Season|null $firstSeason */
        $firstSeason = $product->seasons->first();
        $firstPivot = $firstSeason?->getAttribute('pivot');

        return [$product, $firstPivot instanceof Pivot ? $firstPivot : null];
    }

    private static function productPivot(Product $product): ?Pivot
    {
        $pivot = $product->getAttribute('pivot');

        return $pivot instanceof Pivot ? $pivot : null;
    }

    private static function pivotValue(Product $product, string $key): mixed
    {
        return self::productPivot($product)?->getAttribute($key);
    }
}
