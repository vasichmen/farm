<?php

namespace App\Enums;

use Laravel\Foundation\Traits\Enum\BaseEnumTrait;

enum SaleUnitEnum: string
{
    use BaseEnumTrait;

    case Piece = 'piece';
    case Kg = 'kg';
}
