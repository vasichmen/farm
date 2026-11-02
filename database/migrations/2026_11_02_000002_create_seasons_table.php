<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seasons', function (Blueprint $table) {
            $table->uuid('id')->primary()->comment('Идентификатор сезона (UUID)');
            $table->string('slug')->unique()->comment('Технический идентификатор сезона для URL');
            $table->string('name')->comment('Название сезона');
            $table->string('sub', 7)->comment('Короткая подпись сектора колеса (до 7 знаков)');
            $table->text('h1')->comment('Заголовок H1 сезона');
            $table->text('lead')->comment('Лид под заголовком сезона');
            $table->text('next_label')->comment('Текст полосы «Дальше — …»');
            $table->string('teaser_icon')->comment('Имя файла иконки следующего сезона');
            $table->string('mobile_title')->comment('Название сезона для телефона');
            $table->string('mobile_sub')->comment('Диапазон месяцев для подписи на телефоне');
            $table->text('empty_text')->comment('Текст для пустого сезона');
            $table->string('bg_from')->comment('Начальный цвет фона сезона');
            $table->string('bg_to')->comment('Конечный цвет фона сезона');
            $table->unsignedInteger('sort_order')->comment('Порядок сезона в годовом цикле');
            $table->timestamp('created_at')->nullable()->comment('Дата создания записи (UTC)');
            $table->timestamp('updated_at')->nullable()->comment('Дата последнего изменения записи (UTC)');

            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seasons');
    }
};
