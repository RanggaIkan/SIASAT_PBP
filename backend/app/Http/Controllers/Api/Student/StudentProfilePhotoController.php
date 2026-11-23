<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreProfilePhotoRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Throwable;

class StudentProfilePhotoController extends Controller
{
    public function store(StoreProfilePhotoRequest $request): JsonResponse
    {
        $user = $request->user();
        $oldPath = $user->profile_photo_path;
        $newPath = $request->file('photo')->store("profile-photos/{$user->id}", 'public');

        if (! $newPath) {
            ApiResponse::throwError(
                'PROFILE_PHOTO_UPLOAD_FAILED',
                'Foto profil gagal disimpan.',
                500
            );
        }

        try {
            $user->update(['profile_photo_path' => $newPath]);
        } catch (Throwable $error) {
            Storage::disk('public')->delete($newPath);
            throw $error;
        }

        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return ApiResponse::success(
            ['user' => $user->fresh()],
            'Foto profil diperbarui.'
        );
    }
}
