<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BrandComponentsTest extends TestCase
{
    public function test_all_product_icons_render_inline_svg(): void
    {
        $files = File::files(resource_path('views/generated/product-icons'));

        $this->assertCount(29, $files);

        foreach ($files as $file) {
            $name = str_replace('.blade.php', '', $file->getFilename());
            $html = Blade::render('<x-product-icon name="'.$name.'" />');

            $this->assertStringContainsString('<svg', $html, $name);
            $this->assertStringContainsString('viewBox=', $html, $name);
            $this->assertStringNotContainsString('-on-disc', $html, $name);
        }
    }

    public function test_product_icon_accepts_label_and_extra_attributes(): void
    {
        $html = Blade::render(
            '<x-product-icon name="apples" label="Яблоки" class="card-icon" />',
        );

        $this->assertStringContainsString('<svg', $html);
        $this->assertStringContainsString('role="img"', $html);
        $this->assertStringContainsString('aria-label="Яблоки"', $html);
        $this->assertStringContainsString('card-icon', $html);
    }

    public function test_ui_icon_uses_sprite_symbol(): void
    {
        $html = Blade::render('<x-ui-icon name="filter" />');

        $this->assertStringContainsString('<use href="#ui-filter">', $html);
        $this->assertStringContainsString('width="24"', $html);
        $this->assertStringContainsString('height="24"', $html);
        $this->assertStringContainsString('aria-hidden="true"', $html);
    }

    public function test_logo_uses_theme_specific_outlined_asset(): void
    {
        $dark = Blade::render('<x-logo theme="dark" />');
        $light = Blade::render('<x-logo theme="light" />');

        $this->assertStringContainsString('logo-lockup-on-dark-outlined.svg', $dark);
        $this->assertStringContainsString('logo-lockup-on-light-outlined.svg', $light);
        $this->assertStringContainsString('alt="Усадьба Лыково"', $dark);
    }

    public function test_page_includes_ui_sprite_once(): void
    {
        $content = $this->get(route('home'))->assertOk()->getContent();

        $this->assertSame(1, substr_count($content, 'data-ui-sprite'));
        $this->assertSame(1, substr_count($content, 'id="ui-filter"'));
    }
}
