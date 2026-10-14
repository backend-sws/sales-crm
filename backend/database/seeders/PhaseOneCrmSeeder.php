<?php

namespace Database\Seeders;

use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadSource;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class PhaseOneCrmSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Lead Sources
        $sourceNames = [
            "Meta Ads", "Google Ads", "Referral", "Website Form",
            "Cold Outreach", "LinkedIn", "Email Inbound",
            "Trade Expo", "YouTube Ads", "Instagram DM",
        ];
        $sources = [];
        foreach ($sourceNames as $sName) {
            $sources[$sName] = LeadSource::firstOrCreate(["name" => $sName], ["is_active" => true]);
        }

        // 2. Products
        $productsData = [
            ["name" => "Custom ERP & Software",           "type" => "software", "price_range" => "1,50,000-5,00,000"],
            ["name" => "Mobile CRM SaaS License",         "type" => "software", "price_range" => "45,000-1,20,000/yr"],
            ["name" => "Google Ads Performance Marketing","type" => "service",  "price_range" => "30,000-80,000/mo"],
            ["name" => "SEO & Content Growth Engine",     "type" => "service",  "price_range" => "25,000-60,000/mo"],
            ["name" => "Cloud Infrastructure & DevOps",   "type" => "service",  "price_range" => "50,000-1,50,000/mo"],
            ["name" => "WhatsApp Automation Suite",       "type" => "software", "price_range" => "20,000-60,000/mo"],
        ];
        $products = [];
        foreach ($productsData as $pData) {
            $products[$pData["name"]] = Product::firstOrCreate(["name" => $pData["name"]], $pData);
        }

        // 3. Users
        $admin   = User::where("email", "admin@salescrm.com")->first();
        $agent   = User::where("email", "agent@salescrm.com")->first();
        $manager = User::where("email", "manager@salescrm.com")->first();

        $adminId   = $admin?->id;
        $agentId   = $agent?->id ?? $adminId;
        $managerId = $manager?->id ?? $adminId;

        // 4. Leads (20 leads, 4 tiers, 3 duplicate pairs)
        // PAIR A (PHONE): Rohan Bhatia & Rohan Bhatia Web => +91 98222 33445
        // PAIR B (EMAIL): Sameer Kapoor & Sameer K.     => sameer@kapoortextiles.com
        // PAIR C (COMPANY): Kavita Deshmukh #1 & #2    => Deshmukh Resort Chains
        $leadsData = [

            // HOT TIER 80-100
            [
                "name" => "Rajesh Goel", "email" => "rajesh@goelinfra.com",
                "phone" => "+91 98777 88990", "company" => "Goel Infrastructure Pvt Ltd",
                "city" => "Hyderabad", "source" => "Referral", "source_id" => $sources["Referral"]->id,
                "priority" => "hot", "status" => "won", "score" => 100,
                "budget" => 500000.00, "value" => 500000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(1),
                "notes" => "Contract signed. 50% advance received. Converted to active client.",
                "product_names" => ["Custom ERP & Software", "Cloud Infrastructure & DevOps"],
                "followups" => [
                    ["type" => "call",     "status" => "done", "daysAgo" => 14, "outcome" => "Discovery call. Invited for demo."],
                    ["type" => "meeting",  "status" => "done", "daysAgo" => 10, "outcome" => "Full demo. VP loved the proposal."],
                    ["type" => "whatsapp", "status" => "done", "daysAgo" => 6,  "outcome" => "Sent final commercial. Awaiting sign-off."],
                    ["type" => "call",     "status" => "done", "daysAgo" => 3,  "outcome" => "Contract signed!"],
                ],
            ],
            [
                "name" => "Tanvi Kulkarni", "email" => "tanvi@kulkarnifinance.in",
                "phone" => "+91 98666 77889", "company" => "Kulkarni Wealth Advisory",
                "city" => "Mumbai", "source" => "LinkedIn", "source_id" => $sources["LinkedIn"]->id,
                "priority" => "hot", "status" => "negotiation", "score" => 90,
                "budget" => 420000.00, "value" => 420000.00,
                "assigned_to" => $managerId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(1),
                "notes" => "Final commercial discussion ongoing. Payment terms being finalized. Likely to close this week.",
                "product_names" => ["Custom ERP & Software", "SEO & Content Growth Engine"],
                "followups" => [
                    ["type" => "call",    "status" => "done",    "daysAgo" => 20, "outcome" => "Great intro call. Asked for proposal."],
                    ["type" => "meeting", "status" => "done",    "daysAgo" => 14, "outcome" => "Demo with CFO. Green light given."],
                    ["type" => "email",   "status" => "done",    "daysAgo" => 7,  "outcome" => "Proposal and commercial sent."],
                    ["type" => "call",    "status" => "pending", "daysAgo" => -1, "outcome" => null],
                ],
            ],
            [
                "name" => "Kavita Deshmukh", "email" => "kavita@deshmukhhospitality.com",
                "phone" => "+91 98444 55667", "company" => "Deshmukh Resort Chains",
                "city" => "Pune", "source" => "Referral", "source_id" => $sources["Referral"]->id,
                "priority" => "hot", "status" => "demo_meeting", "score" => 85,
                "budget" => 350000.00, "value" => 350000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(12),
                "notes" => "Demo to VP of Operations done. Positive feedback. Proposal to be sent tomorrow.",
                "product_names" => ["Custom ERP & Software", "Google Ads Performance Marketing"],
                "followups" => [
                    ["type" => "call",    "status" => "done",    "daysAgo" => 10, "outcome" => "Intro call. Runs 8 resort properties."],
                    ["type" => "meeting", "status" => "done",    "daysAgo" => 5,  "outcome" => "Full demo done. VP asked for pricing."],
                    ["type" => "call",    "status" => "pending", "daysAgo" => -2, "outcome" => null],
                ],
            ],

            // PAIR A — DUPLICATE PHONE: +91 98222 33445
            [
                "name" => "Rohan Bhatia", "email" => "rohan@bhatiapharmacy.in",
                "phone" => "+91 98222 33445", "company" => "Bhatia Medico Supplies",
                "city" => "Delhi NCR", "source" => "Google Ads", "source_id" => $sources["Google Ads"]->id,
                "priority" => "hot", "status" => "proposal", "score" => 80,
                "budget" => 230000.00, "value" => 230000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(6),
                "notes" => "Quotation sent for enterprise plan. Waiting for board approval.",
                "product_names" => ["Mobile CRM SaaS License", "WhatsApp Automation Suite"],
                "followups" => [
                    ["type" => "call",     "status" => "done",    "daysAgo" => 12, "outcome" => "20 min call. Very interested in SaaS."],
                    ["type" => "whatsapp", "status" => "done",    "daysAgo" => 8,  "outcome" => "Sent product overview and pricing sheet."],
                    ["type" => "call",     "status" => "done",    "daysAgo" => 4,  "outcome" => "Proposal discussed. Sent for board approval."],
                    ["type" => "email",    "status" => "pending", "daysAgo" => -3, "outcome" => null],
                ],
            ],
            // DUPLICATE of Rohan Bhatia (same phone, different channel)
            [
                "name" => "Rohan Bhatia (Web Inquiry)", "email" => "rohan.bhatia@gmail.com",
                "phone" => "+91 98222 33445", "company" => "Bhatia Medical Store",
                "city" => "Gurgaon", "source" => "Website Form", "source_id" => $sources["Website Form"]->id,
                "priority" => "warm", "status" => "new", "score" => 25,
                "budget" => 80000.00, "value" => 80000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(3),
                "notes" => "Website contact form. Same Rohan from Bhatia Medico — entered via different channel.",
                "product_names" => ["Mobile CRM SaaS License"],
                "followups" => [],
            ],

            // WARM TIER 50-79
            [
                "name" => "Vikram Joshi", "email" => "vikram@joshiautomobiles.in",
                "phone" => "+91 98100 55677", "company" => "Joshi Auto Dealership Group",
                "city" => "Jaipur", "source" => "Meta Ads", "source_id" => $sources["Meta Ads"]->id,
                "priority" => "warm", "status" => "demo_meeting", "score" => 70,
                "budget" => 190000.00, "value" => 190000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(2),
                "notes" => "Demo done with their GM. Comparing with 2 competitors. Decision in 10 days.",
                "product_names" => ["Custom ERP & Software", "Google Ads Performance Marketing"],
                "followups" => [
                    ["type" => "call",    "status" => "done",    "daysAgo" => 15, "outcome" => "Good intro call. Invited for full demo."],
                    ["type" => "meeting", "status" => "done",    "daysAgo" => 8,  "outcome" => "Demo done. GM asked to evaluate further."],
                    ["type" => "call",    "status" => "pending", "daysAgo" => 2,  "outcome" => null],
                ],
            ],
            [
                "name" => "Aarav Singhania", "email" => "aarav@singhaniagroup.com",
                "phone" => "+91 98111 22334", "company" => "Singhania Logistics Ltd",
                "city" => "Mumbai", "source" => "Meta Ads", "source_id" => $sources["Meta Ads"]->id,
                "priority" => "warm", "status" => "interested", "score" => 65,
                "budget" => 280000.00, "value" => 280000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(2),
                "notes" => "CRM + fleet tracking for 40 executives. Wants integrated solution.",
                "product_names" => ["Custom ERP & Software", "Mobile CRM SaaS License"],
                "followups" => [
                    ["type" => "call",     "status" => "done",    "daysAgo" => 5, "outcome" => "Very engaged. Wants detailed proposal."],
                    ["type" => "whatsapp", "status" => "done",    "daysAgo" => 3, "outcome" => "Sent brochure and case studies."],
                    ["type" => "call",     "status" => "pending", "daysAgo" => -1, "outcome" => null],
                ],
            ],
            [
                "name" => "Meera Nambiar", "email" => "meera@nambiarjewels.com",
                "phone" => "+91 98333 44556", "company" => "Nambiar Gold & Diamonds",
                "city" => "Bangalore", "source" => "Meta Ads", "source_id" => $sources["Meta Ads"]->id,
                "priority" => "warm", "status" => "interested", "score" => 62,
                "budget" => 180000.00, "value" => 180000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(8),
                "notes" => "Saw Instagram ad. Wants custom lead assignment for retail outlets.",
                "product_names" => ["Custom ERP & Software"],
                "followups" => [
                    ["type" => "call",     "status" => "done",    "daysAgo" => 6, "outcome" => "Called after ad click. Very interested."],
                    ["type" => "whatsapp", "status" => "done",    "daysAgo" => 4, "outcome" => "Sent product videos. Positive response."],
                    ["type" => "meeting",  "status" => "pending", "daysAgo" => -2, "outcome" => null],
                ],
            ],

            // PAIR B — DUPLICATE EMAIL: sameer@kapoortextiles.com
            [
                "name" => "Sameer Kapoor", "email" => "sameer@kapoortextiles.com",
                "phone" => "+91 98555 66778", "company" => "Kapoor Textiles Global",
                "city" => "Surat", "source" => "Website Form", "source_id" => $sources["Website Form"]->id,
                "priority" => "warm", "status" => "contacted", "score" => 60,
                "budget" => 220000.00, "value" => 220000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(1),
                "notes" => "Filled website form for CRM + WhatsApp automation. Initial call done, very interested.",
                "product_names" => ["Mobile CRM SaaS License", "WhatsApp Automation Suite"],
                "followups" => [
                    ["type" => "call",     "status" => "done",    "daysAgo" => 8, "outcome" => "Needs automation for 200+ dealer network."],
                    ["type" => "whatsapp", "status" => "done",    "daysAgo" => 5, "outcome" => "Sent overview and case study."],
                    ["type" => "call",     "status" => "pending", "daysAgo" => 1, "outcome" => null],
                ],
            ],
            // DUPLICATE of Sameer Kapoor (same email, different channel — Expo)
            [
                "name" => "Sameer K.", "email" => "sameer@kapoortextiles.com",
                "phone" => "+91 98555 99900", "company" => "Kapoor Fabrics Pvt Ltd",
                "city" => "Ahmedabad", "source" => "Trade Expo", "source_id" => $sources["Trade Expo"]->id,
                "priority" => "warm", "status" => "new", "score" => 30,
                "budget" => 150000.00, "value" => 150000.00,
                "assigned_to" => $managerId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(3),
                "notes" => "Met at Textile Expo Surat. Interested in WhatsApp bot for dealers.",
                "product_names" => ["WhatsApp Automation Suite"],
                "followups" => [],
            ],

            [
                "name" => "Anita Reddy", "email" => "anita@reddyconsultants.com",
                "phone" => "+91 96000 12345", "company" => "Reddy Business Consultants",
                "city" => "Chennai", "source" => "LinkedIn", "source_id" => $sources["LinkedIn"]->id,
                "priority" => "warm", "status" => "contacted", "score" => 55,
                "budget" => 120000.00, "value" => 120000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(2),
                "notes" => "LinkedIn connection. Interested in SEO for consulting firm.",
                "product_names" => ["SEO & Content Growth Engine"],
                "followups" => [
                    ["type" => "call",  "status" => "done",    "daysAgo" => 7, "outcome" => "Budget confirmed 1.2L/year for SEO."],
                    ["type" => "email", "status" => "pending", "daysAgo" => 1, "outcome" => null],
                ],
            ],
            [
                "name" => "Kiran Patel", "email" => "kiran@patelhospitalgroup.com",
                "phone" => "+91 99900 11234", "company" => "Patel Hospital & Diagnostics",
                "city" => "Ahmedabad", "source" => "Referral", "source_id" => $sources["Referral"]->id,
                "priority" => "hot", "status" => "proposal", "score" => 78,
                "budget" => 450000.00, "value" => 450000.00,
                "assigned_to" => $managerId, "created_by" => $adminId,
                "last_activity_at" => now()->subHours(4),
                "notes" => "Referred by Rajesh Goel. Hospital chain with 6 branches. Needs HMIS + CRM + Cloud.",
                "product_names" => ["Custom ERP & Software", "Cloud Infrastructure & DevOps"],
                "followups" => [
                    ["type" => "call",    "status" => "done",    "daysAgo" => 9, "outcome" => "Great intro. Very interested."],
                    ["type" => "meeting", "status" => "done",    "daysAgo" => 5, "outcome" => "Demo with 3 decision makers. Very impressed."],
                    ["type" => "call",    "status" => "done",    "daysAgo" => 2, "outcome" => "Proposal discussed."],
                    ["type" => "call",    "status" => "pending", "daysAgo" => -2, "outcome" => null],
                ],
            ],

            // COOL TIER 25-49
            [
                "name" => "Priya Sharma", "email" => "priya@sharmaretail.com",
                "phone" => "+91 88001 23456", "company" => "Sharma Retail Chain",
                "city" => "Kolkata", "source" => "Google Ads", "source_id" => $sources["Google Ads"]->id,
                "priority" => "cold", "status" => "contacted", "score" => 35,
                "budget" => 75000.00, "value" => 75000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(5),
                "notes" => "Clicked Google ad. One call done. Not responsive since. Budget lower than our minimum.",
                "product_names" => ["Mobile CRM SaaS License"],
                "followups" => [
                    ["type" => "call",     "status" => "done",   "daysAgo" => 10, "outcome" => "Short call. Hesitant about pricing."],
                    ["type" => "whatsapp", "status" => "missed", "daysAgo" => 5,  "outcome" => null],
                    ["type" => "call",     "status" => "missed", "daysAgo" => 3,  "outcome" => null],
                ],
            ],
            [
                "name" => "Lalit Mehta", "email" => "lalit@mehtaenterprises.in",
                "phone" => "+91 77009 87654", "company" => "Mehta Industrial Supplies",
                "city" => "Nagpur", "source" => "Cold Outreach", "source_id" => $sources["Cold Outreach"]->id,
                "priority" => "cold", "status" => "new", "score" => 30,
                "budget" => 50000.00, "value" => 50000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(4),
                "notes" => "Cold outreach. No response yet. Sent initial email.",
                "product_names" => ["SEO & Content Growth Engine"],
                "followups" => [
                    ["type" => "email", "status" => "done",   "daysAgo" => 4, "outcome" => "Sent intro email with brochure."],
                    ["type" => "call",  "status" => "missed", "daysAgo" => 2, "outcome" => null],
                ],
            ],
            // PAIR C — DUPLICATE COMPANY: Deshmukh Resort Chains
            [
                "name" => "Kavita D.", "email" => "kavita.deshmukh@deshmukhresorts.in",
                "phone" => "+91 91200 55667", "company" => "Deshmukh Resort Chains",
                "city" => "Pune", "source" => "Email Inbound", "source_id" => $sources["Email Inbound"]->id,
                "priority" => "warm", "status" => "new", "score" => 40,
                "budget" => 200000.00, "value" => 200000.00,
                "assigned_to" => $managerId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(2),
                "notes" => "Inbound email from Kavita about resort chain management system. Possible duplicate of existing lead.",
                "product_names" => ["Custom ERP & Software"],
                "followups" => [
                    ["type" => "email", "status" => "done", "daysAgo" => 2, "outcome" => "Replied to inbound. Awaiting call confirmation."],
                ],
            ],
            [
                "name" => "Neha Gupta", "email" => "neha@guptaedutech.com",
                "phone" => "+91 98765 43210", "company" => "Gupta EduTech Solutions",
                "city" => "Lucknow", "source" => "Google Ads", "source_id" => $sources["Google Ads"]->id,
                "priority" => "warm", "status" => "interested", "score" => 45,
                "budget" => 160000.00, "value" => 160000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(3),
                "notes" => "EdTech startup. Needs CRM for B2B school leads. Interested in 3-month pilot.",
                "product_names" => ["Mobile CRM SaaS License"],
                "followups" => [
                    ["type" => "call",  "status" => "done",    "daysAgo" => 6, "outcome" => "Founder on call. Excited about demo."],
                    ["type" => "email", "status" => "done",    "daysAgo" => 4, "outcome" => "Sent pricing for 3-month pilot."],
                    ["type" => "call",  "status" => "pending", "daysAgo" => 1, "outcome" => null],
                ],
            ],

            // COLD / AT-RISK TIER 0-24
            [
                "name" => "Deepak Tandon", "email" => "deepak@tandonconsulting.com",
                "phone" => "+91 98888 99001", "company" => "Tandon & Associates",
                "city" => "Chandigarh", "source" => "Cold Outreach", "source_id" => $sources["Cold Outreach"]->id,
                "priority" => "cold", "status" => "lost",
                "lost_reason" => "Price", "lost_notes" => "Competitor offered free tier. Not ready for custom deployment costs.",
                "score" => 0, "budget" => 60000.00, "value" => 60000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(10),
                "notes" => "Lost due to budget and competitor pricing.",
                "product_names" => ["Mobile CRM SaaS License"],
                "followups" => [
                    ["type" => "call",  "status" => "done", "daysAgo" => 15, "outcome" => "Budget too low. Not a fit."],
                    ["type" => "email", "status" => "done", "daysAgo" => 12, "outcome" => "Sent lower tier pricing. Chose competitor."],
                ],
            ],
            [
                "name" => "Ritu Agarwal", "email" => "ritu@agarwalexports.com",
                "phone" => "+91 99800 11122", "company" => "Agarwal Exports Pvt Ltd",
                "city" => "Ludhiana", "source" => "Trade Expo", "source_id" => $sources["Trade Expo"]->id,
                "priority" => "cold", "status" => "new", "score" => 20,
                "budget" => 40000.00, "value" => 40000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(15),
                "notes" => "Expo card collected. No follow-up since 15 days. Stale lead at risk.",
                "product_names" => ["SEO & Content Growth Engine"],
                "followups" => [
                    ["type" => "call", "status" => "missed", "daysAgo" => 14, "outcome" => null],
                    ["type" => "call", "status" => "missed", "daysAgo" => 10, "outcome" => null],
                ],
            ],
            [
                "name" => "Mohan Das", "email" => "mohan@dasmarketing.in",
                "phone" => "+91 91234 56789", "company" => "Das Digital Marketing",
                "city" => "Bhopal", "source" => "YouTube Ads", "source_id" => $sources["YouTube Ads"]->id,
                "priority" => "cold", "status" => "new", "score" => 15,
                "budget" => 30000.00, "value" => 30000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(12),
                "notes" => "Clicked YouTube ad. Very small budget. Low intent signals.",
                "product_names" => ["Google Ads Performance Marketing"],
                "followups" => [
                    ["type" => "call", "status" => "missed", "daysAgo" => 11, "outcome" => null],
                ],
            ],
            [
                "name" => "Sanjay Pawar", "email" => "sanjay@pawarbuilders.com",
                "phone" => "+91 94500 77890", "company" => "Pawar Builders & Developers",
                "city" => "Nashik", "source" => "Instagram DM", "source_id" => $sources["Instagram DM"]->id,
                "priority" => "cold", "status" => "contacted", "score" => 18,
                "budget" => 55000.00, "value" => 55000.00,
                "assigned_to" => $agentId, "created_by" => $adminId,
                "last_activity_at" => now()->subDays(9),
                "notes" => "Instagram DM. Had one brief call. Very passive interest.",
                "product_names" => ["SEO & Content Growth Engine"],
                "followups" => [
                    ["type" => "call",     "status" => "done",   "daysAgo" => 9, "outcome" => "Short call. Passive interest only."],
                    ["type" => "whatsapp", "status" => "missed", "daysAgo" => 6, "outcome" => null],
                    ["type" => "call",     "status" => "missed", "daysAgo" => 3, "outcome" => null],
                ],
            ],
        ];

        // 5. Create all leads
        $createdLeads = [];
        foreach ($leadsData as $lData) {
            $productNames = $lData["product_names"] ?? [];
            $followupDefs = $lData["followups"] ?? [];
            unset($lData["product_names"], $lData["followups"]);

            $lead = Lead::updateOrCreate(["email" => $lData["email"]], $lData);

            $productIds = [];
            foreach ($productNames as $pName) {
                if (isset($products[$pName])) {
                    $productIds[] = $products[$pName]->id;
                }
            }
            $lead->products()->sync($productIds);

            LeadActivity::firstOrCreate(
                ["lead_id" => $lead->id, "type" => "created"],
                [
                    "user_id"    => $lead->created_by,
                    "payload"    => ["message" => "Lead captured via {$lead->source}", "initial_status" => $lead->status],
                    "created_at" => now()->subDays(rand(15, 30)),
                ]
            );
            LeadActivity::firstOrCreate(
                ["lead_id" => $lead->id, "type" => "assigned"],
                [
                    "user_id"    => $adminId,
                    "payload"    => ["assigned_to_id" => $lead->assigned_to, "assigned_to_name" => $lead->assignedUser?->name ?? "Sales Agent"],
                    "created_at" => now()->subDays(rand(14, 29)),
                ]
            );

            foreach ($followupDefs as $fuDef) {
                $daysAgo     = $fuDef["daysAgo"];
                $scheduledAt = $daysAgo >= 0
                    ? now()->subDays($daysAgo)->setTime(10, 30)
                    : now()->addDays(abs($daysAgo))->setTime(11, 0);

                $completedAt = null;
                if ($fuDef["status"] === "done") {
                    $completedAt = (clone $scheduledAt)->addMinutes(rand(15, 45));
                }

                FollowUp::create([
                    "lead_id"      => $lead->id,
                    "agent_id"     => $lead->assigned_to,
                    "type"         => $fuDef["type"],
                    "status"       => $fuDef["status"],
                    "scheduled_at" => $scheduledAt,
                    "completed_at" => $completedAt,
                    "outcome"      => $fuDef["outcome"],
                ]);

                if ($fuDef["status"] === "done") {
                    LeadActivity::create([
                        "lead_id"    => $lead->id,
                        "user_id"    => $lead->assigned_to,
                        "type"       => "follow_up",
                        "payload"    => ["type" => $fuDef["type"], "outcome" => $fuDef["outcome"], "status" => "done"],
                        "created_at" => $completedAt,
                    ]);
                }
            }

            $createdLeads[] = $lead;
        }

        // 6. Recalculate scores for all leads
        $leadService = app(\App\Contracts\Services\LeadServiceInterface::class);
        foreach ($createdLeads as $lead) {
            $lead->refresh();
            $lead->loadMissing(["followUps", "activities"]);
            $oldScore = $lead->score ?? 0;
            $newScore = $leadService->recalculateScore($lead);

            LeadActivity::create([
                "lead_id"    => $lead->id,
                "user_id"    => $adminId,
                "type"       => "score_change",
                "payload"    => ["old_score" => $oldScore, "new_score" => $newScore, "reason" => "Seeder initial recalculation"],
                "created_at" => now(),
            ]);
        }

        $this->command->info("PhaseOneCrmSeeder: " . count($createdLeads) . " leads created/updated.");
        $this->command->info("DUPLICATE PAIR A (PHONE):   Rohan Bhatia & Rohan Bhatia (Web Inquiry) - +91 98222 33445");
        $this->command->info("DUPLICATE PAIR B (EMAIL):   Sameer Kapoor & Sameer K. - sameer@kapoortextiles.com");
        $this->command->info("DUPLICATE PAIR C (COMPANY): Kavita Deshmukh & Kavita D. - Deshmukh Resort Chains");
        $this->command->info("Run: php artisan leads:recalculate-scores to batch refresh all scores.");
    }
}
