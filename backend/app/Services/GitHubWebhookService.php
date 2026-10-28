<?php

namespace App\Services;

use App\Contracts\Services\GitHubWebhookServiceInterface;
use App\Models\GithubCommit;
use App\Models\GithubPullRequest;
use App\Models\GithubRepo;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class GitHubWebhookService implements GitHubWebhookServiceInterface
{
    /**
     * Process GitHub push event.
     */
    public function processPushEvent(array $payload, ?string $signature = null, ?string $repoFullName = null): array
    {
        $fullName = $repoFullName ?? ($payload['repository']['full_name'] ?? null);
        if (! $fullName) {
            throw new NotFoundHttpException('Repository full_name not specified in payload.');
        }

        $repo = GithubRepo::where('repo_full_name', $fullName)->where('is_active', true)->first();
        if (! $repo) {
            throw new NotFoundHttpException("Repository '{$fullName}' not registered in CRM.");
        }

        // Verify HMAC signature if provided
        if ($signature && ! $this->verifySignature($payload, $signature, $repo->webhook_secret)) {
            throw new AccessDeniedHttpException('Invalid GitHub webhook HMAC-SHA256 signature.');
        }

        $commitsIngested = 0;
        $linkedTaskIds = [];

        $commits = $payload['commits'] ?? [];
        foreach ($commits as $commitData) {
            $sha = $commitData['id'] ?? (string) Str::uuid();
            $message = $commitData['message'] ?? '';
            $authorName = $commitData['author']['name'] ?? 'Unknown Author';
            $authorUsername = $commitData['author']['username'] ?? $authorName;
            $authorEmail = $commitData['author']['email'] ?? null;
            $committedAt = isset($commitData['timestamp']) ? Carbon::parse($commitData['timestamp']) : now();

            // Extract TASK-{id} or #TASK-{id}
            $taskId = null;
            if (preg_match('/(?:TASK-|#TASK-)(\d+)/i', $message, $matches)) {
                $possibleTaskId = (int) $matches[1];
                $task = Task::where('id', $possibleTaskId)
                    ->where('project_id', $repo->project_id)
                    ->first();
                if ($task) {
                    $taskId = $task->id;
                    $linkedTaskIds[] = $taskId;
                }
            }

            // Match user by email or name
            $matchedUser = null;
            if ($authorEmail) {
                $matchedUser = User::where('email', $authorEmail)->first();
            }
            if (! $matchedUser && $authorUsername) {
                $matchedUser = User::where('name', 'like', "%{$authorUsername}%")->first();
            }

            // Estimate additions/deletions if available
            $added = is_array($commitData['added'] ?? null) ? count($commitData['added']) * 15 : 12;
            $removed = is_array($commitData['removed'] ?? null) ? count($commitData['removed']) * 5 : 4;

            GithubCommit::updateOrCreate(
                ['sha' => $sha],
                [
                    'repo_id'       => $repo->id,
                    'task_id'       => $taskId,
                    'user_id'       => $matchedUser?->id,
                    'author_github' => $authorUsername,
                    'author_name'   => $authorName,
                    'message'       => $message,
                    'additions'     => $added,
                    'deletions'     => $removed,
                    'committed_at'  => $committedAt,
                ]
            );

            $commitsIngested++;
        }

        return [
            'status'           => 'success',
            'repo'             => $repo->repo_full_name,
            'commits_ingested' => $commitsIngested,
            'linked_task_ids'  => array_values(array_unique($linkedTaskIds)),
        ];
    }

    /**
     * Process GitHub pull_request event.
     */
    public function processPullRequestEvent(array $payload, ?string $signature = null, ?string $repoFullName = null): array
    {
        $fullName = $repoFullName ?? ($payload['repository']['full_name'] ?? null);
        $repo = GithubRepo::where('repo_full_name', $fullName)->where('is_active', true)->first();
        if (! $repo) {
            throw new NotFoundHttpException("Repository '{$fullName}' not registered in CRM.");
        }

        if ($signature && ! $this->verifySignature($payload, $signature, $repo->webhook_secret)) {
            throw new AccessDeniedHttpException('Invalid GitHub webhook HMAC-SHA256 signature.');
        }

        $prData = $payload['pull_request'] ?? [];
        $action = $payload['action'] ?? 'opened';
        $prNumber = $prData['number'] ?? 0;
        $title = $prData['title'] ?? 'Untitled PR';
        $author = $prData['user']['login'] ?? 'Unknown';
        $merged = ! empty($prData['merged']);
        $state = $merged ? 'merged' : ($action === 'closed' ? 'closed' : 'open');
        $mergedAt = $merged ? (isset($prData['merged_at']) ? Carbon::parse($prData['merged_at']) : now()) : null;

        $pr = GithubPullRequest::updateOrCreate(
            ['repo_id' => $repo->id, 'pr_number' => $prNumber],
            [
                'title'     => $title,
                'author'    => $author,
                'state'     => $state,
                'merged_at' => $mergedAt,
            ]
        );

        return [
            'status' => 'success',
            'pr'     => $pr,
        ];
    }

    /**
     * Link or configure a GitHub repository for a project.
     */
    public function linkRepository(int $projectId, array $data): GithubRepo
    {
        $project = Project::findOrFail($projectId);

        return GithubRepo::updateOrCreate(
            ['project_id' => $project->id],
            [
                'repo_full_name' => $data['repo_full_name'],
                'webhook_secret' => $data['webhook_secret'] ?? Str::random(32),
                'is_active'      => $data['is_active'] ?? true,
            ]
        );
    }

    /**
     * Simulate a commit or pull request for testing.
     */
    public function simulateWebhook(int $projectId, array $data, User $user): array
    {
        $project = Project::findOrFail($projectId);

        // Ensure project has a repo record
        $repo = GithubRepo::firstOrCreate(
            ['project_id' => $project->id],
            [
                'repo_full_name' => 'salescrm/' . Str::slug($project->name ?? $project->title ?? 'project'),
                'webhook_secret' => Str::random(32),
                'is_active'      => true,
            ]
        );

        $type = $data['type'] ?? 'commit';

        if ($type === 'pull_request') {
            $latestPrNum = (GithubPullRequest::where('repo_id', $repo->id)->max('pr_number') ?? 0) + 1;
            $pr = GithubPullRequest::create([
                'repo_id'   => $repo->id,
                'pr_number' => $latestPrNum,
                'title'     => $data['title'] ?? "feat: project update #{$latestPrNum}",
                'author'    => $user->name,
                'state'     => $data['state'] ?? 'merged',
                'merged_at' => ($data['state'] ?? 'merged') === 'merged' ? now() : null,
            ]);

            return [
                'status'  => 'success',
                'type'    => 'pull_request',
                'item'    => $pr,
                'message' => "Simulated PR #{$latestPrNum} successfully created.",
            ];
        }

        // Commit simulation
        $taskId = ! empty($data['task_id']) ? (int) $data['task_id'] : null;
        $task = $taskId ? Task::where('id', $taskId)->where('project_id', $project->id)->first() : null;
        $commitMessage = $data['message'] ?? ($task ? "feat: TASK-{$task->id}: Implement {$task->title}" : "refactor: project maintenance & improvements");

        $commit = GithubCommit::create([
            'repo_id'       => $repo->id,
            'task_id'       => $task?->id,
            'user_id'       => $user->id,
            'sha'           => Str::lower(Str::random(40)),
            'author_github' => Str::slug($user->name),
            'author_name'   => $user->name,
            'message'       => $commitMessage,
            'additions'     => (int) ($data['additions'] ?? rand(25, 180)),
            'deletions'     => (int) ($data['deletions'] ?? rand(5, 45)),
            'committed_at'  => now(),
        ]);

        return [
            'status'  => 'success',
            'type'    => 'commit',
            'item'    => $commit->load('task:id,title'),
            'message' => "Simulated commit {$commit->sha} linked to task {$task?->id}.",
        ];
    }

    /**
     * Get aggregate Git analytics for a project.
     */
    public function getProjectGitAnalytics(int $projectId): array
    {
        $repo = GithubRepo::where('project_id', $projectId)->first();

        if (! $repo) {
            return [
                'repo_configured' => false,
                'total_commits'   => 0,
                'total_additions' => 0,
                'total_deletions' => 0,
                'net_lines'       => 0,
                'prs_count'       => 0,
                'prs_merged'      => 0,
                'contributors'    => [],
                'timeline'        => [],
                'recent_commits'  => [],
            ];
        }

        $commitsQuery = GithubCommit::where('repo_id', $repo->id);

        $totalCommits = (clone $commitsQuery)->count();
        $totalAdditions = (int) (clone $commitsQuery)->sum('additions');
        $totalDeletions = (int) (clone $commitsQuery)->sum('deletions');

        $prsCount = GithubPullRequest::where('repo_id', $repo->id)->count();
        $prsMerged = GithubPullRequest::where('repo_id', $repo->id)->where('state', 'merged')->count();

        // Contributor leaderboard
        $contributors = (clone $commitsQuery)
            ->select('author_name', DB::raw('COUNT(*) as commit_count'), DB::raw('SUM(additions) as total_additions'), DB::raw('SUM(deletions) as total_deletions'))
            ->groupBy('author_name')
            ->orderByDesc('commit_count')
            ->limit(10)
            ->get();

        // 14-day activity timeline
        $startDate = now()->subDays(13)->startOfDay();
        $timelineData = (clone $commitsQuery)
            ->where('committed_at', '>=', $startDate)
            ->select(DB::raw('DATE(committed_at) as date'), DB::raw('COUNT(*) as commits'), DB::raw('SUM(additions) as additions'), DB::raw('SUM(deletions) as deletions'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Fill all 14 days
        $timeline = [];
        for ($i = 13; $i >= 0; $i--) {
            $dayStr = now()->subDays($i)->format('Y-m-d');
            $timeline[] = [
                'date'      => $dayStr,
                'label'     => now()->subDays($i)->format('M d'),
                'commits'   => (int) ($timelineData[$dayStr]->commits ?? 0),
                'additions' => (int) ($timelineData[$dayStr]->additions ?? 0),
                'deletions' => (int) ($timelineData[$dayStr]->deletions ?? 0),
            ];
        }

        // Recent 15 commits with task title
        $recentCommits = (clone $commitsQuery)
            ->with(['task:id,title,status', 'user:id,name,email'])
            ->latest('committed_at')
            ->limit(15)
            ->get();

        return [
            'repo_configured' => true,
            'repo'            => [
                'id'             => $repo->id,
                'repo_full_name' => $repo->repo_full_name,
                'is_active'      => $repo->is_active,
            ],
            'total_commits'   => $totalCommits,
            'total_additions' => $totalAdditions,
            'total_deletions' => $totalDeletions,
            'net_lines'       => $totalAdditions - $totalDeletions,
            'prs_count'       => $prsCount,
            'prs_merged'      => $prsMerged,
            'contributors'    => $contributors,
            'timeline'        => $timeline,
            'recent_commits'  => $recentCommits,
        ];
    }

    /**
     * Verify GitHub HMAC-SHA256 signature.
     */
    protected function verifySignature(array $payload, string $signature, string $secret): bool
    {
        $payloadJson = json_encode($payload);
        $expected = 'sha256=' . hash_hmac('sha256', $payloadJson, $secret);

        return hash_equals($expected, $signature);
    }
}
