<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Step 1: Seed all 7 roles, permissions, and demo users
        $this->call(RolesAndPermissionsSeeder::class);

        // Step 2: Seed Phase 1 Sales CRM (sources, products, comprehensive leads, follow-ups, timeline activities)
        $this->call(PhaseOneCrmSeeder::class);
    }
}