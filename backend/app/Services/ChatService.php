<?php

namespace App\Services;

use App\Contracts\Services\ChatServiceInterface;
use App\Models\MessageAttachment;
use App\Models\MessageReaction;
use App\Models\Project;
use App\Models\ProjectChannel;
use App\Models\ProjectMessage;
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

        if ($channel->is_internal && $this->isClientUser($user)) {
            throw new AccessDeniedHttpException('Client accounts cannot access internal team channels.');
        }

        return ProjectMessage::where('channel_id', $channelId)
            ->whereNull('parent_id') // top-level messages
            ->with([
                'user:id,name,email',
                'attachments',
                'reactions.user:id,name',
                'replies.user:id,name',
                'replies.attachments',
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

        if ($channel->is_internal && $this->isClientUser($sender)) {
            throw new AccessDeniedHttpException('Clients cannot post to internal team channels.');
        }

        $message = ProjectMessage::create([
            'channel_id'    => $channelId,
            'user_id'       => $sender->id,
            'parent_id'     => $data['parent_id'] ?? null,
            'content'       => $data['content'],
            'code_snippet'  => $data['code_snippet'] ?? null,
            'code_language' => $data['code_language'] ?? null,
            'is_internal'   => $channel->is_internal,
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
