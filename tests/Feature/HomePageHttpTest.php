<?php

namespace Tests\Feature;

use App\Repositories\SeasonRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomePageHttpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_home_page_renders_wheel_for_requested_season(): void
    {
        $response = $this->get('/?season=winter');

        $response->assertOk();
        $response->assertSee('data-season="winter"', false);
        $response->assertSee('data-island="season-wheel"', false);
        $response->assertSee('data-props=', false);
        $response->assertSee('season-wheel__fallback', false);
        $response->assertSee('?season=winter', false);
        $response->assertSee('Зима', false);
        $response->assertSee('Зимой в Лыково заваривают травы и открывают варенье');
    }

    public function test_home_page_renders_catalog_column_with_season_content(): void
    {
        $response = $this->get('/?season=autumn');

        $response->assertOk();
        $response->assertSee('id="catalog-column"', false);
        $response->assertSee('role="tabpanel"', false);
        $response->assertSee('aria-labelledby="season-tab-autumn"', false);
        $response->assertSee('Осенью в Лыково пахнет антоновкой и сушёными травами');
        $response->assertSee('Мы не держим склад');
        $response->assertSee('Антоновка');
        $response->assertSee('650 ₽');
        $response->assertSee('catalog-next', false);
        $response->assertDontSee('Здесь скоро появится главная страница');
        $response->assertDontSee('<section class="prose">', false);
        $this->assertSame(1, substr_count($response->getContent(), '<h1'));
    }

    public function test_server_rendered_products_live_outside_island_containers(): void
    {
        $response = $this->get('/?season=autumn');
        $content = $response->getContent();

        $this->assertIsString($content);

        foreach (['data-island="season-wheel"', 'data-island="catalog-carousel"'] as $island) {
            $this->assertStringNotContainsString($island.'><', $content);
        }

        $columnStart = strpos($content, 'id="catalog-column"');
        $wheelIslandEnd = strpos($content, '</div>', (int) strpos($content, 'season-wheel__fallback'));

        $this->assertIsInt($columnStart);
        $this->assertIsInt($wheelIslandEnd);
        $this->assertGreaterThan($wheelIslandEnd, $columnStart);

        foreach (['Антоновка', '650 ₽', 'catalog-card__title'] as $fragment) {
            $position = strpos($content, $fragment);
            $this->assertIsInt($position, $fragment);
            $this->assertGreaterThan($columnStart, $position, $fragment);
        }
    }

    public function test_home_page_fallback_lists_all_seasons(): void
    {
        $response = $this->get('/?season=autumn');

        $response->assertOk();

        foreach (['?season=summer', '?season=autumn', '?season=winter', '?season=spring'] as $url) {
            $response->assertSee($url, false);
        }

        $response->assertSee('УРОЖАЙ', false);
    }

    public function test_home_page_has_local_month_redirect_script(): void
    {
        $response = $this->get('/?season=autumn');

        $response->assertOk();
        $response->assertSee("params.has('season')", false);
        $response->assertSee("params.has('month')", false);
        $response->assertSee('window.location.replace', false);
    }

    public function test_empty_season_renders_empty_state_without_next_season_band(): void
    {
        SeasonRepository::create([
            'slug' => 'empty',
            'name' => 'Пустой',
            'sub' => 'ПУСТО',
            'h1' => 'Пустой сезон',
            'lead' => 'Лид пустого сезона.',
            'next_label' => 'Дальше — весна.',
            'teaser_icon' => 'product-dill.svg',
            'mobile_title' => 'Пустой',
            'mobile_sub' => 'ЯНВ',
            'empty_text' => 'Здесь пока пусто.',
            'bg_from' => '#3A5A47',
            'bg_to' => '#2F4A3A',
            'sort_order' => 5,
        ]);

        $response = $this->get('/?season=empty');

        $response->assertOk();
        $response->assertSee('data-state="empty"', false);
        $response->assertSee('Здесь пока пусто.');
        $response->assertSee('ПОКАЗАТЬ ВЕСНУ →');
        $response->assertDontSee('catalog-next', false);
        $response->assertDontSee('class="catalog-card', false);
    }

    public function test_month_parameter_selects_season(): void
    {
        $response = $this->get('/?month=7');

        $response->assertOk();
        $response->assertSee('data-season="summer"', false);
    }

    public function test_unknown_season_falls_back_to_first_ordered_season(): void
    {
        $response = $this->get('/?season=unknown');

        $response->assertOk();
        $response->assertSee('data-season="spring"', false);
    }
}
