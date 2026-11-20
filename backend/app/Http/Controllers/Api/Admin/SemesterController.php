<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSemesterRequest;
use App\Http\Requests\Admin\UpdateSemesterRequest;
use App\Models\Semester;
use App\Services\MasterAcademicService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class SemesterController extends Controller
{
    public function __construct(
        private readonly MasterAcademicService $masterService
    ) {}

    public function index(): JsonResponse
    {
        $semesters = Semester::orderByDesc('is_active')
            ->orderByDesc('code')
            ->get();

        return ApiResponse::success($semesters, 'Daftar semester berhasil dimuat.');
    }

    public function store(StoreSemesterRequest $request): JsonResponse
    {
        $semester = $this->masterService->createSemester($request->validated(), (int) $request->user()->id);

        return ApiResponse::success($semester, 'Data semester berhasil ditambahkan.', 201);
    }

    public function update(UpdateSemesterRequest $request, int $semesterId): JsonResponse
    {
        $semester = Semester::findOrFail($semesterId);
        $updated = $this->masterService->updateSemester($semester, $request->validated(), (int) $request->user()->id);

        return ApiResponse::success($updated, 'Data semester berhasil diperbarui.');
    }
}
