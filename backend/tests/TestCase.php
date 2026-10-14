<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $roles = [
            'super_admin',
            'sales_manager',
            'sales_agent',
            'project_manager',
            'developer',
            'account_manager',
            'client',
        ];

        foreach ($roles as $role) {
            \Spatie\Permission\Models\Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        }
    }
}
