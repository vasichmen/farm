<?php

namespace Tests\Feature;

use App\Enums\ProductStatusEnum;
use App\Models\Product;
use App\Models\Season;
use App\Repositories\ProductRepository;
use App\Repositories\SeasonRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_seed_creates_catalog(): void
    {
        $this->seed();

        $this->assertSame(3, DB::table('categories')->count());
        $this->assertSame(4, DB::table('seasons')->count());
        $this->assertSame(29, DB::table('products')->count());
        $this->assertSame(36, DB::table('product_season')->count());
    }

    public function test_repeated_seed_does_not_create_duplicates(): void
    {
        $this->seed();
        $this->seed();

        $this->assertSame(3, DB::table('categories')->count());
        $this->assertSame(4, DB::table('seasons')->count());
        $this->assertSame(29, DB::table('products')->count());
        $this->assertSame(36, DB::table('product_season')->count());
    }

    public function test_shared_products_are_single_records_with_two_seasons(): void
    {
        $this->seed();

        $this->assertSame(['autumn', 'winter'], $this->seasonSlugs('sbor-usadebnyy'));
        $this->assertSame(['spring', 'winter'], $this->seasonSlugs('varene-smorodinovoe'));
        $this->assertSame(['spring', 'winter'], $this->seasonSlugs('ivan-chay'));
        $this->assertSame(['spring', 'summer'], $this->seasonSlugs('list-smorodiny'));
    }

    public function test_mint_and_dried_mint_are_different_products(): void
    {
        $this->seed();

        $mint = ProductRepository::getBySlugWithRelations('myata');
        $driedMint = ProductRepository::getBySlugWithRelations('myata-sushyonaya');

        $this->assertInstanceOf(Product::class, $mint);
        $this->assertInstanceOf(Product::class, $driedMint);
        $this->assertNotSame($mint->id, $driedMint->id);
    }

    public function test_ninth_tiles_are_mobile_only(): void
    {
        $this->seed();

        $this->assertFalse($this->showOnDesktop('myata-sushyonaya', 'winter'));
        $this->assertFalse($this->showOnDesktop('zveroboy', 'summer'));
        $this->assertFalse($this->showOnDesktop('myata', 'autumn'));
    }

    public function test_every_season_has_four_wheel_products(): void
    {
        $this->seed();

        foreach (SeasonRepository::getAllOrdered() as $season) {
            $wheel = DB::table('product_season')
                ->where('season_id', $season->id)
                ->where('show_on_wheel', true)
                ->orderBy('wheel_order')
                ->pluck('wheel_order')
                ->map(static fn ($order): int => (int) $order)
                ->all();

            $this->assertCount(4, $wheel, "Сезон {$season->slug}");
            $this->assertSame([1, 2, 3, 4], $wheel, "Сезон {$season->slug}");
        }
    }

    public function test_statuses_match_content(): void
    {
        $this->seed();

        foreach (['novogodniy-chaynyy-nabor', 'rassada-tomatov', 'rannie-yabloki'] as $slug) {
            $this->assertSame(ProductStatusEnum::Preorder, $this->product($slug)->status, $slug);
        }

        foreach (['varene-smorodinovoe', 'klubnika'] as $slug) {
            $product = $this->product($slug);
            $this->assertSame(ProductStatusEnum::Few, $product->status, $slug);
            $this->assertSame(3, $product->stock, $slug);
        }

        $kartofel = $this->product('kartofel');
        $this->assertSame(ProductStatusEnum::Out, $kartofel->status);
        $this->assertFalse(
            ProductRepository::getVisibleWithSeasonsAndCategory()->contains(
                static fn (Product $product): bool => $product->id === $kartofel->id,
            ),
        );
    }

    public function test_every_product_icon_exists(): void
    {
        $this->seed();

        foreach (DB::table('products')->pluck('icon') as $icon) {
            $partial = str_replace(['product-', '.svg'], '', $icon);

            $this->assertFileExists(
                resource_path("views/generated/product-icons/{$partial}.blade.php"),
                "Нет иконки {$icon}",
            );
        }
    }

    public function test_autumn_reference_product_matches_handoff(): void
    {
        $this->seed();

        $antonovka = $this->product('antonovka');

        $this->assertSame('Антоновка с дедушкиной яблони', $antonovka->story_title);
        $this->assertSame(650, $antonovka->price);
        $this->assertSame(['ящик 5 кг', 'до марта', 'есть сушёные'], $antonovka->facts);
        $this->assertSame(['autumn'], $this->seasonSlugs('antonovka'));
    }

    private function product(string $slug): Product
    {
        $product = ProductRepository::getBySlugWithRelations($slug);
        $this->assertInstanceOf(Product::class, $product, $slug);

        return $product;
    }

    /**
     * @return array<int, string>
     */
    private function seasonSlugs(string $productSlug): array
    {
        return $this->product($productSlug)->seasons->pluck('slug')->sort()->values()->all();
    }

    private function showOnDesktop(string $productSlug, string $seasonSlug): bool
    {
        $product = $this->product($productSlug);
        $season = SeasonRepository::getAllOrdered()->firstWhere('slug', $seasonSlug);
        $this->assertInstanceOf(Season::class, $season);

        return (bool) DB::table('product_season')
            ->where('product_id', $product->id)
            ->where('season_id', $season->id)
            ->value('show_on_desktop');
    }
}
