<?php

namespace Tests\Feature;

use Tests\TestCase;

class SitePlaceholderTest extends TestCase
{
    /**
     * @return array<string, array{string, string}>
     */
    public static function placeholders(): array
    {
        return [
            'about' => ['/about', 'О семье'],
            'preorder' => ['/preorder', 'Предзаказ'],
            'how-to-order' => ['/how-to-order', 'Как заказать'],
            'contacts' => ['/contacts', 'Контакты'],
        ];
    }

    public function test_placeholder_pages_share_markup_and_have_own_metadata(): void
    {
        $titles = [];
        $descriptions = [];

        foreach (self::placeholders() as $path => [$url, $heading]) {
            $response = $this->get($url);

            $response->assertOk();
            $response->assertHeader('content-type', 'text/html; charset=UTF-8');
            $response->assertSee('<h1', false);
            $response->assertSee($heading);
            $response->assertSee('page-placeholder', false);

            $content = $response->getContent();
            $this->assertIsString($content);
            $this->assertSame(1, substr_count($content, '<h1'));

            $main = $this->mainContent($content);
            $this->assertSame(
                1,
                preg_match_all(
                    '/href="'.preg_quote(route('home', absolute: false), '/').'"/',
                    $main,
                ),
            );
            $this->assertStringContainsString('>Назад</a>', $main);

            $titles[$path] = $this->metaContent($content, 'title');
            $descriptions[$path] = $this->metaContent($content, 'name="description"');
        }

        $this->assertNotSame($titles['about'], $titles['contacts']);
        $this->assertNotSame($descriptions['about'], $descriptions['contacts']);
    }

    private function mainContent(string $content): string
    {
        preg_match('/<main\b[^>]*>(.*?)<\/main>/s', $content, $matches);

        $this->assertArrayHasKey(1, $matches, 'Основное содержимое страницы не найдено.');

        return $matches[1];
    }

    private function metaContent(string $content, string $marker): string
    {
        if ($marker === 'title') {
            preg_match('/<title>(.*?)<\/title>/s', $content, $matches);
        } else {
            preg_match('/<meta '.$marker.' content="([^"]*)"/', $content, $matches);
        }

        $this->assertArrayHasKey(1, $matches, 'Метаданные не найдены.');

        return $matches[1];
    }
}
