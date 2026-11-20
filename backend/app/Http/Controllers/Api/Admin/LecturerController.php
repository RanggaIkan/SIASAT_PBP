<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLecturerRequest;
use App\Http\Requests\Admin\UpdateLecturerRequest;
use App\Models\Lecturer;
use App\Services\MasterAcademicService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LecturerController extends Controller
{
    public function __construct(
        private readonly MasterAcademicService $masterService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $isActive = $request->query('is_active');

        $lecturers = Lecturer::with('user:id,username,name,role,is_active')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('lecturer_number', 'like', "%{$search}%")
                        ->orWhere('faculty', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('name', 'like', "%{$search}%")
                                ->orWhere('username', 'like', "%{$search}%");
                        });
                });
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $flag = filter_var($isActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($flag !== null) {
                    $query->whereHas('user', fn ($uq) => $uq->where('is_active', $flag));
                }
            })
            ->orderBy('lecturer_number')
            ->get();

        return ApiResponse::success($lecturers, 'Daftar dosen berhasil dimuat.');
    }

    public function store(StoreLecturerRequest $request): JsonResponse
    {
        $lecturer = $this->masterService->createLecturer($request->validated());

        return ApiResponse::success($lecturer, 'Data dosen berhasil ditambahkan.', 201);
    }

    public function update(UpdateLecturerRequest $request, int $lecturerId): JsonResponse
    {
        $lecturer = Lecturer::with('user')->findOrFail($lecturerId);
        $updated = $this->masterService->updateLecturer($lecturer, $request->validated(), (int) $request->user()->id);

        return ApiResponse::success($updated, 'Data dosen berhasil diperbarui.');
    }
}
