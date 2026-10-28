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
}
