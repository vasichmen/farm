<?php

namespace App\Enums;

use Laravel\Foundation\Traits\Enum\BaseEnumTrait;

enum PriceUnitEnum: string
{
    use BaseEnumTrait;

    case Rub = 'rub';
    case RubPerKg = 'rub_per_kg';
}
