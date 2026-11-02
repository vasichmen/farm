<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Laravel\Foundation\Abstracts\AbstractResource;

class ProductResource extends AbstractResource
{
    private Product $product;

    private ?Pivot $seasonPivot = null;

    public function __construct(Product $product)
    {
        parent::__construct($product);

        $this->product = $product;
    }

    public function withPivot(?Pivot $pivot): static
    {
        $this->seasonPivot = $pivot;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $fields = $this->getFields(['id', 'slug', 'name', 'story_title', 'description', 'pack', 'icon']);
        $numbers = $this->getFields(['price', 'step', 'stock']);
        $pivot = $this->seasonPivot ?? $this->product->getAttribute('pivot');
        $pivot = $pivot instanceof Pivot ? $pivot : null;
        $wheelOrder = $pivot?->getAttribute('wheel_order');
        $harvest = $pivot?->getAttribute('harvest');

        return [
            ...$fields,
            'price' => (int) ($numbers['price'] ?? 0),
            'step' => (float) ($numbers['step'] ?? 0),
            'stock' => isset($numbers['stock']) ? (int) $numbers['stock'] : null,
            'facts' => $this->product->facts ?? [],
            ...$this->getEnum('price_unit'),
            ...$this->getEnum('sale_unit'),
            ...$this->getEnum('status'),
            ...$this->getRelation('category', CategoryResource::class),
            'sort_order' => (int) ($pivot?->getAttribute('sort_order') ?? 0),
            'show_on_desktop' => (bool) ($pivot?->getAttribute('show_on_desktop') ?? false),
            'show_on_wheel' => (bool) ($pivot?->getAttribute('show_on_wheel') ?? false),
            'wheel_order' => is_numeric($wheelOrder) ? (int) $wheelOrder : null,
            'harvest' => is_string($harvest) ? $harvest : null,
            ...$this->renderTimestamps(),
        ];
    }
}
