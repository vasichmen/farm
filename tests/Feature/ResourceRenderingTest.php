<?php

namespace Tests\Feature;

use App\Http\Resources\CategoryResource;
use App\Http\Resources\DTO\HomePageResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\HomePageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Tests\TestCase;

class ResourceRenderingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_home_page_resource_renders_entities(): void
    {
        $resource = (new HomePageResource(HomePageService::getHomePage('autumn', null, 10)))->resolve();

        $this->assertSame('Осень', $resource['season']['name']);
        $this->assertSame('СЕН–НОЯ', $resource['season']['mobile_sub']);
        $this->assertCount(4, $resource['season']['wheel_products']);
        $this->assertSame('Зима', $resource['next_season']['name']);
        $this->assertCount(8, $resource['desktop_products']);
        $this->assertCount(9, $resource['mobile_products']);
        $this->assertSame(9, $resource['products_count']);
        $this->assertCount(4, $resource['seasons']);

        $seasonProductsCounts = collect($resource['seasons'])->pluck('products_count', 'slug');

        $this->assertSame(9, $seasonProductsCounts['autumn']);
        $this->assertSame(9, $seasonProductsCounts['winter']);
        $this->assertSame(8, $seasonProductsCounts['spring']);
        $this->assertSame(9, $seasonProductsCounts['summer']);

        $antonovka = $resource['desktop_products'][0];

        $this->assertSame('Антоновка', $antonovka['name']);
        $this->assertSame('antonovka', $antonovka['slug']);
        $this->assertSame(650, $antonovka['price']);
        $this->assertSame(['id' => 'rub', 'name' => '₽'], $antonovka['price_unit']);
        $this->assertSame(['id' => 'piece', 'name' => 'штука'], $antonovka['sale_unit']);
        $this->assertSame(['id' => 'in_stock', 'name' => 'В наличии'], $antonovka['status']);
        $this->assertSame('product-apples.svg', $antonovka['icon']);
        $this->assertSame(['ящик 5 кг', 'до марта', 'есть сушёные'], $antonovka['facts']);
        $this->assertSame('product-apples.svg', $antonovka['category']['icon']);
        $this->assertSame(1, $antonovka['sort_order']);
        $this->assertTrue($antonovka['show_on_desktop']);
        $this->assertSame('2–10 октября', $antonovka['harvest']);
        $this->assertArrayHasKey('created_at', $antonovka);
        $this->assertArrayNotHasKey('price_label', $antonovka);
        $this->assertArrayNotHasKey('status_label', $antonovka);

        $sad = collect($resource['categories'])->firstWhere('name', 'Сад');

        $this->assertIsArray($sad);
        $this->assertSame(['id' => 'diamond', 'name' => 'Ромб'], $sad['shape']);
        $this->assertIsInt($sad['products_count']);
        $this->assertSame(
            $resource['products_count'],
            collect($resource['categories'])->sum('products_count'),
        );
    }

    public function test_home_page_resource_renders_wheel_section(): void
    {
        $resource = (new HomePageResource(HomePageService::getHomePage('autumn')))->resolve();

        $wheel = $resource['wheel'];

        $this->assertSame('autumn', $wheel['active_season']);
        $this->assertCount(4, $wheel['seasons']);
        $this->assertSame(
            ['summer', 'autumn', 'winter', 'spring'],
            collect($wheel['seasons'])->pluck('slug')->all(),
        );
        $this->assertSame(
            ['summer', 'autumn', 'winter', 'spring'],
            collect($wheel['seasons'])->pluck('slug')->unique()->values()->all(),
        );

        foreach ($wheel['seasons'] as $season) {
            $this->assertLessThanOrEqual(7, Str::length($season['sub']), $season['slug']);
            $this->assertGreaterThanOrEqual(0, $season['products_count'], $season['slug']);
            $this->assertStringContainsString('/?season='.$season['slug'], $season['url']);

            foreach ($season['products'] as $product) {
                $this->assertNotSame('', $product['name']);
                $this->assertStringStartsWith('product-', $product['icon']);
            }
        }

        $autumn = collect($wheel['seasons'])->firstWhere('slug', 'autumn');

        $this->assertIsArray($autumn);
        $this->assertSame('Осень', $autumn['name']);
        $this->assertSame('УРОЖАЙ', $autumn['sub']);
        $this->assertSame(9, $autumn['products_count']);
        $this->assertCount(4, $autumn['products']);
    }

    public function test_direct_product_resource_includes_out_status(): void
    {
        $resource = (new HomePageResource(HomePageService::getHomePage('autumn', 'kartofel')))->resolve();

        $this->assertNotNull($resource['product']);
        $this->assertSame('Картофель', $resource['product']['name']);
        $this->assertSame(['id' => 'out', 'name' => 'Нет в наличии'], $resource['product']['status']);
        $this->assertNull($resource['product']['harvest']);
        $this->assertFalse($resource['product']['show_on_desktop']);
        $this->assertSame('Овощи', $resource['product']['category']['name']);
    }

    public function test_category_resource_renders_shape_and_count(): void
    {
        /** @var Category $category */
        $category = Category::query()->where('name', 'Травы')->firstOrFail();

        $resource = (new CategoryResource($category))->withProductsCount(4)->resolve();

        $this->assertSame('Травы', $resource['name']);
        $this->assertSame('travy', $resource['slug']);
        $this->assertSame(['id' => 'leaf', 'name' => 'Лист'], $resource['shape']);
        $this->assertSame(4, $resource['products_count']);
    }

    public function test_product_resource_renders_pivot_fields_for_season_context(): void
    {
        /** @var Product $product */
        $product = Product::query()->where('slug', 'myata-sushyonaya')->firstOrFail();
        $seasonProducts = HomePageService::getHomePage('winter')->mobileProducts;
        $winterProduct = $seasonProducts->firstWhere('id', $product->id);

        $this->assertInstanceOf(Product::class, $winterProduct);

        $resource = (new ProductResource($winterProduct))->resolve();

        $this->assertFalse($resource['show_on_desktop']);
        $this->assertSame(9, $resource['sort_order']);
        $this->assertSame(['id' => 'in_stock', 'name' => 'В наличии'], $resource['status']);
    }

    public function test_collection_of_products_renders_as_resources(): void
    {
        $products = HomePageService::getHomePage('winter')->desktopProducts;

        /** @var Collection<int, array<string, mixed>> $resources */
        $resources = ProductResource::collection($products)->resolve();

        $this->assertCount(8, $resources);
        $this->assertSame('Сбор «Усадебный»', $resources[0]['name']);
        $this->assertSame(1, $resources[0]['sort_order']);
    }
}
