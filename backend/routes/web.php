<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return response()->json([
        'success'    => false,
        'statusCode' => 401,
        'message'    => 'Unauthenticated access. Please authenticate via /api/v1/auth/login.',
        'data'       => null,
    ], 401);
})->name('web.login');
