<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $action = trim((string) $request->query('action', ''));

        $logs = AuditLog::with('user:id,username,name,role')
            ->when($action !== '', fn ($q) => $q->where('action', 'like', "%{$action}%"))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return ApiResponse::success($logs, 'Jejak audit sistem berhasil dimuat.');
    }
}
