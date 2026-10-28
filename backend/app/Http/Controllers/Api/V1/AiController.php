<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\AiAssistantServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\Sprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "AI Assistant (Gemini)", description: "Google Gemini Generative AI for leads, MoM meeting notes, sprint risks, and task breakdown")]
class AiController extends BaseApiController
{
    public function __construct(
        protected AiAssistantServiceInterface $aiService
    ) {}

    #[OA\Get(
        path: "/api/v1/ai/leads/{id}/suggestions",
        summary: "Get AI recommendations and strategy for a lead",
        security: [["bearerAuth" => []]],
        tags: ["AI Assistant (Gemini)"]
    )]
    public function leadSuggestions(int $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);
        $suggestions = $this->aiService->getLeadSuggestions($lead);

        return $this->successResponse($suggestions, 'Lead AI suggestions generated successfully.');
    }

    #[OA\Post(
        path: "/api/v1/ai/meetings/{id}/summarize",
        summary: "Auto-summarize raw meeting notes into decisions and action items",
        security: [["bearerAuth" => []]],
        tags: ["AI Assistant (Gemini)"]
    )]
    public function summarizeMeeting(Request $request, int $id): JsonResponse
    {
        $meeting = ProjectMeeting::findOrFail($id);
        $notes = $request->input('notes', $meeting->mom_notes ?: $meeting->agenda);

        if (empty($notes)) {
            return $this->errorResponse('Meeting notes or transcript is empty.', 422);
        }

        $summary = $this->aiService->summarizeMeetingNotes($notes, $meeting);

        return $this->successResponse($summary, 'Meeting notes summarized successfully by AI.');
    }

    #[OA\Get(
        path: "/api/v1/ai/sprints/{id}/risk-assessment",
        summary: "Evaluate sprint delivery risk and resource suggestions",
        security: [["bearerAuth" => []]],
        tags: ["AI Assistant (Gemini)"]
    )]
    public function sprintRisk(int $id): JsonResponse
    {
        $sprint = Sprint::findOrFail($id);
        $risk = $this->aiService->getSprintRiskAssessment($sprint);

        return $this->successResponse($risk, 'Sprint AI risk assessment generated.');
    }

    #[OA\Post(
        path: "/api/v1/ai/projects/{id}/generate-tasks",
        summary: "Generate technical tasks breakdown from requirement description",
        security: [["bearerAuth" => []]],
        tags: ["AI Assistant (Gemini)"]
    )]
    public function generateTasks(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'requirement' => 'required|string|min:5|max:1000',
        ]);

        $project = Project::findOrFail($id);
        $breakdown = $this->aiService->generateTaskBreakdown($project, $request->input('requirement'));

        return $this->successResponse($breakdown, 'Task breakdown generated successfully by AI.');
    }
}
