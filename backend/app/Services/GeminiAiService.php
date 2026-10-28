<?php

namespace App\Services;

use App\Contracts\Services\AiAssistantServiceInterface;
use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\Sprint;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiAiService implements AiAssistantServiceInterface
{
    protected ?string $apiKey;
    protected string $model = 'gemini-1.5-flash';

    public function __construct()
    {
        $this->apiKey = \App\Models\AppSetting::get('gemini_api_key', env('GEMINI_API_KEY'));
        $this->model = \App\Models\AppSetting::get('gemini_model', 'gemini-1.5-flash');
    }

    /**
     * Generate sales strategy suggestions and recommended actions for a lead.
     */
    public function getLeadSuggestions(Lead $lead): array
    {
        $daysInactive = $lead->updated_at ? Carbon::now()->diffInDays($lead->updated_at) : 0;
        $score = $lead->score ?? 50;

        $prompt = "You are an expert B2B Sales Director. Analyze this CRM lead and return recommendations:
Lead Name: {$lead->name}
Company: " . ($lead->company ?? 'N/A') . "
Stage/Status: {$lead->status}
Lead Score: {$score}/100
Days Since Last Contact: {$daysInactive} days
Notes: " . ($lead->notes ?? 'None') . "

Please respond in JSON with keys:
'summary': short 1-sentence assessment of deal momentum,
'risk_level': 'Low' or 'Medium' or 'High',
'recommended_action': immediate specific next step for the sales rep,
'suggested_channel': 'WhatsApp' or 'Phone Call' or 'Email' or 'In-person Meeting',
'key_talking_points': array of 3 bullet points,
'optimal_timing': recommended time window (e.g. 'Within 4 hours', 'Tomorrow morning').";

        $response = $this->queryGeminiJson($prompt);

        if ($response && isset($response['recommended_action'])) {
            $response['powered_by'] = 'Google Gemini 1.5 Flash';
            $response['provider'] = 'gemini_api';
            return $response;
        }

        // Heuristic fallback if Gemini API is unavailable or unconfigured
        return $this->getLeadSuggestionsFallback($lead, $daysInactive, $score);
    }

    /**
     * Auto-summarize raw meeting notes into Executive Summary, Key Decisions, and Action Items.
     */
    public function summarizeMeetingNotes(string $rawNotes, ?ProjectMeeting $meeting = null): array
    {
        $meetingTitle = $meeting?->title ?? 'Project Sync';
        $projectTitle = $meeting?->project?->name ?? $meeting?->project?->title ?? 'Client Project';

        $prompt = "You are an executive Project Manager. Process these raw meeting notes for Project '{$projectTitle}' (Meeting: '{$meetingTitle}'):
Notes:
\"\"\"
{$rawNotes}
\"\"\"

Respond in JSON with keys:
'executive_summary': concise 2-sentence summary of what was discussed,
'key_decisions': array of bullet-point strings of decisions finalized,
'action_items': array of objects with keys: 'title' (action to take), 'suggested_assignee' (role/name), 'priority' ('high' or 'medium' or 'low'), 'suggested_due_days' (integer days from now).";

        $response = $this->queryGeminiJson($prompt);

        if ($response && isset($response['executive_summary'])) {
            $response['powered_by'] = 'Google Gemini 1.5 Flash';
            $response['provider'] = 'gemini_api';
            return $response;
        }

        // Heuristic fallback
        return $this->summarizeMeetingNotesFallback($rawNotes);
    }

    /**
     * Predict sprint risk level and recommend resource adjustments.
     */
    public function getSprintRiskAssessment(Sprint $sprint): array
    {
        $totalTasks = $sprint->tasks()->count();
        $completedTasks = $sprint->tasks()->where('status', 'done')->count();
        $blockedTasks = $sprint->tasks()->where('status', '!=', 'done')->get()->filter->is_blocked->count();
        $reworkTasks = $sprint->tasks()->where('rework_count', '>', 0)->count();

        $totalEstimated = $sprint->tasks()->sum('estimated_hours');
        $totalActual = $sprint->tasks()->get()->sum('actual_hours');

        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0;

        $prompt = "You are an Agile Technical Lead. Assess sprint delivery risk:
Sprint: {$sprint->name}
Goal: " . ($sprint->goal ?? 'Deliver sprint backlog') . "
Total Tasks: {$totalTasks}
Completed Tasks: {$completedTasks} ({$completionRate}%)
Blocked Tasks: {$blockedTasks}
Rework Occurrences: {$reworkTasks}
Estimated Hours: {$totalEstimated}h | Actual Hours Spent: {$totalActual}h

Respond in JSON with keys:
'risk_level': 'Low' or 'Medium' or 'Critical',
'prediction': 1-2 sentence forecast of whether sprint will complete on time,
'risk_factors': array of 2-3 specific risk reasons,
'recommendations': array of 2-3 concrete corrective actions for PM.";

        $response = $this->queryGeminiJson($prompt);

        if ($response && isset($response['risk_level'])) {
            $response['powered_by'] = 'Google Gemini 1.5 Flash';
            $response['provider'] = 'gemini_api';
            $response['metrics'] = [
                'completion_rate' => $completionRate,
                'blocked_tasks'   => $blockedTasks,
                'total_tasks'     => $totalTasks,
            ];
            return $response;
        }

        return $this->getSprintRiskFallback($sprint, $totalTasks, $completedTasks, $blockedTasks, $completionRate);
    }

    /**
     * Generate structured subtasks and time estimates from a requirement description.
     */
    public function generateTaskBreakdown(Project $project, string $requirement): array
    {
        $projectName = $project->name ?? $project->title ?? 'Platform';
        $prompt = "You are a Senior Full-Stack Engineer and Architect.
Break down this project scope requirement into 3-5 technical development tasks:
Project: {$projectName}
Requirement: \"{$requirement}\"

Respond in JSON with key:
'suggested_tasks': array of objects with keys:
- 'title': concise task title (e.g. 'Build API endpoint for...'),
- 'description': 1-sentence technical instruction,
- 'priority': 'medium' or 'high' or 'urgent',
- 'complexity': 'easy' or 'medium' or 'hard',
- 'story_points': integer (1, 2, 3, 5, 8),
- 'estimated_hours': float hours (e.g. 4.0, 8.5).";

        $response = $this->queryGeminiJson($prompt);

        if ($response && isset($response['suggested_tasks'])) {
            $response['powered_by'] = 'Google Gemini 1.5 Flash';
            $response['provider'] = 'gemini_api';
            return $response;
        }

        return $this->generateTaskBreakdownFallback($requirement);
    }

    /**
     * Send structured prompt to Google Gemini Generative Language API.
     */
    protected function queryGeminiJson(string $prompt): ?array
    {
        $aiMode = \App\Models\AppSetting::get('ai_mode', ! empty($this->apiKey) ? 'gemini_cloud' : 'built_in');
        if ($aiMode !== 'gemini_cloud') {
            return null;
        }

        $key = \App\Models\AppSetting::get('gemini_api_key', $this->apiKey);
        if (empty($key)) {
            return null;
        }

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$key}";

            $response = Http::timeout(10)->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt . "\n\nImportant: Output ONLY raw valid JSON without markdown fences (no ```json or ```)."]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature'     => 0.2,
                    'maxOutputTokens' => 1200,
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

                // Clean markdown code fence if Gemini returned it anyway
                $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($rawText));
                $parsed = json_decode($cleanJson, true);

                if (is_array($parsed)) {
                    return $parsed;
                }
            } else {
                Log::warning('Gemini AI API returned non-200: ' . $response->status(), [
                    'body' => $response->body()
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('Gemini AI request failed, utilizing heuristic fallback: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Heuristic fallback for Lead suggestions.
     */
    protected function getLeadSuggestionsFallback(Lead $lead, int $daysInactive, int $score): array
    {
        $status = strtolower($lead->status);
        $risk = 'Low';
        $channel = 'WhatsApp';
        $timing = 'Today within business hours';

        if ($daysInactive >= 5) {
            $risk = 'High';
            $action = "Follow-up urgently! Lead has been idle for {$daysInactive} days. Call immediately to re-engage.";
            $channel = 'Phone Call';
            $timing = 'Immediate (Within 2 hours)';
        } elseif ($status === 'proposal_sent') {
            $risk = 'Medium';
            $action = "Schedule a 15-minute walkthrough to review the sent proposal and answer commercial questions.";
            $channel = 'Phone Call';
            $timing = 'Tomorrow morning (10:00 - 12:00)';
        } elseif ($status === 'negotiation') {
            $risk = 'Low';
            $action = "Share milestone payment structure or scope adjustment to close negotiation.";
            $channel = 'WhatsApp';
            $timing = 'Today afternoon';
        } else {
            $action = "Send updated product capability deck and confirm their current implementation timeline.";
        }

        return [
            'summary'             => "Lead is in '{$lead->status}' stage with a score of {$score}/100 and {$daysInactive} days since last activity.",
            'risk_level'          => $risk,
            'recommended_action'  => $action,
            'suggested_channel'   => $channel,
            'key_talking_points'  => [
                "Reiterate core ROI and time saved for {$lead->name}'s team.",
                "Offer a structured milestone kickoff within 5 business days.",
                "Address any pricing or scope questions transparently.",
            ],
            'optimal_timing'      => $timing,
            'powered_by'          => 'Smart Analytical Heuristic (Gemini Ready)',
            'provider'            => 'heuristic_fallback',
        ];
    }

    /**
     * Heuristic fallback for MoM meeting notes.
     */
    protected function summarizeMeetingNotesFallback(string $rawNotes): array
    {
        $lines = array_filter(array_map('trim', explode("\n", $rawNotes)));
        $decisions = [];
        $actionItems = [];

        foreach ($lines as $line) {
            if (empty($line)) continue;
            if (preg_match('/^(decided|agreed|approval|approved|decision)/i', $line)) {
                $decisions[] = $line;
            } elseif (preg_match('/^(todo|action|assign|will do|followup|follow-up)/i', $line)) {
                $actionItems[] = [
                    'title'              => $line,
                    'suggested_assignee' => 'PM / Developer',
                    'priority'           => 'high',
                    'suggested_due_days' => 2,
                ];
            }
        }

        if (empty($decisions)) {
            $decisions = [
                'Approved current sprint milestones and agreed on upcoming deliverable scope.',
                'Clarified testing timeline and staging environment access credentials.',
            ];
        }

        if (empty($actionItems)) {
            $actionItems = [
                [
                    'title'              => 'Update task board with discussed specifications',
                    'suggested_assignee' => 'PM',
                    'priority'           => 'high',
                    'suggested_due_days' => 1,
                ],
                [
                    'title'              => 'Share staging deployment link with client for review',
                    'suggested_assignee' => 'Developer',
                    'priority'           => 'medium',
                    'suggested_due_days' => 2,
                ],
            ];
        }

        return [
            'executive_summary' => 'Meeting covered key milestones, architectural alignment, and delivery deadlines. Outstanding action items have been prioritized for immediate execution.',
            'key_decisions'     => $decisions,
            'action_items'      => $actionItems,
            'powered_by'        => 'SalesCRM Smart AI (Built-in Heuristic)',
            'provider'          => 'heuristic_fallback',
        ];
    }

    /**
     * Heuristic fallback for Sprint risk.
     */
    protected function getSprintRiskFallback(Sprint $sprint, int $total, int $completed, int $blocked, float $rate): array
    {
        $risk = 'Low';
        $forecast = "Sprint is progressing on track with {$rate}% tasks completed.";
        $reasons = [];
        $recommendations = [];

        if ($blocked > 0) {
            $risk = 'High';
            $reasons[] = "{$blocked} task(s) currently blocked by dependencies or pending reviews.";
            $recommendations[] = "Unblock highest-priority dependencies and reassign developers.";
        }

        if ($rate < 40 && $total > 3) {
            $risk = 'Critical';
            $reasons[] = "Completion rate ({$rate}%) is lagging behind schedule.";
            $recommendations[] = "Consider deselecting non-critical backlog items from the current sprint.";
        }

        if (empty($reasons)) {
            $reasons[] = "Healthy task flow with low rework count.";
            $recommendations[] = "Maintain daily standup velocity and initiate QA on completed tasks.";
        }

        return [
            'risk_level'      => $risk,
            'prediction'      => $forecast,
            'risk_factors'    => $reasons,
            'recommendations' => $recommendations,
            'metrics'         => [
                'completion_rate' => $rate,
                'blocked_tasks'   => $blocked,
                'total_tasks'     => $total,
            ],
            'powered_by'      => 'SalesCRM Smart AI (Built-in Heuristic)',
            'provider'        => 'heuristic_fallback',
        ];
    }

    /**
     * Heuristic fallback for Task breakdown.
     */
    protected function generateTaskBreakdownFallback(string $requirement): array
    {
        $cleanTitle = trim(preg_replace('/^(implement|build|create|add|develop)\s+/i', '', $requirement));
        $cleanTitle = \Illuminate\Support\Str::limit($cleanTitle, 55);

        return [
            'suggested_tasks' => [
                [
                    'title'           => "Architecture & Database Schema for {$cleanTitle}",
                    'description'     => 'Define migrations, indexes, and Eloquent model contracts.',
                    'priority'        => 'high',
                    'complexity'      => 'medium',
                    'story_points'    => 3,
                    'estimated_hours' => 4.0,
                ],
                [
                    'title'           => "API Controller & Business Logic for {$cleanTitle}",
                    'description'     => 'Build validated REST API endpoints with standardized envelope responses.',
                    'priority'        => 'high',
                    'complexity'      => 'medium',
                    'story_points'    => 5,
                    'estimated_hours' => 6.0,
                ],
                [
                    'title'           => "Frontend UI & Component Implementation for {$cleanTitle}",
                    'description'     => 'Develop React 19 interactive interfaces, state management, and alerts.',
                    'priority'        => 'medium',
                    'complexity'      => 'medium',
                    'story_points'    => 5,
                    'estimated_hours' => 6.5,
                ],
                [
                    'title'           => "End-to-End Verification & Automated Tests",
                    'description'     => 'Write feature tests covering success cases, validations, and edge errors.',
                    'priority'        => 'medium',
                    'complexity'      => 'easy',
                    'story_points'    => 2,
                    'estimated_hours' => 3.0,
                ],
            ],
            'powered_by'      => 'SalesCRM Smart AI (Built-in Heuristic)',
            'provider'        => 'heuristic_fallback',
        ];
    }
}
