# Project Ease — Claude Context

## What this project is
Multi-tenant Document Intelligence RAG platform built on top of the Azure Search OpenAI Demo (Microsoft reference repo). Target clients: CA firms, law practices, logistics companies in Lahore. Users upload documents and query them in plain English or Roman Urdu.

This repo is a fork of: https://github.com/Azure-Samples/azure-search-openai-demo

## Tech stack
- Azure AI Search (free F1 tier dev, Basic prod)
- Azure AI Document Intelligence (500 free pages/month dev)
- Azure OpenAI (GPT-4o-mini)
- Python backend (app/backend/), React frontend (app/frontend/)
- Deployed via Azure Developer CLI (azd)

## What we add on top of the base repo (our differentiators)
1. Multi-tenancy — organization_id field on every document, filter every search query by it
2. Per-org blob storage isolation (org-specific prefixes)
3. Retrieval eval layer — precision@k, answer relevance scores, admin dashboard
4. Roman Urdu + English query support

## Current environment state
- azd environment name: `project-ease-dev2`
- Target region: `eastus2` (eastus has AKS capacity issues)
- Azure subscription: Azure subscription 1 (59310e93-5c42-49a8-9bcf-e31b45c222ef)
- Logged in as: bilal.faisal@acme-one.com

## Known issues on this machine
1. ISP (ConnecTel Pakistan) blocks Microsoft TLS endpoints — `azd auth login` fails on WiFi
   - Fix: use mobile hotspot OR Cloudflare WARP VPN before running any `azd` or `az` commands
   - DNS was changed to 8.8.8.8 / 8.8.4.4 to fix DNS resolution
2. eastus region has AKS capacity issues — always use eastus2
3. Soft-deleted Cognitive Services resources block re-deployment with same name — always use `azd down --force --purge` to clean up

## What needs to happen next (immediate)
Run `azd up` to completion with these selections:
- documentIntelligenceResourceGroupLocation: eastus2
- location: eastus2
This provisions: Container Registry, Container Apps Environment, Azure OpenAI (Foundry), Document Intelligence, AI Search, Storage, App Insights

After successful deploy, verify the app URL loads and the sample chat UI works.

## Week 1 goal (do not write custom code yet)
- Get `azd up` running successfully
- Explore these files to understand the codebase:
  - app/backend/app.py — main FastAPI app, routes
  - app/backend/approaches/chatreadretrieveread.py — the RAG pipeline
  - app/backend/prepdocs.py — document ingestion pipeline
  - app/backend/prepdocslib/ — parsers, blob manager, search manager
- Spend 45 min/day rewriting AI-generated functions by hand to build Python fluency

## Multi-tenancy plan (Week 2 — do not implement yet)
Add `organization_id` field to:
- Azure AI Search index schema (infra/core/search/search-services.bicep or equivalent)
- Every document upload (prepdocslib/blobmanager.py, prepdocslib/searchmanager.py)
- Every search query filter (approaches/chatreadretrieveread.py)
- Per-org blob prefix: `orgs/{org_id}/` in storage

## Important constraints
- Do not touch GitHub Actions workflows
- Do not upgrade Python dependencies without checking compatibility
- Keep all Azure resources in eastus2
- Free tier during dev — do not enable features that incur cost (CosmosDB, GPT-4o full, etc.)
- Revenue model: Starter 4,500 PKR / Professional 9,000 PKR / Business 20,000 PKR/month
