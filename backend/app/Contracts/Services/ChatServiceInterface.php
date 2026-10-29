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

    /**
     * Get or create a 1-on-1 direct message channel between current user and another user.
     *
     * @param int $projectId
     * @param int $otherUserId
     * @param User $currentUser
     * @return ProjectChannel
     */
    public function getOrCreateDirectChannel(int $projectId, int $otherUserId, User $currentUser): ProjectChannel;

    /**
     * Mark unread messages in a channel as read by the user.
     *
     * @param int $channelId
     * @param User $user
     * @param int|null $upToMessageId
     * @return array
     */
    public function markChannelAsRead(int $channelId, User $user, ?int $upToMessageId = null): array;

    /**
     * Touch user presence heartbeat.
     *
     * @param User $user
     * @return void
     */
    public function recordHeartbeat(User $user): void;

    /**
     * Get real-time online/offline presence for all project participants.
     *
     * @param int $projectId
     * @param User $user
     * @return Collection
     */
    public function getProjectPresence(int $projectId, User $user): Collection;
}
