<?php

namespace App\DTO\Request\HomePage;

use Laravel\Foundation\Abstracts\AbstractDto;

class HomePageRequestDTO extends AbstractDto
{
    public ?string $season = null;

    public ?string $product = null;

    public ?int $month = null;
}
