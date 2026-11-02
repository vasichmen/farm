<?php

namespace Database\Seeders;

use App\Enums\CategoryShapeEnum;
use App\Models\Category;
use App\Repositories\CategoryRepository;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            [
                'name' => 'Овощи',
                'color' => '#D68A4E',
                'shape' => CategoryShapeEnum::Circle,
                'icon' => 'product-carrot.svg',
                'sort_order' => 1,
            ],
            [
                'name' => 'Сад',
                'color' => '#C25C48',
                'shape' => CategoryShapeEnum::Diamond,
                'icon' => 'product-apples.svg',
                'sort_order' => 2,
            ],
            [
                'name' => 'Травы',
                'color' => '#8FA58A',
                'shape' => CategoryShapeEnum::Leaf,
                'icon' => 'product-herbal-tea.svg',
                'sort_order' => 3,
            ],
        ]);

        foreach ($categories as $category) {
            CategoryRepository::updateOrCreate(
                ['slug' => Category::makeSlug($category['name'])],
                $category,
            );
        }
    }
}
