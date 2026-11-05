<?php

namespace Tests\Feature;

use App\Enums\ProductStatusEnum;
use App\Exceptions\SeasonNotFoundException;
use App\Models\Product;
use App\Models\Season;
use App\Repositories\ProductRepository;
use App\Repositories\SeasonRepository;
use App\Services\HomePageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class HomePageSelectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_season_is_selected_by_client_month(): void
    {
        $this->seed();

        $expected = [
            1 => 'Зима',
            2 => 'Зима',
            3 => 'Весна',
            4 => 'Весна',
            5 => 'Весна',
            6 => 'Лето',
            7 => 'Лето',
            8 => 'Лето',
            9 => 'Осень',
            10 => 'Осень',
            11 => 'Осень',
            12 => 'Зима',
        ];

        foreach ($expected as $month => $seasonName) {
            $this->assertSame(
                $seasonName,
                HomePageService::getHomePage(null, null, $month)->season->name,
                "Месяц {$month}",
            );
        }
    }

    public function test_month_boundaries(): void
    {
        $this->seed();

        $cases = [
            [2, 'Зима'],
            [3, 'Весна'],
            [5, 'Весна'],
            [6, 'Лето'],
            [8, 'Лето'],
            [9, 'Осень'],
        ];

        foreach ($cases as [$month, $seasonName]) {
            $this->assertSame(
                $seasonName,
                HomePageService::getHomePage(null, null, $month)->season->name,
                "Месяц {$month}",
            );
        }
    }

    public function test_season_without_month_defaults_to_first_ordered_season(): void
    {
        $this->seed();

        $this->assertSame('Весна', HomePageService::getHomePage()->season->name);
        $this->assertSame('Весна', HomePageService::getHomePage(null, null, 99)->season->name);
    }

    public function test_explicit_season_overrides_month(): void
    {
        $this->seed();

        $this->assertSame('Зима', HomePageService::getHomePage('winter', null, 7)->season->name);
        $this->assertSame('Весна', HomePageService::getHomePage('spring', null, 1)->season->name);
    }

    public function test_unknown_season_falls_back_to_month(): void
    {
        $this->seed();

        $this->assertSame('Лето', HomePageService::getHomePage('unknown', null, 7)->season->name);
    }

    public function test_desktop_and_mobile_products_count(): void
    {
        $this->seed();

        $expected = [
            'winter' => [8, 9],
            'spring' => [8, 8],
            'summer' => [8, 9],
            'autumn' => [8, 9],
        ];

        foreach ($expected as $slug => [$desktopCount, $mobileCount]) {
            $homePage = HomePageService::getHomePage($slug);

            $this->assertCount($desktopCount, $homePage->desktopProducts, $slug);
            $this->assertCount($mobileCount, $homePage->mobileProducts, $slug);
            $this->assertSame($mobileCount, $homePage->productsCount, $slug);
        }
    }

    public function test_desktop_products_keep_all_visible_desktop_products_in_sort_order(): void
    {
        $this->seed();

        $expected = [
            'spring' => [
                'Укроп',
                'Петрушка',
                'Мята',
                'Мелисса',
                'Лист смородины',
                'Иван-чай',
                'Варенье смородиновое',
                'Рассада томатов',
            ],
            'summer' => [
                'Клубника',
                'Малина',
                'Смородина чёрная',
                'Крыжовник',
                'Ранние яблоки',
                'Ромашка сушёная',
                'Лист смородины',
                'Кабачки',
            ],
            'autumn' => [
                'Антоновка',
                'Груша «Лада»',
                'Слива сушёная',
                'Яблочные чипсы',
                'Тыква мускатная',
                'Томаты',
                'Морковь',
                'Сбор «Усадебный»',
            ],
            'winter' => [
                'Сбор «Усадебный»',
                'Новогодний чайный набор',
                'Варенье малиновое',
                'Варенье смородиновое',
                'Тыква в сиропе',
                'Яблочные чипсы',
                'Иван-чай',
                'Слива сушёная',
            ],
        ];

        foreach ($expected as $slug => $names) {
            $homePage = HomePageService::getHomePage($slug);

            $this->assertSame($names, $homePage->desktopProducts->pluck('name')->all(), $slug);
            $this->assertNotContains('Картофель', $homePage->desktopProducts->pluck('name')->all(), $slug);
        }
    }

    public function test_ninth_desktop_product_is_returned_when_it_is_marked_for_desktop(): void
    {
        $this->seed();

        $product = ProductRepository::getBySlugWithRelations('myata');
        $this->assertInstanceOf(Product::class, $product);

        $pivot = $product->seasons->mapWithKeys(
            static fn (Season $season): array => [
                $season->id => [
                    'sort_order' => (int) $season->pivot->sort_order,
                    'show_on_desktop' => $season->slug === 'autumn'
                        ? true
                        : (bool) $season->pivot->show_on_desktop,
                    'show_on_wheel' => (bool) $season->pivot->show_on_wheel,
                    'wheel_order' => $season->pivot->wheel_order,
                    'harvest' => $season->pivot->harvest,
                ],
            ],
        );

        ProductRepository::syncSeasons($product->id, $pivot->all());

        $homePage = HomePageService::getHomePage('autumn');

        $this->assertCount(9, $homePage->desktopProducts);
        $this->assertCount(9, $homePage->mobileProducts);
        $this->assertSame('Мята', $homePage->desktopProducts->last()?->name);
    }

    public function test_out_product_is_hidden_from_lists_and_counters_but_available_by_link(): void
    {
        $this->seed();

        $homePage = HomePageService::getHomePage('autumn', 'kartofel');

        $this->assertFalse($this->containsName($homePage->desktopProducts, 'Картофель'));
        $this->assertFalse($this->containsName($homePage->mobileProducts, 'Картофель'));
        $this->assertSame(9, $homePage->productsCount);
        $this->assertSame('Осень', $homePage->season->name);
        $this->assertSame(ProductStatusEnum::Out, $homePage->product?->status);
    }

    public function test_unknown_product_returns_null(): void
    {
        $this->seed();

        $this->assertNull(HomePageService::getHomePage('autumn', 'missing-product')->product);
    }

    public function test_next_season_chain(): void
    {
        $this->seed();

        $expected = [
            'spring' => 'Лето',
            'summer' => 'Осень',
            'autumn' => 'Зима',
            'winter' => 'Весна',
        ];

        foreach ($expected as $slug => $nextSeasonName) {
            $this->assertSame($nextSeasonName, HomePageService::getHomePage($slug)->nextSeason?->name);
        }
    }

    public function test_empty_season_keeps_active_season_and_provides_fallback(): void
    {
        $this->seed();

        SeasonRepository::create([
            'slug' => 'empty',
            'name' => 'Пустой',
            'sub' => 'ПУСТО',
            'h1' => 'Пустой сезон',
            'lead' => 'Лид.',
            'next_label' => 'Дальше — весна.',
            'teaser_icon' => 'product-dill.svg',
            'mobile_title' => 'Пустой',
            'mobile_sub' => 'ЯНВ',
            'empty_text' => 'Здесь пока пусто.',
            'bg_from' => '#3A5A47',
            'bg_to' => '#2F4A3A',
            'sort_order' => 5,
        ]);

        $homePage = HomePageService::getHomePage('empty');

        $this->assertSame('Пустой', $homePage->season->name);
        $this->assertTrue($homePage->desktopProducts->isEmpty());
        $this->assertTrue($homePage->mobileProducts->isEmpty());
        $this->assertSame('Здесь пока пусто.', $homePage->season->empty_text);
        $this->assertSame('Весна', $homePage->fallbackSeason?->name);
    }

    public function test_season_products_counts_match_visible_products(): void
    {
        $this->seed();

        $homePage = HomePageService::getHomePage('autumn');

        foreach ($homePage->seasons as $season) {
            $this->assertSame(
                $homePage->seasonProductsCounts->get($season->id),
                $season->products->count(),
                $season->slug,
            );
        }

        $this->assertSame(9, $homePage->seasonProductsCounts->get($homePage->season->id));
    }

    public function test_category_counters_sum_to_season_products_count(): void
    {
        $this->seed();

        foreach (['winter', 'spring', 'summer', 'autumn'] as $slug) {
            $homePage = HomePageService::getHomePage($slug);

            $this->assertSame($homePage->productsCount, $homePage->categoryCounts->sum(), $slug);
        }
    }

    public function test_missing_seasons_raise_domain_exception(): void
    {
        $this->expectException(SeasonNotFoundException::class);

        HomePageService::getHomePage();
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function containsName(Collection $products, string $name): bool
    {
        return $products->contains(static fn (Product $product): bool => $product->name === $name);
    }
}
