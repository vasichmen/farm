<?php

namespace App\Repositories;

use App\Enums\ProductStatusEnum;
use App\Models\Product;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractRepository;

class ProductRepository extends AbstractRepository
{
    /**
     * Видимые товары для сеток, плиток, колеса и счётчиков.
     *
     * @return Collection<int, Product>
     */
    public static function getVisibleWithSeasonsAndCategory(): Collection
    {
        return static::query()
            ->cacheFor(false)
            ->where('status', '!=', ProductStatusEnum::Out->value)
            ->with(['seasons', 'category'])
            ->get();
    }

    /**
     * Товар по slug для прямой ссылки — включая товары вне наличия.
     */
    public static function getBySlugWithRelations(string $slug): ?Product
    {
        /** @var Product|null $product */
        $product = static::query()
            ->cacheFor(false)
            ->where('slug', $slug)
            ->with(['seasons', 'category'])
            ->find();

        return $product;
    }

    /**
     * Синхронизирует сезоны товара с их настройками показа.
     *
     * @param  array<string, array<string, mixed>>  $seasons  ключи — id сезонов, значения — pivot-поля
     */
    public static function syncSeasons(string $productId, array $seasons): void
    {
        /** @var Product|null $product */
        $product = static::newQuery()->find($productId);

        $product?->seasons()->sync($seasons);
    }
}
