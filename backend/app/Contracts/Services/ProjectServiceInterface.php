<?php

namespace App\Contracts\Services;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;

interface ProjectServiceInterface
{
    public function listProjects(array $filters = [], ?User $user = null): array;

    public function getProjectDetail(int $projectId, ?User $user = null): array;

    public function createProject(array $data, User $creator): Project;

    public function updateProject(Project $project, array $data): Project;

    public function getBudgetSnapshot(Project $project): array;

    public function getCapacityMatrix(Project $project, int $weeks = 2): array;

    public function createMilestone(Project $project, array $data): ProjectMilestone;

    public function invoiceMilestone(ProjectMilestone $milestone): Invoice;
}
