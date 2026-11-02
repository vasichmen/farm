<?php

namespace App\Models;

use App\Enums\CategoryShapeEnum;
use App\Traits\Model\GeneratesSlugTrait;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Foundation\Abstracts\AbstractModel;

class Category extends AbstractModel
{
    use GeneratesSlugTrait;

    protected $fillable = [
        'slug', // Технический идентификатор для URL; заполняется автоматически
        'name', // Название категории
        'color', // Цвет значка в формате HEX
        'shape', // Форма значка категории (CategoryShapeEnum)
        'icon', // Имя файла иконки категории
        'sort_order', // Порядок вывода категории в списках
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'shape' => CategoryShapeEnum::class,
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
