<?php

namespace App\Enums;

use Laravel\Foundation\Traits\Enum\BaseEnumTrait;

enum ProductStatusEnum: string
{
    use BaseEnumTrait;

    case InStock = 'in_stock';
    case Few = 'few';
    case Preorder = 'preorder';
    case Out = 'out';
}
