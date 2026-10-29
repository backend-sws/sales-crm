<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ChatServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Slack Project Chat", description: "Slack-grade real-time channels, internal notes, code snippets, and attachments")]
class ChatController extends BaseApiController
{
    public function __construct(
        protected ChatServiceInterface $chatService
    ) {}

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/channels",
        summary: "Get project chat channels (#general, #internal-notes)",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function channels(Request $request, int $projectId): JsonResponse
    {
        $channels = $this->chatService->getProjectChannels($projectId, $request->user());

        return $this->successResponse($channels, 'Project chat channels retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/channels/{channelId}/messages",
        summary: "Get paginated messages for a chat channel",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function messages(Request $request, int $channelId): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 50);
        $messages = $this->chatService->getChannelMessages($channelId, $request->user(), $perPage);

        return $this->paginatedResponse($messages, 'Channel messages retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/channels/{channelId}/messages",
        summary: "Send a new message with code snippet and attachments",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function sendMessage(Request $request, int $channelId): JsonResponse
    {
        $validated = $request->validate([
            'content'                    => 'required|string',
            'code_snippet'               => 'nullable|string',
            'code_language'              => 'nullable|string|max:50',
            'parent_id'                  => 'nullable|integer|exists:project_messages,id',
            'attachments'                => 'nullable|array',
            'attachments.*.file_name'    => 'required_with:attachments|string|max:255',
            'attachments.*.file_url'     => 'required_with:attachments|string|max:500',
            'attachments.*.file_type'    => 'nullable|string|max:100',
            'attachments.*.file_size_bytes' => 'nullable|integer',
        ]);

        $message = $this->chatService->sendMessage($channelId, $validated, $request->user());

        return $this->createdResponse($message, 'Message posted successfully.');
    }

    #[OA\Post(
        path: "/api/v1/messages/{messageId}/react",
        summary: "Toggle an emoji reaction on a message",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function react(Request $request, int $messageId): JsonResponse
    {
        $validated = $request->validate([
            'emoji' => 'required|string|max:20',
        ]);

        $result = $this->chatService->toggleReaction($messageId, $validated['emoji'], $request->user());

        return $this->successResponse($result, 'Reaction updated successfully.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/direct-channel",
        summary: "Get or create a 1-on-1 direct message channel with a team member",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function directChannel(Request $request, int $projectId): JsonResponse
    {
        $validated = $request->validate([
            'other_user_id' => 'required|integer|exists:users,id',
        ]);

        $channel = $this->chatService->getOrCreateDirectChannel($projectId, (int) $validated['other_user_id'], $request->user());

        return $this->successResponse($channel, 'Direct message channel ready.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/chat-presence",
        summary: "Get real-time online/offline presence of project members",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function presence(Request $request, int $projectId): JsonResponse
    {
        $presence = $this->chatService->getProjectPresence($projectId, $request->user());

        return $this->successResponse($presence, 'Project presence retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/chat/heartbeat",
        summary: "Record presence heartbeat for current user",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function heartbeat(Request $request): JsonResponse
    {
        $this->chatService->recordHeartbeat($request->user());

        return $this->successResponse(['status' => 'alive'], 'Heartbeat recorded.');
    }

    #[OA\Post(
        path: "/api/v1/channels/{channelId}/read",
        summary: "Mark messages in a channel as read by current user",
        security: [["bearerAuth" => []]],
        tags: ["Slack Project Chat"]
    )]
    public function markRead(Request $request, int $channelId): JsonResponse
    {
        $upToMessageId = $request->input('last_message_id') ? (int) $request->input('last_message_id') : null;
        $result = $this->chatService->markChannelAsRead($channelId, $request->user(), $upToMessageId);

        return $this->successResponse($result, 'Channel messages marked as read.');
    }
}
