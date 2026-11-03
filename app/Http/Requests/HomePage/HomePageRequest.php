<?php

namespace App\Http\Requests\HomePage;

use App\DTO\Request\HomePage\HomePageRequestDTO;
use Laravel\Foundation\Abstracts\AbstractRequest;

class HomePageRequest extends AbstractRequest
{
    protected ?string $dtoClassName = HomePageRequestDTO::class;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'season' => ['nullable', 'string', 'max:64'],
            'product' => ['nullable', 'string', 'max:128'],
            'month' => ['nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'season.string' => 'Сезон должен быть строкой.',
            'season.max' => 'Название сезона слишком длинное.',
            'product.string' => 'Товар должен быть строкой.',
            'product.max' => 'Название товара слишком длинное.',
            'month.integer' => 'Месяц должен быть целым числом.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'season' => 'сезон',
            'product' => 'товар',
            'month' => 'месяц',
        ];
    }
}
