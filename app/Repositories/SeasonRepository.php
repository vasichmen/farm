<?php

namespace App\Repositories;

use App\Enums\ProductStatusEnum;
use App\Models\Season;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractRepository;

class SeasonRepository extends AbstractRepository
{
    /**
     * @return Collection<int, Season>
     */
    public static function getAllOrdered(): Collection
    {
        return static::query()
            ->cacheFor(false)
            ->orderBy(['sort_order' => 'asc'])
            ->get();
    }

    /**
     * Сезоны с видимыми товарами и pivot-полями для страницы главной.
     *
     * @return Collection<int, Season>
     */
    public static function getAllOrderedWithVisibleProducts(): Collection
    {
        return static::query()
            ->cacheFor(false)
            ->with([
                'products' => static fn ($query) => $query
                    ->where('status', '!=', ProductStatusEnum::Out->value)
                    ->with('category'),
            ])
            ->orderBy(['sort_order' => 'asc'])
            ->get();
    }
}
