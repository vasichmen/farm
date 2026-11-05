<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteNavigationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_header_contains_only_three_sections(): void
    {
        $nav = $this->headerNav($this->get('/?season=autumn')->getContent());

        $this->assertSame(3, preg_match_all('/<a\b/', $nav));
        $this->assertStringContainsString('href="'.route('about').'"', $nav);
        $this->assertStringContainsString('href="'.route('home').'"', $nav);
        $this->assertStringContainsString('href="'.route('how-to-order').'"', $nav);
        $this->assertStringNotContainsString('href="'.route('preorder').'"', $nav);
        $this->assertStringNotContainsString('href="'.route('contacts').'"', $nav);
    }

    public function test_header_marks_active_section(): void
    {
        $homeNav = $this->headerNav($this->get('/?season=autumn')->getContent());
        $aboutNav = $this->headerNav($this->get('/about')->getContent());

        $this->assertSame(1, substr_count($homeNav, 'aria-current="page"'));
        $this->assertMatchesRegularExpression(
            '/href="'.preg_quote(route('home'), '/').'"\s+aria-current="page"/',
            $homeNav,
        );

        $this->assertSame(1, substr_count($aboutNav, 'aria-current="page"'));
        $this->assertMatchesRegularExpression(
            '/href="'.preg_quote(route('about'), '/').'"\s+aria-current="page"/',
            $aboutNav,
        );
    }

    public function test_menu_island_exposes_full_navigation_and_contacts(): void
    {
        $content = $this->get('/?season=autumn')->getContent();

        $this->assertIsString($content);
        $this->assertStringContainsString('data-island="site-menu"', $content);

        $props = $this->siteMenuProps($content);

        $this->assertSame(
            ['about', 'seasons', 'preorder', 'how-to-order', 'contacts'],
            array_column($props['items'], 'id'),
        );
        $this->assertSame(
            ['О семье', 'Сезоны', 'Предзаказ', 'Как заказать', 'Контакты'],
            array_column($props['items'], 'label'),
        );
        $this->assertSame(
            [
                route('about'),
                route('home'),
                route('preorder'),
                route('how-to-order'),
                route('contacts'),
            ],
            array_column($props['items'], 'url'),
        );
        $this->assertSame([false, true, false, false, false], array_column($props['items'], 'active'));

        $this->assertSame(
            'Московская область, деревня Лыково',
            $props['contacts']['address'],
        );
        $this->assertSame('+7 900 000-00-00', $props['contacts']['phone']['label']);
        $this->assertSame('tel:+79000000000', $props['contacts']['phone']['href']);
        $this->assertSame('hello@lykovo.example', $props['contacts']['email']['label']);
        $this->assertSame('mailto:hello@lykovo.example', $props['contacts']['email']['href']);
        $this->assertSame(
            [
                ['id' => 'telegram', 'label' => 'Telegram', 'url' => null],
                ['id' => 'vk', 'label' => 'VK', 'url' => null],
            ],
            $props['contacts']['socials'],
        );
    }

    public function test_menu_links_exist_in_server_html(): void
    {
        $content = $this->get('/?season=autumn')->getContent();

        $this->assertIsString($content);

        foreach (['about', 'home', 'preorder', 'how-to-order', 'contacts'] as $routeName) {
            $this->assertMatchesRegularExpression(
                '/<a\b[^>]*href="'.preg_quote(route($routeName), '/').'"/',
                $content,
            );
        }
    }

    public function test_menu_marks_active_section_for_every_page(): void
    {
        $expected = [
            '/?season=autumn' => 'seasons',
            '/about' => 'about',
            '/preorder' => 'preorder',
            '/how-to-order' => 'how-to-order',
            '/contacts' => 'contacts',
        ];

        foreach ($expected as $url => $activeId) {
            $content = $this->get($url)->getContent();
            $this->assertIsString($content);

            $active = array_values(array_filter(
                $this->siteMenuProps($content)['items'],
                fn (array $item): bool => $item['active'],
            ));

            $this->assertCount(1, $active, $url);
            $this->assertSame($activeId, $active[0]['id'], $url);
        }
    }

    /**
     * @return array{items: array<int, array{id: string, label: string, url: string, active: bool}>, contacts: array<string, mixed>}
     */
    private function siteMenuProps(string $content): array
    {
        preg_match('/data-island="site-menu"\s+data-props=\'([^\']*)\'/s', $content, $matches);

        $this->assertArrayHasKey(1, $matches, 'Данные острова меню не найдены.');

        $props = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($props);

        return $props;
    }

    private function headerNav(string|false $content): string
    {
        $this->assertIsString($content);

        preg_match('/<nav class="site-nav"[^>]*>(.*?)<\/nav>/s', $content, $matches);

        $this->assertArrayHasKey(1, $matches, 'Навигация шапки не найдена.');

        return $matches[1];
    }
}
