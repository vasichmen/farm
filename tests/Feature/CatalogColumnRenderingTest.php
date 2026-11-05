<?php

namespace Tests\Feature;

use App\Http\Resources\DTO\HomePageResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\HomePageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogColumnRenderingTest extends TestCase
{
    use RefreshDatabase;

    private const NBSP = "\u{00A0}";

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_price_is_rendered_as_whole_rubles_with_thousands_separator(): void
    {
        $html = $this->blade(
            '<x-catalog.price :price="1250" :unit="$unit" />',
            ['unit' => ['id' => 'rub', 'name' => '₽']],
        );

        $html->assertSee('1'.self::NBSP.'250 ₽');
    }

    public function test_price_uses_per_kilogram_suffix(): void
    {
        $html = $this->blade(
            '<x-catalog.price :price="120" :unit="$unit" />',
            ['unit' => ['id' => 'rub_per_kg', 'name' => '₽/кг']],
        );

        $html->assertSee('120 ₽/кг');
    }

    public function test_status_row_is_rendered_for_all_four_statuses(): void
    {
        $inStock = $this->blade(
            '<x-catalog.status :status="$status" />',
            ['status' => ['id' => 'in_stock', 'name' => 'В наличии']],
        );

        $inStock->assertSee('catalog-card__status', false);
        $inStock->assertSee('data-status="in_stock"', false);
        $inStock->assertDontSee('catalog-card__badge', false);
        $this->assertSame(
            '',
            trim(strip_tags((string) $inStock)),
        );

        $few = $this->blade(
            '<x-catalog.status :status="$status" :stock="3" />',
            ['status' => ['id' => 'few', 'name' => 'Осталось мало']],
        );

        $few->assertSee('осталось 3');
        $few->assertSee('catalog-card__badge--few', false);

        $preorder = $this->blade(
            '<x-catalog.status :status="$status" />',
            ['status' => ['id' => 'preorder', 'name' => 'Предзаказ']],
        );

        $preorder->assertSee('предзаказ');
        $preorder->assertSee('catalog-card__badge--preorder', false);

        $out = $this->blade(
            '<x-catalog.status :status="$status" />',
            ['status' => ['id' => 'out', 'name' => 'Нет в наличии']],
        );

        $out->assertSee('нет в наличии');
        $out->assertSee('catalog-card__out', false);
    }

    public function test_status_row_has_the_same_wrapper_for_every_status(): void
    {
        foreach (['in_stock', 'few', 'preorder', 'out'] as $statusId) {
            $html = (string) $this->blade(
                '<x-catalog.status :status="$status" :stock="2" />',
                ['status' => ['id' => $statusId, 'name' => $statusId]],
            );

            $this->assertMatchesRegularExpression(
                '/<div class="catalog-card__status" data-status="'.$statusId.'">/',
                $html,
                $statusId,
            );
        }
    }

    public function test_header_renders_season_h1_and_lead(): void
    {
        $season = $this->season('autumn');

        $html = $this->blade('<x-catalog.header :season="$season" />', ['season' => $season]);

        $html->assertSee('<h1', false);
        $html->assertSee('tabindex="-1"', false);
        $html->assertSee($season['h1']);
        $html->assertSee($season['lead']);
    }

    public function test_card_shows_illustration_overline_title_pack_price_and_status(): void
    {
        $this->get('/?season=autumn');

        $product = $this->product('autumn', 'antonovka');

        $html = (string) $this->blade(
            '<ul><x-catalog.card :product="$product" :index="3" /></ul>',
            ['product' => $product],
        );

        $this->assertStringContainsString('class="catalog-card"', $html);
        $this->assertStringContainsString('catalog-card__pic', $html);
        $this->assertStringContainsString('<svg', $html);
        $this->assertStringContainsString('catalog-card__overline', $html);
        $this->assertStringContainsString('Сад · 2–10 октября', $html);
        $this->assertStringContainsString('title="Сад · 2–10 октября"', $html);
        $this->assertStringContainsString('catalog-card__title', $html);
        $this->assertStringContainsString('Антоновка', $html);
        $this->assertStringContainsString('catalog-card__pack', $html);
        $this->assertStringContainsString('ящик 5 кг', $html);
        $this->assertStringContainsString('650 ₽', $html);
        $this->assertStringContainsString('--card-index: 3', $html);
        $this->assertStringContainsString('data-status="in_stock"', $html);
        $this->assertStringContainsString('class="catalog-card__link"', $html);
        $this->assertStringContainsString('season=autumn', $html);
        $this->assertStringContainsString('product=antonovka', $html);
        $this->assertStringContainsString('aria-label="Открыть товар «Антоновка»"', $html);
        $this->assertStringContainsString('aria-haspopup="dialog"', $html);
        $this->assertStringContainsString('data-product-modal', $html);
        $this->assertStringContainsString('data-product-slug="antonovka"', $html);
        $this->assertStringNotContainsString('<button', $html);
    }

    public function test_card_without_harvest_shows_only_category_in_overline(): void
    {
        $product = $this->product('autumn', 'grusha-lada');

        $html = (string) $this->blade(
            '<ul><x-catalog.card :product="$product" /></ul>',
            ['product' => $product],
        );

        $this->assertStringContainsString('title="Сад"', $html);
        $this->assertStringNotContainsString(' · </p>', $html);
    }

    public function test_out_card_is_muted_and_shows_no_price(): void
    {
        $this->get('/?season=autumn');

        $product = $this->product('autumn', 'kartofel');

        $html = (string) $this->blade(
            '<ul><x-catalog.card :product="$product" /></ul>',
            ['product' => $product],
        );

        $this->assertStringContainsString('catalog-card--out', $html);
        $this->assertStringContainsString('нет в наличии', $html);
        $this->assertStringNotContainsString('catalog-card__price', $html);
        $this->assertStringNotContainsString('60 ₽', $html);
        $this->assertStringContainsString('class="catalog-card__link"', $html);
        $this->assertStringContainsString('product=kartofel', $html);
        $this->assertStringContainsString('data-product-slug="kartofel"', $html);
        $this->assertStringContainsString('aria-label="Открыть товар «Картофель»"', $html);
        $this->assertStringNotContainsString('<button', $html);
    }

    public function test_next_season_band_links_to_preorder_with_teaser_icon_and_label(): void
    {
        $season = $this->season('autumn');

        $html = (string) $this->blade(
            '<x-catalog.next-season :season="$season" />',
            ['season' => $season],
        );

        $this->assertStringContainsString('class="catalog-next"', $html);
        $this->assertStringContainsString('href="'.route('preorder').'"', $html);
        $this->assertStringContainsString('catalog-next__icon', $html);
        $this->assertStringContainsString('<svg', $html);
        $this->assertStringContainsString('Дальше — зима.', $html);
        $this->assertStringContainsString('ПРЕДЗАКАЗ →', $html);
    }

    public function test_carousel_renders_track_with_cards_and_island_props(): void
    {
        $products = $this->productArrays('autumn');

        $html = (string) $this->blade(
            '<x-catalog.carousel :products="$products" />',
            ['products' => $products],
        );

        $this->assertStringContainsString('id="catalog-track"', $html);
        $this->assertStringContainsString('tabindex="0"', $html);
        $this->assertStringContainsString('role="group"', $html);
        $this->assertStringContainsString('aria-label="Товары сезона"', $html);
        $this->assertStringContainsString('catalog-carousel__track', $html);
        $this->assertStringContainsString('data-island="catalog-carousel"', $html);
        $this->assertStringContainsString(
            'data-props=\'{"track_id":"catalog-track"}\'',
            $html,
        );
        $this->assertSame(8, $this->countCards($html));
    }

    public function test_empty_state_shows_season_text_and_link_to_fallback_season(): void
    {
        $season = $this->season('autumn');
        $fallback = $this->season('spring');

        $html = (string) $this->blade(
            '<x-catalog.empty :empty-text="$text" :fallback-season="$fallback" />',
            ['text' => $season['empty_text'], 'fallback' => $fallback],
        );

        $this->assertStringContainsString('catalog-state--empty', $html);
        $this->assertStringContainsString($season['empty_text'], $html);
        $this->assertStringContainsString('href="'.route('home', ['season' => 'spring']).'"', $html);
        $this->assertStringContainsString('ПОКАЗАТЬ ВЕСНУ →', $html);
        $this->assertStringContainsString('<use href="#ui-leaf">', $html);
    }

    public function test_skeleton_state_renders_eight_card_placeholders(): void
    {
        $html = (string) $this->blade('<x-catalog.skeleton />');

        $this->assertSame(8, substr_count($html, 'catalog-skeleton__card'));
        $this->assertSame(2, substr_count($html, 'class="catalog-skeleton__title'));
        $this->assertSame(2, substr_count($html, 'class="catalog-skeleton__lead'));
    }

    public function test_error_state_shows_retry_link_to_current_address(): void
    {
        $this->get('/?season=autumn');

        $html = (string) $this->blade('<x-catalog.error />');

        $this->assertStringContainsString('catalog-state--error', $html);
        $this->assertStringContainsString('Не получилось загрузить товары', $html);
        $this->assertStringContainsString('ПОВТОРИТЬ', $html);
        $this->assertStringContainsString('?season=autumn', $html);
        $this->assertStringContainsString('href="'.url()->full().'"', $html);
    }

    public function test_column_renders_grid_with_aria_link_to_active_season_tab(): void
    {
        $products = array_slice($this->productArrays('autumn'), 0, 8);

        $html = (string) $this->blade(
            '<x-catalog.column :season="$season" :products="$products" :next-season="$next" />',
            [
                'season' => $this->season('autumn'),
                'products' => $products,
                'next' => $this->season('winter'),
            ],
        );

        $this->assertStringContainsString('id="catalog-column"', $html);
        $this->assertStringContainsString('role="tabpanel"', $html);
        $this->assertStringContainsString('aria-labelledby="season-tab-autumn"', $html);
        $this->assertStringContainsString('class="card-grid catalog-column__grid"', $html);
        $this->assertSame(8, $this->countCards($html));
        $this->assertStringNotContainsString('data-island="catalog-carousel"', $html);
        $this->assertStringContainsString('catalog-next', $html);
    }

    public function test_column_with_six_products_does_not_stretch_the_grid(): void
    {
        $products = array_slice($this->productArrays('autumn'), 0, 6);

        $html = (string) $this->blade(
            '<x-catalog.column :season="$season" :products="$products" :next-season="$next" />',
            [
                'season' => $this->season('autumn'),
                'products' => $products,
                'next' => $this->season('winter'),
            ],
        );

        $this->assertSame(6, $this->countCards($html));
        $this->assertStringNotContainsString('catalog-carousel', $html);
    }

    public function test_column_with_nine_products_renders_carousel(): void
    {
        $products = $this->productArrays('autumn');
        $outProduct = $this->product('autumn', 'kartofel');
        $products[] = $outProduct;

        $html = (string) $this->blade(
            '<x-catalog.column :season="$season" :products="$products" :next-season="$next" />',
            [
                'season' => $this->season('autumn'),
                'products' => $products,
                'next' => $this->season('winter'),
            ],
        );

        $this->assertSame(9, $this->countCards($html));
        $this->assertStringContainsString('catalog-carousel__track', $html);
        $this->assertStringContainsString('data-island="catalog-carousel"', $html);
        $this->assertStringNotContainsString('catalog-column__grid', $html);
    }

    public function test_column_empty_state_hides_next_season_band(): void
    {
        $html = (string) $this->blade(
            '<x-catalog.column :season="$season" :products="[]" :fallback-season="$fallback" state="empty" />',
            [
                'season' => $this->season('autumn'),
                'fallback' => $this->season('spring'),
            ],
        );

        $this->assertStringContainsString('catalog-state--empty', $html);
        $this->assertStringContainsString('data-state="empty"', $html);
        $this->assertStringNotContainsString('catalog-next', $html);
        $this->assertSame(0, $this->countCards($html));
    }

    public function test_column_loading_and_error_states_are_available(): void
    {
        $loading = (string) $this->blade(
            '<x-catalog.column :season="$season" state="loading" />',
            ['season' => $this->season('autumn')],
        );

        $this->assertStringContainsString('catalog-skeleton', $loading);
        $this->assertStringNotContainsString('<h1', $loading);

        $error = (string) $this->blade(
            '<x-catalog.column :season="$season" state="error" />',
            ['season' => $this->season('autumn')],
        );

        $this->assertStringContainsString('catalog-state--error', $error);
        $this->assertStringContainsString('ПОВТОРИТЬ', $error);
        $this->assertStringContainsString('<h1', $error);
    }

    public function test_next_season_label_describes_the_next_season_for_every_season(): void
    {
        $expected = [
            'spring' => ['Дальше — лето.', 'Лето'],
            'summer' => ['Дальше — осень.', 'Осень'],
            'autumn' => ['Дальше — зима.', 'Зима'],
            'winter' => ['Дальше — весна.', 'Весна'],
        ];

        foreach ($expected as $slug => [$label, $nextName]) {
            $season = $this->season($slug);
            $next = $this->season($this->nextSeasonSlug($slug));

            $this->assertSame($nextName, $next['name'], $slug);

            $html = (string) $this->blade(
                '<x-catalog.next-season :season="$season" :next-season="$next" />',
                ['season' => $season, 'next' => $next],
            );

            $this->assertStringContainsString($label, $html, $slug);
            $this->assertStringContainsString('Дальше — '.$nextName, $html, $slug);
        }
    }

    private function countCards(string $html): int
    {
        return preg_match_all('/class="catalog-card(?:\s|")/', $html);
    }

    private function nextSeasonSlug(string $slug): string
    {
        return match ($slug) {
            'spring' => 'summer',
            'summer' => 'autumn',
            'autumn' => 'winter',
            default => 'spring',
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function productArrays(string $seasonSlug): array
    {
        return HomePageService::getHomePage($seasonSlug)
            ->desktopProducts
            ->map(static fn (Product $product): array => (new ProductResource($product))->resolve())
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function product(string $seasonSlug, string $productSlug): array
    {
        $page = HomePageService::getHomePage($seasonSlug, $productSlug);

        $this->assertInstanceOf(Product::class, $page->product);

        return (new ProductResource($page->product))->withPivot($page->productPivot)->resolve();
    }

    /**
     * @return array<string, mixed>
     */
    private function season(string $slug): array
    {
        $page = (new HomePageResource(HomePageService::getHomePage($slug)))->resolve();

        return $page['season'];
    }
}
