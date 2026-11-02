<?php

namespace App\Traits\Model;

use Illuminate\Support\Str;

trait GeneratesSlugTrait
{
    /**
     * Базовое значение slug из названия.
     */
    public static function makeSlug(string $name): string
    {
        $slug = Str::slug($name, '-', 'ru');

        return $slug !== '' ? $slug : 'item';
    }

    /**
     * Уникальное значение slug: к занятому базовому значению добавляется числовой суффикс.
     */
    protected static function generateUniqueSlug(string $name): string
    {
        $base = static::makeSlug($name);
        $slug = $base;
        $number = 1;

        while (static::query()->where('slug', $slug)->exists()) {
            $number++;
            $slug = "{$base}-{$number}";
        }

        return $slug;
    }

    public static function bootGeneratesSlugTrait(): void
    {
        static::saving(function ($model) {
            if (blank($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name);
            }
        });
    }
}
