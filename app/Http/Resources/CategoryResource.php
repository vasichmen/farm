<?php

namespace App\Http\Resources;

use App\Models\Category;
use Laravel\Foundation\Abstracts\AbstractResource;

class CategoryResource extends AbstractResource
{
    private Category $category;

    private ?int $productsCount = null;

    public function __construct(Category $category)
    {
        parent::__construct($category);

        $this->category = $category;
    }

    public function withProductsCount(?int $productsCount): static
    {
        $this->productsCount = $productsCount;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $fields = $this->getFields(['id', 'slug', 'name', 'color', 'icon']);

        return [
            ...$fields,
            'sort_order' => (int) $this->category->sort_order,
            ...$this->getEnum('shape'),
            'products_count' => $this->productsCount,
            ...$this->renderTimestamps(),
        ];
    }
}
