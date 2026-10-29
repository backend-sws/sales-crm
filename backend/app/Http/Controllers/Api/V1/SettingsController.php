<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Settings & Integrations", description: "Manage dynamic API keys (Google Gemini, GitHub Webhooks, etc.)")]
class SettingsController extends BaseApiController
{
    #[OA\Get(
        path: "/api/v1/settings/integrations",
        summary: "Get integration settings & status (Gemini AI, GitHub)",
        security: [["bearerAuth" => []]],
        tags: ["Settings & Integrations"]
    )]
    public function index(): JsonResponse
    {
        $geminiKey = AppSetting::get('gemini_api_key', env('GEMINI_API_KEY'));
        $geminiModel = AppSetting::get('gemini_model', 'gemini-1.5-flash');
        $aiMode = AppSetting::get('ai_mode', ! empty($geminiKey) ? 'gemini_cloud' : 'built_in');
        $githubOrg = AppSetting::get('github_default_org', '');
        $githubSecret = AppSetting::get('github_webhook_secret', '');

        $maskedKey = $geminiKey ? substr($geminiKey, 0, 6) . '...' . substr($geminiKey, -4) : null;

        return $this->successResponse([
            'gemini' => [
                'is_configured' => true, // Built-in Smart AI engine is always ready out of the box
                'has_cloud_key' => ! empty($geminiKey),
                'ai_mode'       => $aiMode,
                'masked_key'    => $maskedKey,
                'model'         => $geminiModel,
            ],
            'github' => [
                'is_configured'     => ! empty($githubOrg) || ! empty($githubSecret),
                'default_org'       => $githubOrg,
                'has_secret'        => ! empty($githubSecret),
                'webhook_url'       => url('/api/v1/webhooks/github'),
            ],
        ], 'Integrations settings retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/settings/integrations",
        summary: "Update third-party integration settings",
        security: [["bearerAuth" => []]],
        tags: ["Settings & Integrations"]
    )]
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ai_mode'               => 'nullable|string|in:built_in,gemini_cloud',
            'gemini_api_key'        => 'nullable|string|max:255',
            'gemini_model'          => 'nullable|string|max:100',
            'github_default_org'    => 'nullable|string|max:100',
            'github_webhook_secret' => 'nullable|string|max:255',
        ]);

        if (array_key_exists('ai_mode', $validated) && ! empty($validated['ai_mode'])) {
            AppSetting::set('ai_mode', $validated['ai_mode'], 'ai', false);
        }

        if (array_key_exists('gemini_api_key', $validated)) {
            $keyVal = trim((string) $validated['gemini_api_key']);
            AppSetting::set('gemini_api_key', $keyVal, 'ai', true);
            if ($keyVal !== '') {
                AppSetting::set('ai_mode', 'gemini_cloud', 'ai', false);
            }
        }

        if (isset($validated['gemini_model']) && trim($validated['gemini_model']) !== '') {
            AppSetting::set('gemini_model', trim($validated['gemini_model']), 'ai', false);
        }

        if (isset($validated['github_default_org'])) {
            AppSetting::set('github_default_org', trim($validated['github_default_org']), 'github', false);
        }

        if (isset($validated['github_webhook_secret']) && trim($validated['github_webhook_secret']) !== '') {
            AppSetting::set('github_webhook_secret', trim($validated['github_webhook_secret']), 'github', true);
        }

        $aiMode = AppSetting::get('ai_mode', 'built_in');
        $testResult = null;

        if ($aiMode === 'gemini_cloud') {
            $testKey = AppSetting::get('gemini_api_key', env('GEMINI_API_KEY'));
            $model = AppSetting::get('gemini_model', 'gemini-1.5-flash');
            if (! empty($testKey)) {
                try {
                    $testUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$testKey}";
                    $testRes = Http::timeout(5)->post($testUrl, [
                        'contents' => [
                            ['parts' => [['text' => 'Ping']]]
                        ]
                    ]);
                    $testResult = $testRes->successful() ? 'connected' : 'invalid_key';
                } catch (\Throwable $e) {
                    $testResult = 'connection_error';
                }
            } else {
                $testResult = 'missing_key';
            }
        } else {
            $testResult = 'built_in_active';
        }

        return $this->successResponse([
            'test_status' => $testResult,
            'ai_mode'     => $aiMode,
        ], 'Integrations settings saved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/settings/banking",
        summary: "Get company banking & remittance details for invoices",
        security: [["bearerAuth" => []]],
        tags: ["Settings & Integrations"]
    )]
    public function getBanking(): JsonResponse
    {
        $bankName = AppSetting::get('bank_name', '');
        $bankBranch = AppSetting::get('bank_branch', '');
        $bankAccountName = AppSetting::get('bank_account_name', '');
        $bankAccountNo = AppSetting::get('bank_account_no', '');
        $bankIfsc = AppSetting::get('bank_ifsc', '');
        $bankUpiId = AppSetting::get('bank_upi_id', '');
        $paymentNotes = AppSetting::get('payment_notes', '');

        $isConfigured = !empty($bankName) || !empty($bankAccountNo) || !empty($bankIfsc) || !empty($bankUpiId);

        return $this->successResponse([
            'bank_name'         => $bankName,
            'bank_branch'       => $bankBranch,
            'bank_account_name' => $bankAccountName,
            'bank_account_no'   => $bankAccountNo,
            'bank_ifsc'         => $bankIfsc,
            'bank_upi_id'       => $bankUpiId,
            'payment_notes'     => $paymentNotes,
            'is_configured'     => $isConfigured,
        ], 'Banking settings retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/settings/banking",
        summary: "Update company banking & remittance details for invoices",
        security: [["bearerAuth" => []]],
        tags: ["Settings & Integrations"]
    )]
    public function updateBanking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bank_name'         => 'nullable|string|max:150',
            'bank_branch'       => 'nullable|string|max:150',
            'bank_account_name' => 'nullable|string|max:150',
            'bank_account_no'   => 'nullable|string|max:50',
            'bank_ifsc'         => 'nullable|string|max:30',
            'bank_upi_id'       => 'nullable|string|max:100',
            'payment_notes'     => 'nullable|string|max:500',
        ]);

        foreach (['bank_name', 'bank_branch', 'bank_account_name', 'bank_account_no', 'bank_ifsc', 'bank_upi_id', 'payment_notes'] as $field) {
            if (array_key_exists($field, $validated)) {
                AppSetting::set($field, trim((string) ($validated[$field] ?? '')), 'banking', false);
            }
        }

        return $this->getBanking();
    }
}
