<?php

namespace Tests\Feature;

use App\Services\HomePageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HomePageQueryCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_query_count_does_not_grow_from_season_to_season(): void
    {
        $this->seed();

        $queries = 0;

        DB::listen(static function () use (&$queries): void {
            $queries++;
        });

        $counts = [];

        foreach (['winter', 'spring', 'summer', 'autumn'] as $slug) {
            $queries = 0;

            HomePageService::getHomePage($slug);

            $counts[$slug] = $queries;
        }

        $this->assertSame(
            array_fill_keys(array_keys($counts), $counts['winter']),
            $counts,
            'Число запросов не должно зависеть от числа товаров в сезоне.',
        );
    }
}
