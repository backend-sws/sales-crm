<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
        'is_secret',
    ];

    protected $casts = [
        'is_secret' => 'boolean',
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if ($setting && $setting->value !== null && $setting->value !== '') {
            return $setting->value;
        }

        return $default;
    }

    public static function set(string $key, mixed $value, string $group = 'general', bool $isSecret = false): static
    {
        return static::updateOrCreate(
            ['key' => $key],
            [
                'value'     => $value,
                'group'     => $group,
                'is_secret' => $isSecret,
            ]
        );
    }
}
