<?php

namespace Tests\Feature;

use App\Enums\CategoryShapeEnum;
use App\Models\Category;
use App\Models\Season;
use App\Repositories\CategoryRepository;
use App\Repositories\SeasonRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelSlugGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_slug_is_generated_from_name_on_saving(): void
    {
        $category = CategoryRepository::create($this->categoryData('Тестовый раздел'));

        $this->assertSame(Category::makeSlug('Тестовый раздел'), $category->slug);
    }

    public function test_repeated_save_does_not_change_slug(): void
    {
        $category = CategoryRepository::create($this->categoryData('Тестовый раздел'));
        $slug = $category->slug;

        CategoryRepository::update($category->id, ['color' => '#FFFFFF']);

        $this->assertSame($slug, CategoryRepository::getModel($category->id)?->slug);
    }

    public function test_busy_slug_gets_numeric_suffix(): void
    {
        $first = CategoryRepository::create($this->categoryData('Тестовый раздел'));
        $second = CategoryRepository::create($this->categoryData('Тестовый раздел'));

        $this->assertSame(Category::makeSlug('Тестовый раздел'), $first->slug);
        $this->assertSame(Category::makeSlug('Тестовый раздел').'-2', $second->slug);
    }

    public function test_explicit_slug_is_not_overwritten(): void
    {
        $season = SeasonRepository::create([
            'slug' => 'winter',
            'name' => 'Зима',
            'sub' => 'ЗАПАСЫ',
            'h1' => 'H1',
            'lead' => 'Лид.',
            'next_label' => 'Дальше — весна.',
            'teaser_icon' => 'product-dill.svg',
            'mobile_title' => 'Зима',
            'mobile_sub' => 'ДЕК–ФЕВ',
            'empty_text' => 'Пусто.',
            'bg_from' => '#2B3E44',
            'bg_to' => '#1F2E33',
            'sort_order' => 4,
        ]);

        $this->assertInstanceOf(Season::class, $season);
        $this->assertSame('winter', $season->slug);
    }

    /**
     * @return array<string, mixed>
     */
    private function categoryData(string $name): array
    {
        return [
            'name' => $name,
            'color' => '#D68A4E',
            'shape' => CategoryShapeEnum::Circle,
            'icon' => 'product-carrot.svg',
            'sort_order' => 1,
        ];
    }
}
