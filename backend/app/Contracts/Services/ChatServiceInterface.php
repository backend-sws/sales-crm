<?php

namespace App\Contracts\Services;

use App\Models\ProjectChannel;
use App\Models\ProjectMessage;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ChatServiceInterface
{
    /**
     * Get or initialize channels for a project, respecting role visibility.
     *
     * @param int $projectId
     * @param User $user
     * @return Collection<int, ProjectChannel>
     */
    public function getProjectChannels(int $projectId, User $user): Collection;

    /**
     * Get messages for a channel with attachments and reactions.
     *
     * @param int $channelId
     * @param User $user
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getChannelMessages(int $channelId, User $user, int $perPage = 50): LengthAwarePaginator;

    /**
     * Send a new message to a channel with optional attachments & code snippet.
     *
     * @param int $channelId
     * @param array $data
     * @param User $sender
     * @return ProjectMessage
     */
    public function sendMessage(int $channelId, array $data, User $sender): ProjectMessage;

    /**
     * Toggle an emoji reaction on a message.
     *
     * @param int $messageId
     * @param string $emoji
     * @param User $user
     * @return array
     */
    public function toggleReaction(int $messageId, string $emoji, User $user): array;
}
