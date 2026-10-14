<?php

namespace App\Contracts\Services;

use App\Models\Project;
use App\Models\Sprint;

interface SprintServiceInterface
{
    public function listSprints(Project $project): array;

    public function createSprint(Project $project, array $data): Sprint;

    public function assignTasksToSprint(Sprint $sprint, array $taskIds): int;

    public function getBurndownData(Sprint $sprint): array;

    public function closeSprint(Sprint $sprint, ?string $retrospectiveNotes = null): Sprint;
}
