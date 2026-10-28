<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\GitHubWebhookServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "GitHub Integration & Analytics", description: "GitHub push & PR webhooks, commit-task linkage, and Git activity analytics")]
class GitHubWebhookController extends BaseApiController
{
    public function __construct(
        protected GitHubWebhookServiceInterface $githubService
    ) {}

    #[OA\Post(
        path: "/api/v1/webhooks/github",
        summary: "Ingest live GitHub webhook payload (push or pull_request)",
        tags: ["GitHub Integration & Analytics"]
    )]
    public function handleWebhook(Request $request): JsonResponse
    {
        $event = $request->header('X-GitHub-Event', 'push');
        $signature = $request->header('X-Hub-Signature-256');
        $payload = $request->all();

        if ($event === 'push') {
            $result = $this->githubService->processPushEvent($payload, $signature);
            return $this->successResponse($result, 'GitHub push event processed.');
        }

        if ($event === 'pull_request') {
            $result = $this->githubService->processPullRequestEvent($payload, $signature);
            return $this->successResponse($result, 'GitHub pull request event processed.');
        }

        return $this->successResponse(['event' => $event], "GitHub event '{$event}' ignored.");
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/github/link",
        summary: "Link GitHub repository to a project",
        security: [["bearerAuth" => []]],
        tags: ["GitHub Integration & Analytics"]
    )]
    public function linkRepo(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'repo_full_name' => 'required|string|max:255',
            'webhook_secret' => 'nullable|string|max:255',
            'is_active'      => 'nullable|boolean',
        ]);

        $repo = $this->githubService->linkRepository($projectId, $validated);

        return $this->successResponse($repo, 'GitHub repository linked successfully.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/github/analytics",
        summary: "Get GitHub repository velocity and commit analytics",
        security: [["bearerAuth" => []]],
        tags: ["GitHub Integration & Analytics"]
    )]
    public function analytics(int $projectId): JsonResponse
    {
        $analytics = $this->githubService->getProjectGitAnalytics($projectId);

        return $this->successResponse($analytics, 'Git analytics retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/github/simulate-webhook",
        summary: "Simulate a GitHub commit or PR for local dev testing",
        security: [["bearerAuth" => []]],
        tags: ["GitHub Integration & Analytics"]
    )]
    public function simulate(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'type'      => 'nullable|string|in:commit,pull_request',
            'task_id'   => 'nullable|integer|exists:tasks,id',
            'message'   => 'nullable|string|max:500',
            'title'     => 'nullable|string|max:255',
            'additions' => 'nullable|integer',
            'deletions' => 'nullable|integer',
            'state'     => 'nullable|string|in:open,merged,closed',
        ]);

        $result = $this->githubService->simulateWebhook($projectId, $validated, $request->user());

        return $this->createdResponse($result, $result['message']);
    }
}
