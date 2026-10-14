<?php

namespace App\Services;

use App\Contracts\Services\ScopeGovernanceServiceInterface;
use App\Models\ChangeRequest;
use App\Models\MeetingActionItem;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\ScopeApproval;
use App\Models\ScopeVersion;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ScopeGovernanceService implements ScopeGovernanceServiceInterface
{
    public function listScopeVersions(Project $project): array
    {
        return $project->scopeVersions()
            ->with(['author:id,name,email', 'approval.user:id,name,email'])
            ->orderBy('version_number', 'desc')
            ->get()
            ->toArray();
    }

    public function createScopeVersion(Project $project, array $data, User $author): ScopeVersion
    {
        $lastVersion = $project->scopeVersions()->max('version_number') ?? 0;
        $nextVersion = $lastVersion + 1;

        return $project->scopeVersions()->create([
            'version_number'       => $nextVersion,
            'document_body'        => $data['document_body'],
            'pdf_snapshot_url'     => $data['pdf_snapshot_url'] ?? null,
            'diff_from_version_id' => $data['diff_from_version_id'] ?? null,
            'is_baseline'          => false,
            'status'               => $data['status'] ?? 'pending_approval',
            'created_by'           => $author->id,
        ]);
    }

    public function approveScope(ScopeVersion $scope, array $approvalData, string $ip, string $userAgent, User $client): ScopeApproval
    {
        return DB::transaction(function () use ($scope, $approvalData, $ip, $userAgent, $client) {
            // 1. Record legal digital approval
            $approval = ScopeApproval::create([
                'scope_version_id' => $scope->id,
                'user_id'          => $client->id,
                'signer_name'      => $approvalData['signer_name'] ?? $client->name,
                'signature_data'   => $approvalData['signature_data'],
                'signature_type'   => $approvalData['signature_type'] ?? 'drawn',
                'ip_address'       => $ip,
                'user_agent'       => substr($userAgent, 0, 500),
                'approved_at'      => now(),
            ]);

            // 2. Mark this version as the official baseline
            $project = $scope->project;
            $project->scopeVersions()
                ->where('id', '!=', $scope->id)
                ->where('is_baseline', true)
                ->update(['is_baseline' => false, 'status' => 'superseded']);

            $scope->update([
                'is_baseline' => true,
                'status'      => 'approved',
            ]);

            // 3. Advance project status if still in draft
            if ($project->status === 'draft') {
                $project->update(['status' => 'scope_approved']);
            }

            return $approval;
        });
    }

    public function diffVersions(int $versionId1, int $versionId2): array
    {
        $v1 = ScopeVersion::with('author:id,name')->findOrFail($versionId1);
        $v2 = ScopeVersion::with('author:id,name')->findOrFail($versionId2);

        $lines1 = explode("\n", str_replace("\r\n", "\n", $v1->document_body));
        $lines2 = explode("\n", str_replace("\r\n", "\n", $v2->document_body));

        $diff = [];
        $maxLines = max(count($lines1), count($lines2));

        for ($i = 0; $i < $maxLines; $i++) {
            $line1 = $lines1[$i] ?? null;
            $line2 = $lines2[$i] ?? null;

            if ($line1 === $line2) {
                $type = 'unchanged';
            } elseif ($line1 === null) {
                $type = 'added';
            } elseif ($line2 === null) {
                $type = 'removed';
            } else {
                $type = 'modified';
            }

            $diff[] = [
                'line_number'  => $i + 1,
                'original'     => $line1,
                'modified'     => $line2,
                'type'         => $type,
            ];
        }

        return [
            'v1' => [
                'id'             => $v1->id,
                'version_number' => $v1->version_number,
                'author'         => $v1->author?->name,
                'created_at'     => $v1->created_at->toDateTimeString(),
            ],
            'v2' => [
                'id'             => $v2->id,
                'version_number' => $v2->version_number,
                'author'         => $v2->author?->name,
                'created_at'     => $v2->created_at->toDateTimeString(),
            ],
            'diff' => $diff,
        ];
    }

    public function listChangeRequests(Project $project): array
    {
        return $project->changeRequests()
            ->with(['requester:id,name,email', 'decider:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    public function createChangeRequest(Project $project, array $data, User $requester): ChangeRequest
    {
        return $project->changeRequests()->create([
            'requested_by'        => $requester->id,
            'title'               => $data['title'],
            'description'         => $data['description'],
            'estimated_hours'     => $data['estimated_hours'] ?? 0,
            'additional_cost'     => $data['additional_cost'] ?? 0,
            'timeline_delay_days' => $data['timeline_delay_days'] ?? 0,
            'status'              => 'submitted',
        ]);
    }

    public function decideChangeRequest(ChangeRequest $cr, string $decision, ?string $notes, User $decider): ChangeRequest
    {
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'decision' => ["Decision must be 'approved' or 'rejected'."],
            ]);
        }

        return DB::transaction(function () use ($cr, $decision, $notes, $decider) {
            $cr->update([
                'status'             => $decision,
                'decision_notes'     => $notes,
                'decided_by'         => $decider->id,
                'client_decision_at' => now(),
            ]);

            // If approved, automatically create a Task for the project
            if ($decision === 'approved') {
                $project = $cr->project;
                $project->tasks()->create([
                    'source_type'     => 'change_request',
                    'source_id'       => $cr->id,
                    'title'           => "CR: {$cr->title}",
                    'description'     => $cr->description,
                    'status'          => 'backlog',
                    'priority'        => 'high',
                    'estimated_hours' => $cr->estimated_hours,
                ]);

                // Increment project total value and budget if additional cost is specified
                if ($cr->additional_cost > 0) {
                    $project->increment('total_value', $cr->additional_cost);
                    $project->increment('total_budget', $cr->additional_cost * 0.7); // 70% budget allocation
                }
            }

            return $cr->fresh(['requester', 'decider']);
        });
    }

    public function listMeetings(Project $project): array
    {
        return $project->meetings()
            ->with(['creator:id,name', 'actionItems.assignee:id,name'])
            ->orderBy('scheduled_at', 'desc')
            ->get()
            ->toArray();
    }

    public function createMeeting(Project $project, array $data, User $creator): ProjectMeeting
    {
        return DB::transaction(function () use ($project, $data, $creator) {
            $meeting = $project->meetings()->create([
                'title'            => $data['title'],
                'agenda'           => $data['agenda'] ?? null,
                'mom_body'         => $data['mom_body'] ?? null,
                'recording_url'    => $data['recording_url'] ?? null,
                'scheduled_at'     => $data['scheduled_at'] ?? now(),
                'status'           => $data['status'] ?? 'completed',
                'is_auto_accepted' => false,
                'created_by'       => $creator->id,
            ]);

            if (!empty($data['action_items']) && is_array($data['action_items'])) {
                foreach ($data['action_items'] as $item) {
                    $meeting->actionItems()->create([
                        'title'       => $item['title'],
                        'assignee_id' => $item['assignee_id'] ?? null,
                        'due_date'    => $item['due_date'] ?? null,
                        'status'      => 'pending',
                    ]);
                }
            }

            return $meeting->load('actionItems.assignee');
        });
    }

    public function confirmMoM(ProjectMeeting $meeting, User $client): ProjectMeeting
    {
        $meeting->update([
            'is_auto_accepted' => false,
            'auto_accepted_at' => now(),
        ]);

        return $meeting->fresh();
    }

    public function convertActionItemToTask(int $actionItemId, User $user): Task
    {
        $item = MeetingActionItem::with('meeting.project')->findOrFail($actionItemId);

        if ($item->converted_task_id) {
            return Task::findOrFail($item->converted_task_id);
        }

        $project = $item->meeting->project;

        return DB::transaction(function () use ($item, $project) {
            $task = $project->tasks()->create([
                'source_type' => 'meeting_action',
                'source_id'   => $item->id,
                'title'       => "Action: {$item->title}",
                'assignee_id' => $item->assignee_id,
                'status'      => 'backlog',
                'priority'    => 'medium',
                'due_date'    => $item->due_date,
            ]);

            $item->update([
                'status'            => 'in_progress',
                'converted_task_id' => $task->id,
            ]);

            return $task;
        });
    }
}
