<?php

namespace App\Services;

use App\Contracts\Services\ClientServiceInterface;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientBranding;
use App\Models\ClientHealthScore;
use App\Models\ClientService as ClientServiceModel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'invoices' => fn ($q) => $q->with(['client', 'service'])->latest()->limit(20),
            'accountManager:id,name,email,phone',
            'users:id,name,email,phone,client_id',
            'sourceLead.activities' => fn ($q) => $q->latest()->limit(15),
            'sourceLead.followUps'  => fn ($q) => $q->latest()->limit(10),
            'projects' => function ($q) {
                $q->with([
                    'projectManager:id,name,email,avatar',
                    'sprints' => fn($sq) => $sq->where('status', 'active')->limit(1),
                    'milestones' => fn($mq) => $mq->orderBy('due_date')->limit(10),
                    'meetings' => fn($meq) => $meq->with(['creator:id,name', 'actionItems.assignee:id,name'])->orderBy('scheduled_at', 'desc')->limit(10),
                    'githubRepo',
                    'channels' => fn($cq) => $cq->where('is_internal', false)->withCount('messages'),
                ])->withCount([
                    'tasks',
                    'tasks as completed_tasks_count' => fn($tq) => $tq->where('status', 'done'),
                    'tasks as review_tasks_count' => fn($rq) => $rq->where('status', 'in_review'),
                ]);
            },
        ])->findOrFail($clientId);
    }

    /**
     * Directly onboard and create a new client account.
     */
    public function createClient(array $payload): Client
    {
        return DB::transaction(function () use ($payload) {
            $company = !empty($payload['company']) ? $payload['company'] : $payload['name'];
            $email = $payload['email'];
            $name = $payload['name'];
            $phone = $payload['phone'] ?? null;

            $client = Client::create([
                'name'                 => $name,
                'company'              => $company,
                'email'                => $email,
                'phone'                => $phone,
                'gst_number'           => $payload['gst_number'] ?? null,
                'billing_address'      => $payload['billing_address'] ?? null,
                'billing_state'        => $payload['billing_state'] ?? 'Maharashtra',
                'source_lead_id'       => null,
                'account_manager_id'   => $payload['account_manager_id'] ?? auth()->id(),
                'onboarding_completed' => false,
                'onboarding_steps'     => [
                    ['key' => 'complete_profile', 'label' => 'Complete Billing & Tax Info', 'completed' => !empty($payload['gst_number'])],
                    ['key' => 'review_services',  'label' => 'Review Active Services',       'completed' => false],
                    ['key' => 'submit_ticket',    'label' => 'Submit First Request',         'completed' => false],
                    ['key' => 'welcome_doc',      'label' => 'Review Welcome Document',      'completed' => false],
                ],
                'status'               => $payload['status'] ?? 'active',
            ]);

            // Initialize White-label Branding
            $baseSlug = Str::slug($company ?: $name);
            $subdomain = $baseSlug . '-' . $client->id;

            ClientBranding::create([
                'client_id'            => $client->id,
                'primary_color'        => $payload['primary_color'] ?? '#1E40AF',
                'subdomain'            => $subdomain,
                'hide_vendor_branding' => true,
                'enabled_features'     => [
                    'tickets'   => true,
                    'reports'   => true,
                    'invoices'  => true,
                    'documents' => true,
                ],
            ]);

            // Initialize Health Score
            ClientHealthScore::create([
                'client_id'        => $client->id,
                'score'            => 100.00,
                'ticket_score'     => 100.00,
                'payment_score'    => 100.00,
                'engagement_score' => 100.00,
                'feedback_score'   => 100.00,
                'response_score'   => 100.00,
                'status'           => 'healthy',
                'calculated_at'    => now(),
            ]);

            // Create Subscribed Service track if provided
            $serviceName = !empty($payload['service_name']) ? $payload['service_name'] : 'Retainer & Service Track';
            $serviceValue = isset($payload['service_value']) ? (float) $payload['service_value'] : 25000;
            $billingCycle = $payload['billing_cycle'] ?? 'monthly';
            $startDate = $payload['start_date'] ?? now()->toDateString();
            $nextInvoiceDate = $billingCycle === 'yearly'
                ? now()->parse($startDate)->addYear()
                : ($billingCycle === 'quarterly' ? now()->parse($startDate)->addMonths(3) : now()->parse($startDate)->addMonth());

            ClientServiceModel::create([
                'client_id'         => $client->id,
                'service_name'      => $serviceName,
                'service_type'      => $payload['service_type'] ?? 'recurring',
                'status'            => 'active',
                'start_date'        => $startDate,
                'billing_cycle'     => $billingCycle,
                'value'             => $serviceValue,
                'next_invoice_date' => $nextInvoiceDate->toDateString(),
                'notes'             => $payload['service_notes'] ?? 'Direct client onboarded via CRM',
            ]);

            // Create Client User Portal Account if requested
            if (!empty($payload['create_user'])) {
                $user = User::where('email', $email)->first();
                if (!$user) {
                    $user = User::create([
                        'name'      => $name,
                        'email'     => $email,
                        'phone'     => $phone,
                        'password'  => Hash::make($payload['password'] ?? 'Client@123'),
                        'client_id' => $client->id,
                        'is_active' => true,
                    ]);
                    $user->assignRole('client');
                } else {
                    $user->update(['client_id' => $client->id]);
                    if (!$user->hasRole('client')) {
                        $user->assignRole('client');
                    }
                }
            }

            // Immutable Audit Trail
            ActivityLog::create([
                'log_name'     => 'clients',
                'description'  => "Directly onboarded Client Account #{$client->id} ({$client->company})",
                'subject_type' => Client::class,
                'subject_id'   => $client->id,
                'causer_type'  => User::class,
                'causer_id'    => auth()->id(),
                'properties'   => [
                    'client_id' => $client->id,
                    'company'   => $client->company,
                ],
                'created_at'   => now(),
            ]);

            return $client->fresh(['healthScore', 'branding', 'services', 'accountManager']);
        });
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
