# Cloudflare API Protection Schema

This document outlines the Cloudflare protection configuration for Barzakh AI's API endpoints.

## Table of Contents

- [Overview](#overview)
- [API Endpoints Inventory](#api-endpoints-inventory)
- [Cloudflare Configuration](#cloudflare-configuration)
- [Rate Limiting Rules](#rate-limiting-rules)
- [WAF Rules](#waf-rules)
- [Bot Protection](#bot-protection)
- [API Shield Schema](#api-shield-schema)
- [Implementation Guide](#implementation-guide)

---

## Overview

Barzakh AI has two deployment targets:

| Application | Domain | Purpose |
|-------------|--------|---------|
| **Frontend** | `barzakh.ai` (or your domain) | Main web app + internal API routes |
| **Backend** | `api.barzakh.ai` (or your domain) | External OpenAI-compatible API |

---

## API Endpoints Inventory

### Frontend API Routes (`/api/*`)

| Endpoint | Method | Auth Required | Rate Limit | Description |
|----------|--------|---------------|------------|-------------|
| `/api/2fa/*` | POST | Yes | 10/min | Two-factor authentication |
| `/api/account/delete` | DELETE | Yes | 5/hour | Account deletion |
| `/api/billing/subscription` | GET | Yes | 30/min | Get subscription status |
| `/api/billing/create-checkout-session` | POST | Yes | 10/min | Create Stripe checkout |
| `/api/billing/manage-subscription` | POST | Yes | 10/min | Manage subscription |
| `/api/billing/cancel-subscription` | POST | Yes | 5/hour | Cancel subscription |
| `/api/billing/payment-methods` | GET | Yes | 30/min | List payment methods |
| `/api/billing/create-setup-intent` | POST | Yes | 10/min | Add payment method |
| `/api/billing/invoices` | GET | Yes | 30/min | List invoices |
| `/api/changes-email/*` | POST | Yes | 5/hour | Email change requests |
| `/api/chat` | GET, DELETE | Yes | 60/min | Chat operations |
| `/api/files/upload` | POST | Yes | 20/min | File uploads |
| `/api/proxy-image` | POST | Yes | 100/min | Image proxy |
| `/api/persist-image` | POST | Yes | 50/min | Image persistence |
| `/api/settings` | GET, PATCH | Yes | 30/min | User settings |
| `/api/auth/*` | ALL | Partial | 20/min | NextAuth endpoints |
| `/api/webhooks/stripe` | POST | No* | 100/min | Stripe webhooks |
| `/api/zerion/*` | GET | Yes | 60/min | Zerion API proxy |
| `/api/messagelimitcron` | GET | No* | 1/day | Cron job |

> *Webhook endpoints use signature verification instead of session auth

### Backend API Routes (`/api/*`)

| Endpoint | Method | Auth Required | Rate Limit | Description |
|----------|--------|---------------|------------|-------------|
| `/api/chat/completions` | POST | Yes (API Key) | Tiered | OpenAI-compatible chat completions |
| `/api/completions` | POST | Yes (API Key) | Tiered | Legacy completions endpoint |

---

## Cloudflare Configuration

### DNS Setup

```
Type    Name              Content                 Proxy
A       @                 76.76.21.21             ✅ Proxied
CNAME   api               cname.vercel-dns.com    ✅ Proxied
CNAME   www               cname.vercel-dns.com    ✅ Proxied
```

### SSL/TLS Settings

```yaml
SSL Mode: Full (Strict)
Minimum TLS Version: 1.2
TLS 1.3: Enabled
Automatic HTTPS Rewrites: Enabled
Always Use HTTPS: Enabled
```

---

## Rate Limiting Rules

### Rule 1: Authentication Endpoints (Strict)

```json
{
  "name": "Auth Rate Limit",
  "expression": "(http.request.uri.path contains \"/api/auth\" or http.request.uri.path contains \"/api/2fa\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src", "cf.colo.id"],
    "period": 60,
    "requests_per_period": 20,
    "mitigation_timeout": 600
  }
}
```

### Rule 2: Billing Endpoints (Moderate)

```json
{
  "name": "Billing Rate Limit",
  "expression": "(http.request.uri.path contains \"/api/billing\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src"],
    "period": 60,
    "requests_per_period": 30,
    "mitigation_timeout": 300
  }
}
```

### Rule 3: Destructive Actions (Strict)

```json
{
  "name": "Destructive Actions Rate Limit",
  "expression": "(http.request.uri.path contains \"/api/account/delete\" or http.request.uri.path contains \"/api/billing/cancel\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src"],
    "period": 3600,
    "requests_per_period": 5,
    "mitigation_timeout": 3600
  }
}
```

### Rule 4: Chat Completions API (Tiered)

```json
{
  "name": "Chat API Rate Limit - Free Tier",
  "expression": "(http.request.uri.path eq \"/api/chat/completions\" and not http.request.headers[\"x-user-tier\"] eq \"pro\" and not http.request.headers[\"x-user-tier\"] eq \"ultimate\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["http.request.headers[\"authorization\"]"],
    "period": 60,
    "requests_per_period": 10,
    "mitigation_timeout": 60
  }
}
```

### Rule 5: File Upload Protection

```json
{
  "name": "File Upload Rate Limit",
  "expression": "(http.request.uri.path contains \"/api/files/upload\" or http.request.uri.path contains \"/api/persist-image\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src"],
    "period": 60,
    "requests_per_period": 20,
    "mitigation_timeout": 300
  }
}
```

### Rule 6: General API Protection

```json
{
  "name": "General API Rate Limit",
  "expression": "(http.request.uri.path contains \"/api/\")",
  "action": "block",
  "ratelimit": {
    "characteristics": ["ip.src"],
    "period": 60,
    "requests_per_period": 100,
    "mitigation_timeout": 60
  }
}
```

---

## WAF Rules

### Custom WAF Rules

```json
{
  "rules": [
    {
      "name": "Block SQL Injection",
      "expression": "(http.request.uri.query contains \"SELECT\" or http.request.uri.query contains \"UNION\" or http.request.uri.query contains \"DROP\")",
      "action": "block"
    },
    {
      "name": "Block XSS Attempts",
      "expression": "(http.request.uri contains \"<script\" or http.request.body.raw contains \"<script\")",
      "action": "block"
    },
    {
      "name": "Block Path Traversal",
      "expression": "(http.request.uri contains \"../\" or http.request.uri contains \"..\\\\\")",
      "action": "block"
    },
    {
      "name": "Require Valid Content-Type for POST",
      "expression": "(http.request.method eq \"POST\" and http.request.uri.path contains \"/api/\" and not http.request.headers[\"content-type\"] contains \"application/json\" and not http.request.headers[\"content-type\"] contains \"multipart/form-data\")",
      "action": "block"
    },
    {
      "name": "Block Non-Browser API Access (Frontend)",
      "expression": "(http.request.uri.path matches \"^/api/(2fa|account|billing|settings)\" and not http.request.headers[\"origin\"] contains \"barzakh\" and http.request.method ne \"OPTIONS\")",
      "action": "block"
    },
    {
      "name": "Webhook Signature Required",
      "expression": "(http.request.uri.path eq \"/api/webhooks/stripe\" and not http.request.headers[\"stripe-signature\"][0] ne \"\")",
      "action": "block"
    }
  ]
}
```

### Managed Rulesets to Enable

```yaml
Cloudflare Managed Ruleset: Enabled
  - Anomaly Detection: High
  - SQL Injection: Enabled
  - XSS: Enabled
  - RCE: Enabled
  - File Inclusion: Enabled

OWASP Core Ruleset: Enabled
  - Paranoia Level: 2
  - Anomaly Threshold: 25
```

---

## Bot Protection

### Bot Fight Mode Configuration

```yaml
Bot Fight Mode: Enabled
Super Bot Fight Mode: Enabled (if available)

Verified Bots: Allow
  - Googlebot
  - Bingbot
  - Stripe webhook IPs

Definitely Automated: Challenge
Likely Automated: Challenge
Likely Human: Allow
Verified Human: Allow
```

### Known Bot Allow List

```json
{
  "name": "Allow Stripe Webhooks",
  "expression": "(http.request.uri.path eq \"/api/webhooks/stripe\" and ip.src in {3.18.12.63 3.130.192.231 13.235.14.237 13.235.122.149 18.211.135.69 35.154.171.200 52.15.183.38 54.88.130.119 54.88.130.237 54.187.174.169 54.187.205.235 54.187.216.72})",
  "action": "allow"
}
```

### Cron Job Protection

```json
{
  "name": "Allow Vercel Cron",
  "expression": "(http.request.uri.path eq \"/api/messagelimitcron\" and http.request.headers[\"authorization\"] eq \"Bearer ${CRON_SECRET}\")",
  "action": "allow"
}
```

---

## API Shield Schema

### OpenAPI Schema for Backend (`api.barzakh.ai`)

```yaml
openapi: "3.0.0"
info:
  title: Barzakh AI API
  version: "1.0.0"
  description: OpenAI-compatible chat completions API

servers:
  - url: https://api.barzakh.ai

security:
  - BearerAuth: []

paths:
  /api/chat/completions:
    post:
      operationId: createChatCompletion
      summary: Create a chat completion
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatCompletionRequest'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatCompletionResponse'
            text/event-stream:
              schema:
                type: string
        '401':
          description: Unauthorized
        '429':
          description: Rate limit exceeded

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      description: API key provided as Bearer token

  schemas:
    ChatCompletionRequest:
      type: object
      required:
        - messages
      properties:
        messages:
          type: array
          minItems: 1
          maxItems: 100
          items:
            $ref: '#/components/schemas/Message'
        selectedChatModel:
          type: string
          enum:
            - gpt-4o
            - gpt-4o-mini
            - claude-sonnet
            - claude-haiku
            - gemini-2.0-flash
          default: gpt-4o-mini
        group:
          type: string
          enum:
            - search
            - imagine
            - multimodal
          default: search
        stream:
          type: boolean
          default: true
        max_tokens:
          type: integer
          minimum: 1
          maximum: 16384
        temperature:
          type: number
          minimum: 0
          maximum: 2

    Message:
      type: object
      required:
        - role
        - content
      properties:
        role:
          type: string
          enum:
            - system
            - user
            - assistant
        content:
          oneOf:
            - type: string
              maxLength: 100000
            - type: array
              items:
                $ref: '#/components/schemas/ContentPart'

    ContentPart:
      type: object
      properties:
        type:
          type: string
          enum:
            - text
            - image
        text:
          type: string
        image:
          type: string
          format: uri

    ChatCompletionResponse:
      type: object
      properties:
        id:
          type: string
        object:
          type: string
        created:
          type: integer
        model:
          type: string
        choices:
          type: array
          items:
            type: object
            properties:
              index:
                type: integer
              message:
                $ref: '#/components/schemas/Message'
              finish_reason:
                type: string
        usage:
          type: object
          properties:
            prompt_tokens:
              type: integer
            completion_tokens:
              type: integer
            total_tokens:
              type: integer
```

### Upload to Cloudflare API Shield

1. Go to **Cloudflare Dashboard** → **Security** → **API Shield**
2. Click **Add schema**
3. Upload the OpenAPI schema above
4. Enable **Schema Validation** with action: **Block**

---

## Implementation Guide

### Step 1: Enable Cloudflare Proxy

Ensure all DNS records are proxied (orange cloud):

```bash
# Verify in Cloudflare Dashboard → DNS → Records
# All A/CNAME records should show orange cloud icon
```

### Step 2: Configure SSL/TLS

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**

### Step 3: Create Rate Limiting Rules

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Create rules in order of specificity (most specific first)
3. Use the JSON configurations above

### Step 4: Configure WAF

1. Go to **Security** → **WAF** → **Custom rules**
2. Add the custom WAF rules
3. Enable managed rulesets

### Step 5: Set Up Bot Protection

1. Go to **Security** → **Bots**
2. Enable **Bot Fight Mode**
3. Configure **Super Bot Fight Mode** if available

### Step 6: API Shield (Enterprise)

1. Go to **Security** → **API Shield**
2. Upload OpenAPI schema
3. Enable schema validation

### Step 7: Add Security Headers

Create a Transform Rule to add security headers:

```json
{
  "expression": "true",
  "action_parameters": {
    "headers": {
      "X-Content-Type-Options": { "value": "nosniff" },
      "X-Frame-Options": { "value": "DENY" },
      "X-XSS-Protection": { "value": "1; mode=block" },
      "Referrer-Policy": { "value": "strict-origin-when-cross-origin" },
      "Permissions-Policy": { "value": "camera=(), microphone=(), geolocation=()" }
    }
  }
}
```

---

## Environment Variables

Add these to your Vercel environment:

```bash
# For Cloudflare Turnstile (already in use)
TURNSTILE_SECRET_KEY=your-turnstile-secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key

# For cron job authentication
CRON_SECRET=your-cron-secret-key
```

---

## Monitoring & Alerts

### Recommended Notifications

1. **Security Events** → Alert on WAF blocks > 100/hour
2. **Rate Limiting** → Alert on blocks > 500/hour
3. **DDoS Attacks** → Alert on any L7 attack
4. **Bot Traffic** → Weekly report on bot activity

### Analytics to Monitor

- **Security** → **Events** → Filter by action: Block
- **Security** → **Bots** → Bot traffic trends
- **Analytics** → **Traffic** → Requests by country/IP

---

## Quick Reference

| Protection Layer | Free Plan | Pro Plan | Business+ |
|-----------------|-----------|----------|-----------|
| Rate Limiting | 1 rule | 10 rules | 100 rules |
| WAF Custom Rules | 5 rules | 20 rules | 100 rules |
| Bot Protection | Basic | Standard | Advanced |
| API Shield | ❌ | ❌ | ✅ |
| Advanced DDoS | Basic | Standard | Advanced |

---

## Contact

For billing or security questions: [Contact Support](https://barzakh.ai/contact)
