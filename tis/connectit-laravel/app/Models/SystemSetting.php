<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    public $timestamps = false;
    
    protected $fillable = [
        'setting_key', 'setting_value', 'setting_type', 'description', 'updated_by'
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    /**
     * Get a setting value by key
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::where('setting_key', $key)->first();
        if (!$setting) return $default;

        return match ($setting->setting_type) {
            'number'  => (float) $setting->setting_value,
            'boolean' => $setting->setting_value === 'true' || $setting->setting_value === '1',
            'json'    => json_decode($setting->setting_value, true),
            default   => $setting->setting_value,
        };
    }
}
