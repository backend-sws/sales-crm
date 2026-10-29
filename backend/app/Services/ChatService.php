<?php

namespace App\Services;

use App\Contracts\Services\ChatServiceInterface;
use App\Models\MessageAttachment;
use App\Models\MessageReaction;
use App\Models\Project;
use App\Models\ProjectChannel;
use App\Models\ProjectMessage;
use App\Models\ProjectMessageRead;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ChatService implements ChatServiceInterface
{
    /**
     * Get or initialize channels for a project, respecting role visibility.
     */
    public function getProjectChannels(int $projectId, User $user): Collection
    {
        $project = Project::findOrFail($projectId);

        // Ensure default channels exist
        $this->ensureDefaultChannels($project);

        $query = ProjectChannel::where('project_id', $projectId)
            ->withCount('messages');

        // Direct messages (dm-X-Y): only include if the user is a participant
        $query->where(function ($q) use ($user) {
            $q->where('name', 'not like', 'dm-%')
              ->orWhere('name', 'like', "dm-{$user->id}-%")
              ->orWhere('name', 'like', "dm-%-{$user->id}");
        });

        // If user is a client, NEVER expose internal channels
        if ($this->isClientUser($user)) {
            $query->where('is_internal', false);
        }

        return $query->orderBy('is_internal')->orderBy('name')->get();
    }

    /**
     * Get messages for a channel with attachments and reactions.
     */
    public function getChannelMessages(int $channelId, User $user, int $perPage = 50): LengthAwarePaginator
    {
        $channel = ProjectChannel::findOrFail($channelId);

        if (str_starts_with($channel->name, 'dm-')) {
            $parts = explode('-', str_replace('dm-', '', $channel->name));
            if (! in_array((string) $user->id, $parts, true)) {
                throw new AccessDeniedHttpException('You are not a participant in this direct message conversation.');
            }
        }

        if ($channel->is_internal && $this->isClientUser($user)) {
            throw new AccessDeniedHttpException('Client accounts cannot access internal team channels.');
        }

        // Touch user presence
        User::where('id', $user->id)->update(['last_seen_at' => now()]);

        // Automatically mark all unread messages in this channel as read by this user
        $this->markChannelAsRead($channelId, $user);

        return ProjectMessage::where('channel_id', $channelId)
            ->whereNull('parent_id') // top-level messages
            ->with([
                'user:id,name,email',
                'attachments',
                'reactions.user:id,name',
                'replies.user:id,name',
                'replies.attachments',
                'reads.user:id,name,avatar',
            ])
            ->latest('id')
            ->paginate($perPage);
    }

    /**
     * Send a new message to a channel with optional attachments & code snippet.
     */
    public function sendMessage(int $channelId, array $data, User $sender): ProjectMessage
    {
        $channel = ProjectChannel::findOrFail($channelId);

        if (str_starts_with($channel->name, 'dm-')) {
            $parts = explode('-', str_replace('dm-', '', $channel->name));
            if (! in_array((string) $sender->id, $parts, true)) {
                throw new AccessDeniedHttpException('You are not a participant in this direct message conversation.');
            }
        }

        if ($channel->is_internal && $this->isClientUser($sender)) {
            throw new AccessDeniedHttpException('Clients cannot post to internal team channels.');
        }

        // Touch user presence
        User::where('id', $sender->id)->update(['last_seen_at' => now()]);

        $message = ProjectMessage::create([
            'channel_id'    => $channelId,
            'user_id'       => $sender->id,
            'parent_id'     => $data['parent_id'] ?? null,
            'content'       => $data['content'],
            'code_snippet'  => $data['code_snippet'] ?? null,
            'code_language' => $data['code_language'] ?? null,
            'is_internal'   => $channel->is_internal,
        ]);

        // Sender automatically has read their own message
        ProjectMessageRead::create([
            'message_id' => $message->id,
            'user_id'    => $sender->id,
            'read_at'    => now(),
        ]);

        if (! empty($data['attachments']) && is_array($data['attachments'])) {
            foreach ($data['attachments'] as $attachment) {
                if (! empty($attachment['file_url'])) {
                    MessageAttachment::create([
                        'message_id'      => $message->id,
                        'file_name'       => $attachment['file_name'] ?? 'attachment',
                        'file_url'        => $attachment['file_url'],
                        'file_type'       => $attachment['file_type'] ?? 'application/octet-stream',
                        'file_size_bytes' => $attachment['file_size_bytes'] ?? 0,
                    ]);
                }
            }
        }

        return $message->load([
            'user:id,name,email',
            'attachments',
            'reactions.user:id,name',
            'reads.user:id,name,avatar',
        ]);
    }

    /**
     * Toggle an emoji reaction on a message.
     */
    public function toggleReaction(int $messageId, string $emoji, User $user): array
    {
        $message = ProjectMessage::findOrFail($messageId);
        $channel = $message->channel;

        if ($channel->is_internal && $this->isClientUser($user)) {
            throw new AccessDeniedHttpException('Client cannot react to internal messages.');
        }

        $existing = MessageReaction::where('message_id', $messageId)
            ->where('user_id', $user->id)
            ->where('emoji', $emoji)
            ->first();

        if ($existing) {
            $existing->delete();
            $action = 'removed';
        } else {
            MessageReaction::create([
                'message_id' => $messageId,
                'user_id'    => $user->id,
                'emoji'      => $emoji,
            ]);
            $action = 'added';
        }

        // Return updated reactions for message
        $reactions = MessageReaction::where('message_id', $messageId)
            ->with('user:id,name')
            ->get();

        return [
            'action'    => $action,
            'reactions' => $reactions,
        ];
    }

    /**
     * Ensure default #general and #internal-notes channels exist for project.
     */
    protected function ensureDefaultChannels(Project $project): void
    {
        ProjectChannel::firstOrCreate(
            ['project_id' => $project->id, 'name' => 'general'],
            ['is_internal' => false, 'topic' => 'Public project discussion with client and team']
        );

        ProjectChannel::firstOrCreate(
            ['project_id' => $project->id, 'name' => 'internal-notes'],
            ['is_internal' => true, 'topic' => 'Internal team notes, technical decisions and staff coordination']
        );
    }

    /**
     * Get or create a 1-on-1 direct message channel between current user and another user.
     */
    public function getOrCreateDirectChannel(int $projectId, int $otherUserId, User $currentUser): ProjectChannel
    {
        $project = Project::findOrFail($projectId);
        $otherUser = User::findOrFail($otherUserId);

        if ($otherUser->id === $currentUser->id) {
            throw new \InvalidArgumentException('Cannot create a direct message with yourself.');
        }

        $id1 = min($currentUser->id, $otherUserId);
        $id2 = max($currentUser->id, $otherUserId);
        $channelName = "dm-{$id1}-{$id2}";

        $channel = ProjectChannel::firstOrCreate(
            [
                'project_id' => $projectId,
                'name'       => $channelName,
            ],
            [
                'is_internal' => false,
                'topic'       => "Direct conversation between {$currentUser->name} and {$otherUser->name}",
            ]
        );

        return $channel;
    }

    /**
     * Mark unread messages in a channel as read by the user.
     */
    public function markChannelAsRead(int $channelId, User $user, ?int $upToMessageId = null): array
    {
        // Touch user presence
        User::where('id', $user->id)->update(['last_seen_at' => now()]);

        // Messages in this channel not sent by this user
        $query = ProjectMessage::where('channel_id', $channelId)
            ->where('user_id', '!=', $user->id);

        if ($upToMessageId) {
            $query->where('id', '<=', $upToMessageId);
        }

        // Filter messages user hasn't read yet
        $unreadMsgIds = $query->whereDoesntHave('reads', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->pluck('id');

        if ($unreadMsgIds->isNotEmpty()) {
            $now = now();
            $records = $unreadMsgIds->map(fn ($msgId) => [
                'message_id' => $msgId,
                'user_id'    => $user->id,
                'read_at'    => $now,
            ])->toArray();

            ProjectMessageRead::insertOrIgnore($records);
        }

        return [
            'marked_count' => $unreadMsgIds->count(),
            'message_ids'  => $unreadMsgIds->toArray(),
        ];
    }

    /**
     * Touch user presence heartbeat.
     */
    public function recordHeartbeat(User $user): void
    {
        User::where('id', $user->id)->update(['last_seen_at' => now()]);
    }

    /**
     * Get real-time online/offline presence for all project participants.
     */
    public function getProjectPresence(int $projectId, User $user): Collection
    {
        // Touch requester's presence
        User::where('id', $user->id)->update(['last_seen_at' => now()]);

        $project = Project::with([
            'projectManager:id,name,email,avatar,last_seen_at',
            'tasks.assignee:id,name,email,avatar,last_seen_at',
        ])->findOrFail($projectId);

        $members = collect();

        if ($project->tasks) {
            foreach ($project->tasks as $t) {
                if ($t->assignee) {
                    $members->push($t->assignee);
                }
            }
        }

        if ($project->projectManager && ! $members->contains('id', $project->projectManager->id)) {
            $members->push($project->projectManager);
        }

        if (! $members->contains('id', $user->id)) {
            $members->push($user);
        }

        if ($project->client_id) {
            $clientUsers = User::where('client_id', $project->client_id)
                ->select(['id', 'name', 'email', 'avatar', 'last_seen_at'])
                ->get();
            foreach ($clientUsers as $cu) {
                if (! $members->contains('id', $cu->id)) {
                    $members->push($cu);
                }
            }
        }

        if ($members->count() <= 1 && ! $this->isClientUser($user)) {
            $adminUsers = User::where('is_active', true)
                ->whereNull('client_id')
                ->select(['id', 'name', 'email', 'avatar', 'last_seen_at'])
                ->take(15)
                ->get();
            foreach ($adminUsers as $au) {
                if (! $members->contains('id', $au->id)) {
                    $members->push($au);
                }
            }
        }

        $cutoff = now()->subSeconds(90);

        return $members->unique('id')->map(function ($u) use ($cutoff) {
            $isOnline = $u->last_seen_at && $u->last_seen_at > $cutoff;
            return [
                'id'              => $u->id,
                'name'            => $u->name,
                'email'           => $u->email,
                'avatar'          => $u->avatar,
                'is_online'       => (bool) $isOnline,
                'last_seen_at'    => $u->last_seen_at?->toIso8601String(),
                'last_seen_human' => $isOnline ? 'Online' : ($u->last_seen_at ? $u->last_seen_at->diffForHumans() : 'Offline'),
            ];
        })->values();
    }

    /**
     * Helper to check if user has client role or belongs to client.
     */
    protected function isClientUser(User $user): bool
    {
        if (method_exists($user, 'hasRole') && $user->hasRole('client')) {
            return true;
        }

        return (bool) $user->client_id;
    }
}
