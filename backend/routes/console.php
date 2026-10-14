<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

// Hourly: check missed follow-ups, escalate to Sales Manager if > 24h
Schedule::command('followups:check-overdue')->hourly();

// 9:00 AM: Daily digest via WhatsApp / Email to all agents
Schedule::command('followups:send-daily-digest')->dailyAt('09:00');

// 00:30: Flag stale leads (no contact in 7 days)
Schedule::command('leads:flag-stale')->dailyAt('00:30');

// 01:00: Nightly recalculate all lead scores
Schedule::command('leads:recalculate-scores')->dailyAt('01:00');

// Monday 09:00 AM: Weekly sales digest for sales managers & admins
Schedule::command('reports:send-weekly-digest')->weeklyOn(1, '09:00');

// 1st of month 08:00 AM: Monthly executive telemetry briefing for super admins
Schedule::command('reports:send-monthly-executive')->monthlyOn(1, '08:00');

// 07:00 AM Daily: Generate retainer invoices due within 7 days
Schedule::command('billing:generate-retainer-invoices')->dailyAt('07:00');

// 02:00 AM Daily: Recalculate all client health scores
Schedule::command('clients:recalculate-health')->dailyAt('02:00');

// Monday 09:30 AM: Alert admins and managers on at-risk clients
Schedule::command('clients:send-at-risk-report')->weeklyOn(1, '09:30');

