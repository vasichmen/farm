<?php

use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PageController::class, 'home'])->name('home');
Route::get('/about', [PageController::class, 'about'])->name('about');
Route::get('/preorder', [PageController::class, 'preorder'])->name('preorder');
Route::get('/how-to-order', [PageController::class, 'howToOrder'])->name('how-to-order');
Route::get('/contacts', [PageController::class, 'contacts'])->name('contacts');

Route::fallback([PageController::class, 'notFound'])->name('not-found');
