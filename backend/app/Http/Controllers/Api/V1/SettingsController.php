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
        $githubOrg = AppSetting::get('github_default_org', '');
        $githubSecret = AppSetting::get('github_webhook_secret', '');

        $maskedKey = $geminiKey ? substr($geminiKey, 0, 6) . '...' . substr($geminiKey, -4) : null;

        return $this->successResponse([
            'gemini' => [
                'is_configured' => ! empty($geminiKey),
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
            'gemini_api_key'        => 'nullable|string|max:255',
            'gemini_model'          => 'nullable|string|max:100',
            'github_default_org'    => 'nullable|string|max:100',
            'github_webhook_secret' => 'nullable|string|max:255',
        ]);

        if (isset($validated['gemini_api_key']) && trim($validated['gemini_api_key']) !== '') {
            AppSetting::set('gemini_api_key', trim($validated['gemini_api_key']), 'ai', true);
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

        // Test Gemini key if provided
        $testResult = null;
        $testKey = AppSetting::get('gemini_api_key', env('GEMINI_API_KEY'));
        if (! empty($testKey)) {
            try {
                $testUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$testKey}";
                $testRes = Http::timeout(5)->post($testUrl, [
                    'contents' => [
                        ['parts' => [['text' => 'Ping']]]
                    ]
                ]);
                $testResult = $testRes->successful() ? 'connected' : 'invalid_key';
            } catch (\Throwable $e) {
                $testResult = 'connection_error';
            }
        }

        return $this->successResponse([
            'test_status' => $testResult,
        ], 'Integrations settings saved successfully.');
    }
}
