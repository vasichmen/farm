<?php

namespace App\Models;

use App\Enums\PriceUnitEnum;
use App\Enums\ProductStatusEnum;
use App\Enums\SaleUnitEnum;
use App\Traits\Model\GeneratesSlugTrait;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Foundation\Abstracts\AbstractModel;

/**
 * @property PriceUnitEnum $price_unit
 * @property SaleUnitEnum $sale_unit
 * @property ProductStatusEnum $status
 * @property array<int, string> $facts
 * @property int $price
 * @property int|null $stock
 * @property float $step
 */
class Product extends AbstractModel
{
    use GeneratesSlugTrait;

    protected $fillable = [
        'slug', // Технический идентификатор товара для URL; заполняется автоматически
        'name', // Название товара
        'story_title', // Заголовок истории товара для карточки
        'description', // Описание товара
        'pack', // Фасовка в свободной форме (например, «ящик 5 кг»)
        'price', // Цена в целых рублях
        'price_unit', // Единица цены (PriceUnitEnum)
        'sale_unit', // Единица продажи (SaleUnitEnum)
        'step', // Шаг продажи: 1 или 0,5
        'facts', // Список фактов-чипов для карточки
        'status', // Статус наличия (ProductStatusEnum)
        'stock', // Остаток для статуса «осталось мало»
        'icon', // Имя файла иконки товара
        'category_id', // Ссылка на категорию товара
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_unit' => PriceUnitEnum::class,
            'sale_unit' => SaleUnitEnum::class,
            'status' => ProductStatusEnum::class,
            'facts' => 'array',
            'price' => 'integer',
            'stock' => 'integer',
            'step' => 'float',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsToMany<Season, $this>
     */
    public function seasons(): BelongsToMany
    {
        return $this->belongsToMany(Season::class)
            ->withPivot(['sort_order', 'show_on_desktop', 'show_on_wheel', 'wheel_order', 'harvest']);
    }
}
