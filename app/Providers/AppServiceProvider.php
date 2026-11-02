<?php

namespace App\Providers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Season;
use Laravel\Foundation\Abstracts\AbstractAppServiceProvider;

class AppServiceProvider extends AbstractAppServiceProvider
{
    /**
     * @var array<class-string>
     */
    protected array $modelList = [
        Category::class,
        Season::class,
        Product::class,
    ];
}
