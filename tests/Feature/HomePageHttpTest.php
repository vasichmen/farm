<?php

namespace Tests\Feature;

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
        $response->assertSee('Усадьба Лыково');
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
