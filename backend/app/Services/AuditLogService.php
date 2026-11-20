<?php

namespace App\Services;

use App\Models\AuditLog;
use Carbon\CarbonImmutable;

class AuditLogService
{
    public static function log(
        ?int $userId,
        string $action,
        string $entity,
        ?int $entityId = null,
        ?array $details = null
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'details' => $details,
            'created_at' => CarbonImmutable::now('UTC'),
        ]);
    }
}
