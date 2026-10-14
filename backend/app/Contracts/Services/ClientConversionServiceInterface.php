<?php

namespace App\Contracts\Services;

use App\Models\Client;
use App\Models\Lead;

interface ClientConversionServiceInterface
{
    /**
     * Convert a won sales lead into a full client account with services and login access.
     */
    public function convertLead(Lead $lead, array $payload): Client;
}
