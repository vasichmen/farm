<?php

namespace Tests\Feature;

use App\Enums\ProductStatusEnum;
use App\Models\Product;
use App\Models\Season;
use App\Repositories\CategoryRepository;
use App\Repositories\ProductRepository;
use App\Repositories\SeasonRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogRepositoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_directories_are_ordered(): void
    {
        $this->assertSame(
            ['Овощи', 'Сад', 'Травы'],
            CategoryRepository::getAllOrdered()->pluck('name')->all(),
        );

        $this->assertSame(
            ['Весна', 'Лето', 'Осень', 'Зима'],
            SeasonRepository::getAllOrdered()->pluck('name')->all(),
        );
    }

    public function test_seasons_with_visible_products_exclude_out_and_load_pivot(): void
    {
        $seasons = SeasonRepository::getAllOrderedWithVisibleProducts();

        $this->assertCount(4, $seasons);

        foreach ($seasons as $season) {
            $this->assertTrue($season->relationLoaded('products'));
            $this->assertFalse($season->products->contains(
                static fn (Product $product): bool => $product->status === ProductStatusEnum::Out,
            ));
            $this->assertTrue($season->products->every(
                static fn (Product $product): bool => $product->relationLoaded('category')
                    && $product->getAttribute('pivot') !== null,
            ));
        }
    }

    public function test_visible_products_exclude_out_and_load_relations(): void
    {
        $products = ProductRepository::getVisibleWithSeasonsAndCategory();

        $this->assertCount(28, $products);
        $this->assertFalse($products->contains(
            static fn (Product $product): bool => $product->slug === 'kartofel',
        ));
        $this->assertTrue($products->every(
            static fn (Product $product): bool => $product->relationLoaded('seasons')
                && $product->relationLoaded('category'),
        ));
    }

    public function test_out_product_is_available_by_slug(): void
    {
        $product = ProductRepository::getBySlugWithRelations('kartofel');

        $this->assertInstanceOf(Product::class, $product);
        $this->assertSame(ProductStatusEnum::Out, $product->status);
        $this->assertTrue($product->relationLoaded('seasons'));
        $this->assertTrue($product->relationLoaded('category'));
    }

    public function test_missing_slug_returns_null(): void
    {
        $this->assertNull(ProductRepository::getBySlugWithRelations('missing-product'));
    }

    public function test_sync_seasons_adds_and_removes_pivot_rows(): void
    {
        $product = ProductRepository::getBySlugWithRelations('sbor-usadebnyy');
        $this->assertInstanceOf(Product::class, $product);

        $autumn = SeasonRepository::getAllOrdered()->firstWhere('slug', 'autumn');
        $winter = SeasonRepository::getAllOrdered()->firstWhere('slug', 'winter');
        $this->assertInstanceOf(Season::class, $autumn);
        $this->assertInstanceOf(Season::class, $winter);

        $pivot = static fn (int $sortOrder): array => [
            'sort_order' => $sortOrder,
            'show_on_desktop' => true,
            'show_on_wheel' => false,
            'wheel_order' => null,
            'harvest' => null,
        ];

        ProductRepository::syncSeasons($product->id, [
            $autumn->id => $pivot(1),
            $winter->id => $pivot(2),
        ]);

        $this->assertSame(2, DB::table('product_season')->where('product_id', $product->id)->count());

        ProductRepository::syncSeasons($product->id, [
            $autumn->id => $pivot(5),
        ]);

        $rows = DB::table('product_season')->where('product_id', $product->id)->get();

        $this->assertCount(1, $rows);
        $this->assertSame($autumn->id, $rows->first()->season_id);
        $this->assertSame(5, (int) $rows->first()->sort_order);
    }
}
