<?php

namespace App\Repositories;

use App\Models\Category;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractRepository;

class CategoryRepository extends AbstractRepository
{
    /**
     * @return Collection<int, Category>
     */
    public static function getAllOrdered(): Collection
    {
        return static::query()
            ->cacheFor(false)
            ->orderBy(['sort_order' => 'asc'])
            ->get();
    }
}
