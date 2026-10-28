<?php

namespace App\Contracts\Services;

use App\Models\Lead;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\Sprint;

interface AiAssistantServiceInterface
{
    /**
     * Generate sales strategy suggestions and recommended actions for a lead.
     *
     * @param Lead $lead
     * @return array
     */
    public function getLeadSuggestions(Lead $lead): array;

    /**
     * Auto-summarize raw meeting notes into Executive Summary, Key Decisions, and Action Items.
     *
     * @param string $rawNotes
     * @param ProjectMeeting|null $meeting
     * @return array
     */
    public function summarizeMeetingNotes(string $rawNotes, ?ProjectMeeting $meeting = null): array;

    /**
     * Predict sprint risk level and recommend resource adjustments.
     *
     * @param Sprint $sprint
     * @return array
     */
    public function getSprintRiskAssessment(Sprint $sprint): array;

    /**
     * Generate structured subtasks and time estimates from a requirement description.
     *
     * @param Project $project
     * @param string $requirement
     * @return array
     */
    public function generateTaskBreakdown(Project $project, string $requirement): array;
}
