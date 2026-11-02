<?php

use App\Enums\PriceUnitEnum;
use App\Enums\ProductStatusEnum;
use App\Enums\SaleUnitEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary()->comment('Идентификатор товара (UUID)');
            $table->string('slug')->unique()->comment('Технический идентификатор товара для URL');
            $table->string('name')->comment('Название товара');
            $table->string('story_title')->nullable()->comment('Заголовок истории товара');
            $table->text('description')->comment('Описание товара');
            $table->string('pack')->comment('Фасовка товара');
            $table->unsignedInteger('price')->comment('Цена в целых рублях');
            $table->enum('price_unit', PriceUnitEnum::values())->comment('Единица цены');
            $table->enum('sale_unit', SaleUnitEnum::values())->comment('Единица продажи');
            $table->decimal('step', 2, 1)->comment('Шаг продажи: 1 или 0,5');
            $table->jsonb('facts')->default('[]')->comment('Список фактов-чипов для карточки');
            $table->enum('status', ProductStatusEnum::values())->comment('Статус наличия товара');
            $table->unsignedInteger('stock')->nullable()->comment('Остаток для статуса «осталось мало»');
            $table->string('icon')->comment('Имя файла иконки товара');
            $table->foreignUuid('category_id')->comment('Ссылка на категорию товара')->constrained()->restrictOnDelete();
            $table->timestamp('created_at')->nullable()->comment('Дата создания записи (UTC)');
            $table->timestamp('updated_at')->nullable()->comment('Дата последнего изменения записи (UTC)');

            $table->index('status');
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
