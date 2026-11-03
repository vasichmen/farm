<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_page_is_available_by_named_route(): void
    {
        $this->seed();

        $response = $this->get(route('home'));

        $response->assertOk();
        $response->assertSee('<h1', false);
        $response->assertSee('Усадьба Лыково');
    }

    public function test_section_pages_are_available_by_named_routes(): void
    {
        foreach (['about', 'preorder', 'how-to-order', 'contacts'] as $routeName) {
            $response = $this->get(route($routeName));

            $response->assertOk();
            $response->assertSee('<h1', false);
            $response->assertSee('href="/"', false);
        }
    }

    public function test_unknown_page_returns_not_found(): void
    {
        $this->get('/no-such-page')->assertNotFound();
    }
}
