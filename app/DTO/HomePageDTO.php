<?php

namespace App\DTO;

use App\Models\Category;
use App\Models\Product;
use App\Models\Season;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractDto;

class HomePageDTO extends AbstractDto
{
    /**
     * @param  Collection<int, Category>  $categories
     * @param  Collection<int, Product>  $desktopProducts
     * @param  Collection<int, Product>  $mobileProducts
     * @param  Collection<int, Season>  $seasons
     * @param  Collection<string, int>  $categoryCounts
     * @param  Collection<string, Collection<int, Product>>  $wheelProductsBySeason
     * @param  Collection<string, int<0, max>>  $seasonProductsCounts
     */
    public function __construct(
        public Season $season,
        public Collection $categories,
        public Collection $desktopProducts,
        public Collection $mobileProducts,
        public ?Product $product,
        public ?Pivot $productPivot,
        public Collection $seasons,
        public ?Season $nextSeason,
        public ?Season $fallbackSeason,
        public int $productsCount,
        public Collection $categoryCounts,
        public Collection $wheelProductsBySeason,
        public Collection $seasonProductsCounts,
    ) {
        parent::__construct([]);
    }
}
