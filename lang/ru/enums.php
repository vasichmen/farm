<?php

use App\Enums\CategoryShapeEnum;
use App\Enums\PriceUnitEnum;
use App\Enums\ProductStatusEnum;
use App\Enums\SaleUnitEnum;

return [
    'names' => [
        ProductStatusEnum::class => [
            ProductStatusEnum::InStock->value => 'В наличии',
            ProductStatusEnum::Few->value => 'Осталось мало',
            ProductStatusEnum::Preorder->value => 'Предзаказ',
            ProductStatusEnum::Out->value => 'Нет в наличии',
        ],
        PriceUnitEnum::class => [
            PriceUnitEnum::Rub->value => '₽',
            PriceUnitEnum::RubPerKg->value => '₽/кг',
        ],
        SaleUnitEnum::class => [
            SaleUnitEnum::Piece->value => 'штука',
            SaleUnitEnum::Kg->value => 'килограмм',
        ],
        CategoryShapeEnum::class => [
            CategoryShapeEnum::Circle->value => 'Круг',
            CategoryShapeEnum::Diamond->value => 'Ромб',
            CategoryShapeEnum::Leaf->value => 'Лист',
        ],
    ],
];
