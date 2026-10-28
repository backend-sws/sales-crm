<?php

namespace App\Contracts\Services;

use App\Models\ChangeRequest;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\ScopeApproval;
use App\Models\ScopeVersion;
use App\Models\Task;
use App\Models\User;

interface ScopeGovernanceServiceInterface
{
    public function listScopeVersions(Project $project): array;

    public function createScopeVersion(Project $project, array $data, User $author): ScopeVersion;

    public function approveScope(ScopeVersion $scope, array $approvalData, string $ip, string $userAgent, User $client): ScopeApproval;

    public function diffVersions(int $versionId1, int $versionId2): array;

    public function listChangeRequests(Project $project): array;

    public function createChangeRequest(Project $project, array $data, User $requester): ChangeRequest;

    public function decideChangeRequest(ChangeRequest $cr, string $decision, ?string $notes, User $decider): ChangeRequest;

    public function listMeetings(Project $project): array;

    public function createMeeting(Project $project, array $data, User $creator): ProjectMeeting;

    public function confirmMoM(ProjectMeeting $meeting, User $client): ProjectMeeting;

    public function disputeMoM(ProjectMeeting $meeting, string $reason, User $client): ProjectMeeting;

    public function convertActionItemToTask(int $actionItemId, User $user): Task;
}
