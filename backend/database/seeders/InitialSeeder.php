<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class InitialSeeder extends Seeder
{
    public function run(): void
    {
        $username = trim((string) env('INITIAL_ADMIN_USERNAME', ''));
        $password = (string) env('INITIAL_ADMIN_PASSWORD', '');

        if ($username === '' || $password === '') {
            throw new RuntimeException(
                'INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD must be configured in .env before running InitialSeeder.'
            );
        }

        User::updateOrCreate(
            ['username' => $username],
            [
                'name' => 'Admin Akademik',
                'password' => Hash::make($password),
                'role' => 'admin',
                'is_active' => true,
            ]
        );
    }
}
