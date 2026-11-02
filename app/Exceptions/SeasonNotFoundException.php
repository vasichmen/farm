<?php

namespace App\Exceptions;

use Laravel\Foundation\Abstracts\AbstractException;

class SeasonNotFoundException extends AbstractException
{
    const EXCEPTION_NAME = 'season_not_found';

    const EXCEPTION_CODE = 500;
}
