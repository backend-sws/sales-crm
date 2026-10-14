<?php

namespace App\Services;

use App\Contracts\Services\ClientConversionServiceInterface;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientBranding;
use App\Models\ClientHealthScore;
use App\Models\ClientService;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClientConversionService implements ClientConversionServiceInterface
{
    /**
     * Convert a won sales lead into a full client account with services and login access.
     */
    public function convertLead(Lead $lead, array $payload): Client
    {
        return DB::transaction(function () use ($lead, $payload) {
            // 1. Create Client Record
            $company = $payload['company'] ?? $lead->company ?? $lead->name;
            $email = $payload['email'] ?? $lead->email;
            $name = $payload['name'] ?? $lead->name;
            $phone = $payload['phone'] ?? $lead->phone;

            $client = Client::create([
                'name'                 => $name,
                'company'              => $company,
                'email'                => $email,
                'phone'                => $phone,
                'gst_number'           => $payload['gst_number'] ?? null,
                'billing_address'      => $payload['billing_address'] ?? null,
                'billing_state'        => $payload['billing_state'] ?? 'Maharashtra',
                'source_lead_id'       => $lead->id,
                'account_manager_id'   => $payload['account_manager_id'] ?? $lead->assigned_to,
                'onboarding_completed' => false,
                'onboarding_steps'     => [
                    ['key' => 'complete_profile', 'label' => 'Complete Billing & Tax Info', 'completed' => ! empty($payload['gst_number'])],
                    ['key' => 'review_services',  'label' => 'Review Active Services',       'completed' => false],
                    ['key' => 'submit_ticket',    'label' => 'Submit First Request',         'completed' => false],
                    ['key' => 'welcome_doc',      'label' => 'Review Welcome Document',      'completed' => false],
                ],
                'status'               => 'active',
            ]);

            // 2. Mark Lead as Won & link converted client ID
            $lead->status = 'won';
            $lead->converted_client_id = $client->id;
            $lead->save();

            // 3. Initialize White-label Branding
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

            // 4. Initialize Health Score
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

            // 5. Create Subscribed Services
            $services = $payload['services'] ?? [];
            if (empty($services)) {
                // Default service created based on lead budget/track
                $services = [[
                    'service_name'  => $payload['service_name'] ?? 'Retainer & Service Track',
                    'service_type'  => $payload['service_type'] ?? 'recurring',
                    'billing_cycle' => $payload['billing_cycle'] ?? 'monthly',
                    'value'         => $lead->budget > 0 ? $lead->budget : ($lead->value > 0 ? $lead->value : 25000),
                    'start_date'    => now()->toDateString(),
                ]];
            }

            foreach ($services as $svc) {
                $startDate = $svc['start_date'] ?? now()->toDateString();
                $billingCycle = $svc['billing_cycle'] ?? 'monthly';
                $nextInvoiceDate = $billingCycle === 'yearly'
                    ? now()->parse($startDate)->addYear()
                    : ($billingCycle === 'quarterly' ? now()->parse($startDate)->addMonths(3) : now()->parse($startDate)->addMonth());

                ClientService::create([
                    'client_id'         => $client->id,
                    'product_id'        => $svc['product_id'] ?? null,
                    'service_name'      => $svc['service_name'] ?? 'Managed CRM & Service Track',
                    'service_type'      => $svc['service_type'] ?? 'recurring',
                    'status'            => 'active',
                    'start_date'        => $startDate,
                    'billing_cycle'     => $billingCycle,
                    'value'             => $svc['value'] ?? ($lead->value > 0 ? $lead->value : 0),
                    'next_invoice_date' => $nextInvoiceDate->toDateString(),
                    'notes'             => $svc['notes'] ?? 'Auto-generated from Won Lead conversion',
                ]);
            }

            // 6. Create Client User Portal Account
            $createClientUser = $payload['create_user'] ?? true;
            if ($createClientUser) {
                $user = User::where('email', $email)->first();
                if (! $user) {
                    $user = User::create([
                        'name'      => $name,
                        'email'     => $email,
                        'phone'     => $phone,
                        'password'  => Hash::make($payload['password'] ?? 'client123'),
                        'client_id' => $client->id,
                        'is_active' => true,
                    ]);
                    $user->assignRole('client');
                } else {
                    $user->update(['client_id' => $client->id]);
                    if (! $user->hasRole('client')) {
                        $user->assignRole('client');
                    }
                }
            }

            // 7. Immutable Audit Trail & Lead Timeline History
            ActivityLog::create([
                'log_name'     => 'clients',
                'description'  => "Converted Won Lead #{$lead->id} ({$lead->name}) into Client Account #{$client->id} ({$client->company})",
                'subject_type' => Client::class,
                'subject_id'   => $client->id,
                'causer_type'  => User::class,
                'causer_id'    => auth()->id() ?? $lead->assigned_to,
                'properties'   => [
                    'lead_id'   => $lead->id,
                    'client_id' => $client->id,
                    'company'   => $client->company,
                ],
                'created_at'   => now(),
            ]);

            LeadActivity::create([
                'lead_id'     => $lead->id,
                'user_id'     => auth()->id() ?? $lead->assigned_to,
                'type'        => 'status_change',
                'description' => "Lead won & converted into Client Account #{$client->id} ({$client->company})",
            ]);

            return $client->load(['branding', 'services', 'healthScore', 'users']);
        });
    }
}
