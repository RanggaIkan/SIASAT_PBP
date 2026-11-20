<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentRequest;
use App\Http\Requests\Admin\UpdateStudentRequest;
use App\Models\Student;
use App\Services\MasterAcademicService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct(
        private readonly MasterAcademicService $masterService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $isActive = $request->query('is_active');

        $students = Student::with('user:id,username,name,role,is_active')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('student_number', 'like', "%{$search}%")
                        ->orWhere('study_program', 'like', "%{$search}%")
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
            ->orderBy('student_number')
            ->get();

        return ApiResponse::success($students, 'Daftar mahasiswa berhasil dimuat.');
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = $this->masterService->createStudent($request->validated());

        return ApiResponse::success($student, 'Data mahasiswa berhasil ditambahkan.', 201);
    }

    public function update(UpdateStudentRequest $request, int $studentId): JsonResponse
    {
        $student = Student::with('user')->findOrFail($studentId);
        $updated = $this->masterService->updateStudent($student, $request->validated(), (int) $request->user()->id);

        return ApiResponse::success($updated, 'Data mahasiswa berhasil diperbarui.');
    }
}
