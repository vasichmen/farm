<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnsureDatabaseIsAvailable
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment('local')) {
            return $next($request);
        }

        try {
            DB::connection()->getPdo();
        } catch (Throwable $exception) {
            report($exception);

            return response()->view('errors.database', [], 503);
        }

        return $next($request);
    }
}
