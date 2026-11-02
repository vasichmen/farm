<?php

use App\Enums\CategoryShapeEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary()->comment('Идентификатор категории (UUID)');
            $table->string('slug')->unique()->comment('Технический идентификатор категории для URL');
            $table->string('name')->comment('Название категории');
            $table->string('color')->comment('Цвет значка категории в формате HEX');
            $table->enum('shape', CategoryShapeEnum::values())->comment('Форма значка категории');
            $table->string('icon')->comment('Имя файла иконки категории');
            $table->unsignedInteger('sort_order')->comment('Порядок вывода категории в списках');
            $table->timestamp('created_at')->nullable()->comment('Дата создания записи (UTC)');
            $table->timestamp('updated_at')->nullable()->comment('Дата последнего изменения записи (UTC)');

            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
