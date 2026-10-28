<?php

namespace App\Contracts\Services;

use App\Models\GithubRepo;
use App\Models\User;

interface GitHubWebhookServiceInterface
{
    /**
     * Process GitHub push event webhook payload.
     *
     * @param array $payload
     * @param string|null $signature
     * @param string|null $repoFullName
     * @return array
     */
    public function processPushEvent(array $payload, ?string $signature = null, ?string $repoFullName = null): array;

    /**
     * Process GitHub pull_request event webhook payload.
     *
     * @param array $payload
     * @param string|null $signature
     * @param string|null $repoFullName
     * @return array
     */
    public function processPullRequestEvent(array $payload, ?string $signature = null, ?string $repoFullName = null): array;

    /**
     * Link or configure a GitHub repository for a project.
     *
     * @param int $projectId
     * @param array $data
     * @return GithubRepo
     */
    public function linkRepository(int $projectId, array $data): GithubRepo;

    /**
     * Simulate a GitHub commit/PR event for testing without live webhooks.
     *
     * @param int $projectId
     * @param array $data
     * @param User $user
     * @return array
     */
    public function simulateWebhook(int $projectId, array $data, User $user): array;

    /**
     * Get aggregate Git analytics for a project.
     *
     * @param int $projectId
     * @return array
     */
    public function getProjectGitAnalytics(int $projectId): array;
}
