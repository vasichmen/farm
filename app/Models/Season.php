<?php

namespace App\Models;

use App\Traits\Model\GeneratesSlugTrait;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Foundation\Abstracts\AbstractModel;

class Season extends AbstractModel
{
    use GeneratesSlugTrait;

    protected $fillable = [
        'slug', // Технический идентификатор сезона в URL (winter, spring, summer, autumn)
        'name', // Название сезона
        'sub', // Короткая подпись сектора колеса (не длиннее 7 знаков)
        'h1', // Заголовок H1 сезона
        'lead', // Лид под заголовком сезона
        'next_label', // Текст полосы «Дальше — …»
        'teaser_icon', // Имя файла иконки следующего сезона
        'mobile_title', // Название сезона для телефона
        'mobile_sub', // Диапазон месяцев для телефона
        'empty_text', // Текст пустого сезона
        'bg_from', // Начальный цвет фона сезона
        'bg_to', // Конечный цвет фона сезона
        'sort_order', // Порядок сезона в годовом цикле
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)
            ->withPivot(['sort_order', 'show_on_desktop', 'show_on_wheel', 'wheel_order', 'harvest']);
    }
}
