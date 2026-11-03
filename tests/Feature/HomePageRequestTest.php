<?php

namespace Tests\Feature;

use App\DTO\Request\HomePage\HomePageRequestDTO;
use App\Http\Requests\HomePage\HomePageRequest;
use Laravel\Foundation\Exceptions\ValidationException;
use Tests\TestCase;

class HomePageRequestTest extends TestCase
{
    public function test_query_parameters_are_moved_to_dto(): void
    {
        $dto = $this->validate('/?season=winter&product=antonovka&month=10');

        $this->assertInstanceOf(HomePageRequestDTO::class, $dto);
        $this->assertSame('winter', $dto->season);
        $this->assertSame('antonovka', $dto->product);
        $this->assertSame(10, $dto->month);
    }

    public function test_absent_parameters_stay_null(): void
    {
        $dto = $this->validate('/');

        $this->assertInstanceOf(HomePageRequestDTO::class, $dto);
        $this->assertNull($dto->season);
        $this->assertNull($dto->product);
        $this->assertNull($dto->month);
    }

    public function test_unknown_season_and_product_are_not_validation_errors(): void
    {
        $dto = $this->validate('/?season=unknown&product=missing-product');

        $this->assertInstanceOf(HomePageRequestDTO::class, $dto);
        $this->assertSame('unknown', $dto->season);
        $this->assertSame('missing-product', $dto->product);
    }

    public function test_month_must_be_integer(): void
    {
        $this->expectException(ValidationException::class);

        $this->validate('/?month=october');
    }

    private function validate(string $uri): HomePageRequestDTO
    {
        $request = HomePageRequest::create($uri, 'GET');
        $request->setContainer(app());
        $request->validateResolved();

        $dto = $request->validated();

        $this->assertInstanceOf(HomePageRequestDTO::class, $dto);

        return $dto;
    }
}
