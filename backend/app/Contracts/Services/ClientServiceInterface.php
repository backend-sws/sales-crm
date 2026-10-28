<?php

namespace App\Contracts\Services;

use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ClientServiceInterface
{
    /**
     * Get paginated clients with optional search, health filter, and relations.
     */
    public function getPaginatedClients(array $filters = [], int $perPage = 15): LengthAwarePaginator;

    /**
     * Get client profile with services, tickets, invoices, and sales pre-sales history.
     */
    public function getClientProfile(int $clientId): Client;

    /**
     * Directly onboard and create a new client account.
     */
    public function createClient(array $data): Client;

    /**
     * Update client details.
     */
    public function updateClient(int $clientId, array $data): Client;

    /**
     * Update white-label portal branding.
     */
    public function updateBranding(int $clientId, array $brandingData): array;

    /**
     * Get onboarding checklist progress.
     */
    public function getOnboardingProgress(int $clientId): array;

    /**
     * Update/complete an onboarding step.
     */
    public function updateOnboardingStep(int $clientId, string $stepKey, bool $completed): array;
}
