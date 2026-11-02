<?php

namespace App\Enums;

use Laravel\Foundation\Traits\Enum\BaseEnumTrait;

enum CategoryShapeEnum: string
{
    use BaseEnumTrait;

    case Circle = 'circle';
    case Diamond = 'diamond';
    case Leaf = 'leaf';
}
