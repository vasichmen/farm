<?php

namespace Tests\Unit;

use App\Enums\CategoryShapeEnum;
use App\Enums\PriceUnitEnum;
use App\Enums\ProductStatusEnum;
use App\Enums\SaleUnitEnum;
use Tests\TestCase;

class EnumTranslationTest extends TestCase
{
    public function test_every_case_has_translation(): void
    {
        $enums = [
            ProductStatusEnum::class,
            PriceUnitEnum::class,
            SaleUnitEnum::class,
            CategoryShapeEnum::class,
        ];

        foreach ($enums as $enumClass) {
            foreach ($enumClass::cases() as $case) {
                $this->assertNotSame('', $case->trans(), "Нет перевода для {$enumClass}::{$case->name}");
            }
        }
    }

    public function test_expected_labels(): void
    {
        $this->assertSame('В наличии', ProductStatusEnum::InStock->trans());
        $this->assertSame('Осталось мало', ProductStatusEnum::Few->trans());
        $this->assertSame('Предзаказ', ProductStatusEnum::Preorder->trans());
        $this->assertSame('Нет в наличии', ProductStatusEnum::Out->trans());

        $this->assertSame('₽', PriceUnitEnum::Rub->trans());
        $this->assertSame('₽/кг', PriceUnitEnum::RubPerKg->trans());

        $this->assertSame('штука', SaleUnitEnum::Piece->trans());
        $this->assertSame('килограмм', SaleUnitEnum::Kg->trans());

        $this->assertSame('Круг', CategoryShapeEnum::Circle->trans());
        $this->assertSame('Ромб', CategoryShapeEnum::Diamond->trans());
        $this->assertSame('Лист', CategoryShapeEnum::Leaf->trans());
    }
}
