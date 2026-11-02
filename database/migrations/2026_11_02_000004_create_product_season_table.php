<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_season', function (Blueprint $table) {
            $table->foreignUuid('product_id')->comment('Ссылка на товар')->constrained()->cascadeOnDelete();
            $table->foreignUuid('season_id')->comment('Ссылка на сезон')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->comment('Порядок товара в сетке сезона');
            $table->boolean('show_on_desktop')->default(true)->comment('Показывать товар в десктопной сетке');
            $table->boolean('show_on_wheel')->default(false)->comment('Показывать товар на колесе сезона');
            $table->unsignedInteger('wheel_order')->nullable()->comment('Порядок товара на колесе');
            $table->string('harvest')->nullable()->comment('Период сбора без слова «сбор»');

            $table->primary(['product_id', 'season_id']);
            $table->index(['season_id', 'sort_order']);
            $table->index(['season_id', 'show_on_wheel', 'wheel_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_season');
    }
};
