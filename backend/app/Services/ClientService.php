<?php

namespace App\Services;

use App\Contracts\Services\ClientServiceInterface;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientBranding;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClientService implements ClientServiceInterface
{
    /**
     * Get paginated clients with optional search, health filter, and relations.
     */
    public function getPaginatedClients(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Client::with(['healthScore', 'services', 'accountManager', 'branding'])
            ->latest();

        if (! empty($filters['search'])) {
            $q = $filters['search'];
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('company', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['health_status'])) {
            $query->whereHas('healthScore', function ($sub) use ($filters) {
                $sub->where('status', $filters['health_status']);
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get client profile with services, tickets, invoices, and sales pre-sales history.
     */
    public function getClientProfile(int $clientId): Client
    {
        return Client::with([
            'branding',
            'services.requests',
            'services.reports',
            'documents',
            'healthScore',
            'invoices' => fn ($q) => $q->latest()->limit(10),
            'accountManager:id,name,email,phone',
            'users:id,name,email,phone,client_id',
            'sourceLead.activities' => fn ($q) => $q->latest()->limit(15),
            'sourceLead.followUps'  => fn ($q) => $q->latest()->limit(10),
        ])->findOrFail($clientId);
    }

    /**
     * Update client details.
     */
    public function updateClient(int $clientId, array $data): Client
    {
        $client = Client::findOrFail($clientId);
        $client->update($data);

        ActivityLog::create([
            'log_name'     => 'clients',
            'description'  => "Updated client profile #{$client->id} ({$client->name})",
            'subject_type' => Client::class,
            'subject_id'   => $client->id,
            'causer_type'  => User::class,
            'causer_id'    => auth()->id(),
            'created_at'   => now(),
        ]);

        return $client->fresh(['healthScore', 'branding', 'services']);
    }

    /**
     * Update white-label portal branding.
     */
    public function updateBranding(int $clientId, array $brandingData): array
    {
        $branding = ClientBranding::firstOrCreate(
            ['client_id' => $clientId],
            ['primary_color' => '#1E40AF', 'hide_vendor_branding' => true]
        );

        $branding->update($brandingData);

        return $branding->toArray();
    }

    /**
     * Get onboarding checklist progress.
     */
    public function getOnboardingProgress(int $clientId): array
    {
        $client = Client::findOrFail($clientId);
        $steps = $client->onboarding_steps ?? [];

        $total = count($steps);
        $completed = count(array_filter($steps, fn ($s) => ! empty($s['completed'])));
        $percentage = $total > 0 ? round(($completed / $total) * 100) : 100;

        return [
            'client_id'   => $client->id,
            'completed'   => (bool) $client->onboarding_completed,
            'percentage'  => $percentage,
            'total_steps' => $total,
            'steps'       => $steps,
        ];
    }

    /**
     * Update/complete an onboarding step.
     */
    public function updateOnboardingStep(int $clientId, string $stepKey, bool $completed): array
    {
        $client = Client::findOrFail($clientId);
        $steps = $client->onboarding_steps ?? [];

        $updatedSteps = array_map(function ($s) use ($stepKey, $completed) {
            if ($s['key'] === $stepKey) {
                $s['completed'] = $completed;
            }
            return $s;
        }, $steps);

        $total = count($updatedSteps);
        $completedCount = count(array_filter($updatedSteps, fn ($s) => ! empty($s['completed'])));
        $isFinished = ($total > 0 && $completedCount === $total);

        $client->update([
            'onboarding_steps'     => $updatedSteps,
            'onboarding_completed' => $isFinished,
        ]);

        return [
            'client_id'   => $client->id,
            'completed'   => $isFinished,
            'percentage'  => $total > 0 ? round(($completedCount / $total) * 100) : 100,
            'steps'       => $updatedSteps,
        ];
    }
}
