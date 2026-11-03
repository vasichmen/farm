<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\Season;
use Illuminate\Support\Collection;
use Laravel\Foundation\Abstracts\AbstractResource;

class SeasonResource extends AbstractResource
{
    private Season $season;

    /** @var Collection<int, Product>|null */
    private ?Collection $wheelProducts = null;

    private int $productsCount = 0;

    public function __construct(Season $season)
    {
        parent::__construct($season);

        $this->season = $season;
    }

    /**
     * @param  Collection<int, Product>  $wheelProducts
     */
    public function withWheelProducts(Collection $wheelProducts): static
    {
        $this->wheelProducts = $wheelProducts;

        return $this;
    }

    public function withProductsCount(int $productsCount): static
    {
        $this->productsCount = $productsCount;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $fields = $this->getFields([
            'id',
            'slug',
            'name',
            'sub',
            'h1',
            'lead',
            'next_label',
            'teaser_icon',
            'mobile_title',
            'mobile_sub',
            'empty_text',
            'bg_from',
            'bg_to',
        ]);

        return [
            ...$fields,
            'sort_order' => (int) $this->season->sort_order,
            'products_count' => $this->productsCount,
            'wheel_products' => ProductResource::collection($this->wheelProducts ?? collect())->resolve(),
            ...$this->renderTimestamps(),
        ];
    }
}
