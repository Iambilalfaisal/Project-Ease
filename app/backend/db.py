"""
Project Ease — SQLite persistence layer.

Audit columns on every table:
  is_active   — 1 = live, 0 = soft-deleted
  created_at  — ISO datetime, set once on insert
  created_by  — user_id of creator, or 'system'
  modified_at — ISO datetime, updated on every write
  modified_by — user_id of last modifier, or 'system'
"""

import re
import uuid
import sqlite3
import secrets
import hashlib
import datetime
from pathlib import Path
from contextlib import contextmanager
from typing import Optional

DB_PATH = Path(__file__).parent / "db.sqlite"

SYSTEM = "system"   # actor for seed / background operations


# ── Connection ────────────────────────────────────────────────────────────────

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Schema ────────────────────────────────────────────────────────────────────
# is_active / created_at / created_by / modified_at / modified_by on every table.

SCHEMA = """
CREATE TABLE IF NOT EXISTS organizations (
    org_id       TEXT    PRIMARY KEY,
    name         TEXT    NOT NULL,
    plan         TEXT    NOT NULL DEFAULT 'free',
    status       TEXT    NOT NULL DEFAULT 'active',
    max_docs     INTEGER NOT NULL DEFAULT 20,
    max_users    INTEGER NOT NULL DEFAULT 5,
    industry     TEXT    NOT NULL DEFAULT 'Other',
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS users (
    user_id               TEXT    PRIMARY KEY,
    org_id                TEXT    NOT NULL REFERENCES organizations(org_id),
    email                 TEXT    NOT NULL UNIQUE,
    name                  TEXT    NOT NULL,
    role                  TEXT    NOT NULL DEFAULT 'employee',
    password_hash         TEXT    NOT NULL,
    must_change_password  INTEGER NOT NULL DEFAULT 0,
    is_active             INTEGER NOT NULL DEFAULT 1,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by            TEXT    NOT NULL DEFAULT 'system',
    modified_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by           TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS categories (
    category_id  TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    name         TEXT    NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system',
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS documents (
    doc_id       TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    filename     TEXT    NOT NULL,
    category_id  TEXT    REFERENCES categories(category_id),
    size_bytes   INTEGER NOT NULL DEFAULT 0,
    status       TEXT    NOT NULL DEFAULT 'processing',
    blob_name    TEXT,
    uploaded_by  TEXT    REFERENCES users(user_id),
    uploaded_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS permissions (
    user_id      TEXT    NOT NULL REFERENCES users(user_id),
    category_id  TEXT    NOT NULL REFERENCES categories(category_id),
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system',
    PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS clients (
    client_id   TEXT    PRIMARY KEY,
    org_id      TEXT    NOT NULL REFERENCES organizations(org_id),
    name        TEXT    NOT NULL,
    client_type TEXT    NOT NULL DEFAULT 'Individual',
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    cnic_ntn    TEXT,
    notes       TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS matter_teams (
    team_id     TEXT    PRIMARY KEY,
    org_id      TEXT    NOT NULL REFERENCES organizations(org_id),
    name        TEXT    NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS matter_team_members (
    team_id     TEXT    NOT NULL REFERENCES matter_teams(team_id),
    user_id     TEXT    NOT NULL REFERENCES users(user_id),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system',
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS custom_courts (
    court_id    TEXT    PRIMARY KEY,
    org_id      TEXT    NOT NULL REFERENCES organizations(org_id),
    name        TEXT    NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system',
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS matters (
    matter_id      TEXT    PRIMARY KEY,
    org_id         TEXT    NOT NULL REFERENCES organizations(org_id),
    client_id      TEXT    NOT NULL REFERENCES clients(client_id),
    title          TEXT    NOT NULL,
    matter_type    TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'Active',
    court_name     TEXT,
    case_number    TEXT,
    filing_date    TEXT,
    opposing_party TEXT,
    team_id        TEXT    REFERENCES matter_teams(team_id),
    notes          TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by     TEXT    NOT NULL DEFAULT 'system',
    modified_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by    TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS upgrade_requests (
    request_id      TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL REFERENCES organizations(org_id),
    current_plan    TEXT NOT NULL,
    requested_plan  TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    payment_ref     TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at     TEXT,
    resolved_by     TEXT
);

CREATE TABLE IF NOT EXISTS fees (
    fee_id       TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT REFERENCES matters(matter_id),
    description  TEXT NOT NULL,
    fee_type     TEXT NOT NULL DEFAULT 'Consultation',
    amount       INTEGER NOT NULL DEFAULT 0,   -- PKR, whole rupees
    fee_date     TEXT NOT NULL,                -- YYYY-MM-DD
    is_paid      INTEGER NOT NULL DEFAULT 0,
    paid_at      TEXT,
    invoice_id   TEXT,                         -- set when billed to an invoice
    notes        TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT NOT NULL DEFAULT 'system',
    modified_at  TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_fees_matter ON fees(matter_id, fee_date);

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id     TEXT PRIMARY KEY,
    org_id         TEXT NOT NULL REFERENCES organizations(org_id),
    matter_id      TEXT REFERENCES matters(matter_id),
    client_id      TEXT REFERENCES clients(client_id),
    invoice_number TEXT NOT NULL,              -- e.g. INV-2024-001
    title          TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'draft',  -- draft / sent / paid / cancelled
    issued_date    TEXT NOT NULL,              -- YYYY-MM-DD
    due_date       TEXT,                       -- YYYY-MM-DD, optional
    total_amount   INTEGER NOT NULL DEFAULT 0, -- PKR
    notes          TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    created_by     TEXT NOT NULL DEFAULT 'system',
    modified_at    TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by    TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id, issued_date DESC);

CREATE TABLE IF NOT EXISTS hearings (
    hearing_id      TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL REFERENCES organizations(org_id),
    matter_id       TEXT REFERENCES matters(matter_id),
    title           TEXT NOT NULL,
    hearing_date    TEXT NOT NULL,   -- YYYY-MM-DD
    hearing_time    TEXT,            -- HH:MM (24h), nullable
    court_name      TEXT,
    judge_name      TEXT,
    notes           TEXT,
    wa_reminder     INTEGER NOT NULL DEFAULT 0,  -- 1 = send WhatsApp reminder
    reminder_sent   INTEGER NOT NULL DEFAULT 0,  -- 1 = reminder already sent
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT NOT NULL DEFAULT 'system',
    modified_at     TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by     TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_hearings_org_date ON hearings(org_id, hearing_date);

CREATE TABLE IF NOT EXISTS deadlines (
    deadline_id     TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL REFERENCES organizations(org_id),
    matter_id       TEXT REFERENCES matters(matter_id),
    title           TEXT NOT NULL,
    due_date        TEXT NOT NULL,   -- YYYY-MM-DD
    deadline_type   TEXT NOT NULL DEFAULT 'Filing',  -- Filing, Response, Appeal, Other
    notes           TEXT,
    is_completed    INTEGER NOT NULL DEFAULT 0,
    wa_reminder     INTEGER NOT NULL DEFAULT 0,
    reminder_sent   INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT NOT NULL DEFAULT 'system',
    modified_at     TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by     TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_deadlines_org_date ON deadlines(org_id, due_date);

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id        TEXT PRIMARY KEY,
    org_id        TEXT,
    user_id       TEXT,
    actor_name    TEXT,
    actor_role    TEXT,
    event_type    TEXT NOT NULL,
    resource_type TEXT,
    resource_id   TEXT,
    resource_name TEXT,
    details       TEXT,
    ip_address    TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created   ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created ON audit_logs(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS case_law_docs (
    doc_id          TEXT PRIMARY KEY,
    publisher       TEXT NOT NULL,          -- PLD | SCMR | MLD | CLC | OTHER
    title           TEXT NOT NULL,          -- e.g. "PLD 2019 Supreme Court 412"
    year            INTEGER,                -- e.g. 2019
    volume          TEXT,                   -- e.g. "Vol. 5" or blank
    court           TEXT,                   -- e.g. "Supreme Court", "Lahore High Court"
    filename        TEXT NOT NULL,          -- blob filename used in Azure Search
    size_bytes      INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'processing',  -- processing | ready | error
    error_msg       TEXT,
    indexed_by      TEXT NOT NULL DEFAULT 'system',
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT NOT NULL DEFAULT 'system',
    modified_at     TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by     TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_case_law_publisher ON case_law_docs(publisher, year DESC);

CREATE TABLE IF NOT EXISTS templates (
    template_id   TEXT PRIMARY KEY,
    org_id        TEXT NOT NULL REFERENCES organizations(org_id),
    title         TEXT NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'general',  -- vakalatnama | plaint | agreement | notice | general
    content       TEXT NOT NULL DEFAULT '',          -- body with {{variable}} placeholders
    description   TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by    TEXT    NOT NULL DEFAULT 'system',
    modified_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by   TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(org_id, template_type);

CREATE TABLE IF NOT EXISTS client_tokens (
    token_id    TEXT PRIMARY KEY,
    token       TEXT NOT NULL UNIQUE,
    org_id      TEXT NOT NULL REFERENCES organizations(org_id),
    client_id   TEXT NOT NULL REFERENCES clients(client_id),
    matter_id   TEXT REFERENCES matters(matter_id),
    label       TEXT,                                  -- human-readable note, e.g. "Contract Docs – Jan 2026"
    expires_at  TEXT,                                  -- ISO datetime or NULL for no expiry
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_client_tokens_org ON client_tokens(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_tokens_token ON client_tokens(token);

-- Task #43: password reset tokens (1-hour expiry, single-use)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id   TEXT PRIMARY KEY,
    token      TEXT NOT NULL UNIQUE,
    user_id    TEXT NOT NULL REFERENCES users(user_id),
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);

-- Task #130: court orders log — one row per hearing outcome
CREATE TABLE IF NOT EXISTS court_orders (
    order_id     TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT    NOT NULL REFERENCES matters(matter_id),
    hearing_date TEXT    NOT NULL,
    court_name   TEXT,
    order_brief  TEXT    NOT NULL,
    next_date    TEXT,
    outcome      TEXT    NOT NULL DEFAULT 'Adjourned',
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_court_orders_matter ON court_orders(matter_id, hearing_date DESC);

-- Task #131: adverse parties per matter
CREATE TABLE IF NOT EXISTS adverse_parties (
    party_id     TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT    NOT NULL REFERENCES matters(matter_id),
    party_name   TEXT    NOT NULL,
    party_type   TEXT    NOT NULL DEFAULT 'Individual',
    counsel_name TEXT,
    counsel_phone TEXT,
    counsel_firm TEXT,
    notes        TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_adverse_parties_matter ON adverse_parties(matter_id);

-- Task #133: time tracking per matter
CREATE TABLE IF NOT EXISTS time_entries (
    entry_id         TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL REFERENCES matters(matter_id),
    user_id          TEXT    REFERENCES users(user_id),
    description      TEXT,
    entry_date       TEXT    NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    hourly_rate      INTEGER NOT NULL DEFAULT 0,
    billable         INTEGER NOT NULL DEFAULT 1,
    fee_id           TEXT    REFERENCES fees(fee_id),
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_time_entries_matter ON time_entries(matter_id, entry_date DESC);

-- Cause List Integration — Task #137
CREATE TABLE IF NOT EXISTS cause_list_entries (
    entry_id    TEXT    PRIMARY KEY,
    org_id      TEXT    NOT NULL REFERENCES organizations(org_id),
    list_date   TEXT    NOT NULL,
    court_name  TEXT,
    item_no     TEXT,
    case_number TEXT,
    parties     TEXT,
    bench       TEXT,
    matter_id   TEXT    REFERENCES matters(matter_id),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_cause_list_date ON cause_list_entries(org_id, list_date DESC);

CREATE TABLE IF NOT EXISTS matter_notes (
    note_id     TEXT    PRIMARY KEY,
    org_id      TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id   TEXT    NOT NULL REFERENCES matters(matter_id),
    note_type   TEXT    NOT NULL DEFAULT 'Note',
    note_text   TEXT    NOT NULL,
    note_date   TEXT    NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT    NOT NULL DEFAULT 'system',
    modified_at TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_notes ON matter_notes(matter_id, note_date DESC);

CREATE TABLE IF NOT EXISTS document_requests (
    request_id    TEXT    PRIMARY KEY,
    org_id        TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id     TEXT    NOT NULL REFERENCES matters(matter_id),
    doc_name      TEXT    NOT NULL,
    requested_date TEXT   NOT NULL,
    due_date      TEXT,
    status        TEXT    NOT NULL DEFAULT 'Pending',
    notes         TEXT,
    received_date TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by    TEXT    NOT NULL DEFAULT 'system',
    modified_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by   TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_doc_requests ON document_requests(matter_id, status);

CREATE TABLE IF NOT EXISTS witnesses (
    witness_id      TEXT    PRIMARY KEY,
    org_id          TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id       TEXT    NOT NULL REFERENCES matters(matter_id),
    witness_name    TEXT    NOT NULL,
    witness_type    TEXT    NOT NULL DEFAULT 'Defence',
    contact_number  TEXT,
    address         TEXT,
    statement_status TEXT   NOT NULL DEFAULT 'Not Taken',
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT    NOT NULL DEFAULT 'system',
    modified_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by     TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_witnesses ON witnesses(matter_id, witness_type);

CREATE TABLE IF NOT EXISTS matter_deadlines (
    deadline_id  TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT    NOT NULL REFERENCES matters(matter_id),
    title        TEXT    NOT NULL,
    due_date     TEXT    NOT NULL,
    priority     TEXT    NOT NULL DEFAULT 'Medium',
    completed    INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    notes        TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_deadlines ON matter_deadlines(matter_id, due_date);

CREATE TABLE IF NOT EXISTS matter_expenses (
    expense_id   TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT    NOT NULL REFERENCES matters(matter_id),
    description  TEXT    NOT NULL,
    amount_pkr   REAL    NOT NULL DEFAULT 0,
    expense_date TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'Misc',
    billable     INTEGER NOT NULL DEFAULT 1,
    receipt_ref  TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_expenses ON matter_expenses(matter_id, expense_date);

CREATE TABLE IF NOT EXISTS matter_correspondence (
    corr_id      TEXT    PRIMARY KEY,
    org_id       TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id    TEXT    NOT NULL REFERENCES matters(matter_id),
    corr_date    TEXT    NOT NULL,
    direction    TEXT    NOT NULL DEFAULT 'Sent',
    corr_type    TEXT    NOT NULL DEFAULT 'Letter',
    subject      TEXT    NOT NULL,
    party        TEXT,
    reference_no TEXT,
    notes        TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT    NOT NULL DEFAULT 'system',
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by  TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_correspondence ON matter_correspondence(matter_id, corr_date);

CREATE TABLE IF NOT EXISTS matter_relief (
    relief_id        TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL REFERENCES matters(matter_id),
    application_date TEXT    NOT NULL,
    relief_type      TEXT    NOT NULL DEFAULT 'Bail',
    court            TEXT,
    judge            TEXT,
    status           TEXT    NOT NULL DEFAULT 'Pending',
    conditions       TEXT,
    surety_amount_pkr REAL,
    surety_name      TEXT,
    notes            TEXT,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_relief ON matter_relief(matter_id, application_date);

CREATE TABLE IF NOT EXISTS matter_outcomes (
    outcome_id       TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL UNIQUE REFERENCES matters(matter_id),
    disposal_date    TEXT,
    outcome_type     TEXT    NOT NULL DEFAULT 'Pending',
    court            TEXT,
    judge            TEXT,
    decree_amount_pkr REAL,
    appeal_filed     INTEGER NOT NULL DEFAULT 0,
    appeal_deadline  TEXT,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS matter_charges (
    charge_id        TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL REFERENCES matters(matter_id),
    section_no       TEXT    NOT NULL,
    description      TEXT,
    plea             TEXT    NOT NULL DEFAULT 'No Plea',
    charge_framed    INTEGER NOT NULL DEFAULT 0,
    charge_framed_date TEXT,
    court            TEXT,
    notes            TEXT,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_charges ON matter_charges(matter_id);

CREATE TABLE IF NOT EXISTS matter_fir (
    fir_id           TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL REFERENCES matters(matter_id),
    fir_number       TEXT    NOT NULL,
    police_station   TEXT    NOT NULL,
    district         TEXT,
    io_name          TEXT,
    complainant      TEXT,
    arrest_date      TEXT,
    sections_at_fir  TEXT,
    sections_after_challan TEXT,
    fir_date         TEXT,
    notes            TEXT,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_fir ON matter_fir(matter_id);

CREATE TABLE IF NOT EXISTS matter_challan (
    challan_id        TEXT    PRIMARY KEY,
    org_id            TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id         TEXT    NOT NULL REFERENCES matters(matter_id),
    challan_date      TEXT,
    challan_type      TEXT    NOT NULL DEFAULT 'Complete',
    submitted_in_time INTEGER NOT NULL DEFAULT 1,
    witnesses_count   INTEGER NOT NULL DEFAULT 0,
    challan_court     TEXT,
    status            TEXT    NOT NULL DEFAULT 'Pending',
    notes             TEXT,
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by        TEXT    NOT NULL DEFAULT 'system',
    modified_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by       TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_matter_challan ON matter_challan(matter_id);

CREATE TABLE IF NOT EXISTS court_fee_payments (
    fee_payment_id   TEXT    PRIMARY KEY,
    org_id           TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id        TEXT    NOT NULL REFERENCES matters(matter_id),
    claim_amount_pkr REAL    NOT NULL DEFAULT 0,
    fee_type         TEXT    NOT NULL DEFAULT 'Ad Valorem',
    calculated_fee   REAL    NOT NULL DEFAULT 0,
    actual_paid      REAL    NOT NULL DEFAULT 0,
    payment_date     TEXT,
    challan_no       TEXT,
    court            TEXT,
    notes            TEXT,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by       TEXT    NOT NULL DEFAULT 'system',
    modified_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by      TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_court_fee_payments ON court_fee_payments(matter_id);

CREATE TABLE IF NOT EXISTS associate_fees (
    assoc_fee_id    TEXT    PRIMARY KEY,
    org_id          TEXT    NOT NULL REFERENCES organizations(org_id),
    matter_id       TEXT    NOT NULL REFERENCES matters(matter_id),
    advocate_name   TEXT    NOT NULL,
    bar_no          TEXT,
    appearance_date TEXT,
    amount_pkr      REAL    NOT NULL DEFAULT 0,
    paid            INTEGER NOT NULL DEFAULT 0,
    payment_date    TEXT,
    notes           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    created_by      TEXT    NOT NULL DEFAULT 'system',
    modified_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_by     TEXT    NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_associate_fees_matter ON associate_fees(matter_id);
CREATE INDEX IF NOT EXISTS idx_associate_fees_org    ON associate_fees(org_id);

-- Task #154: Client Trust / Advance Money Ledger
CREATE TABLE IF NOT EXISTS client_trust_ledger (
    ledger_id    TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL,
    client_id    TEXT NOT NULL,
    matter_id    TEXT,
    txn_type     TEXT NOT NULL DEFAULT 'Credit',
    amount_pkr   REAL NOT NULL DEFAULT 0,
    balance_pkr  REAL NOT NULL DEFAULT 0,
    description  TEXT NOT NULL,
    txn_date     TEXT NOT NULL,
    reference_no TEXT,
    notes        TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL,
    created_by   TEXT NOT NULL,
    modified_at  TEXT,
    modified_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_trust_ledger_client ON client_trust_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_trust_ledger_org    ON client_trust_ledger(org_id);

-- Task #155: Post-Dated / Undated Cheque Tracker
CREATE TABLE IF NOT EXISTS matter_cheques (
    cheque_id      TEXT PRIMARY KEY,
    org_id         TEXT NOT NULL,
    matter_id      TEXT NOT NULL,
    client_id      TEXT,
    cheque_no      TEXT NOT NULL,
    bank_name      TEXT,
    account_title  TEXT,
    amount_pkr     REAL NOT NULL DEFAULT 0,
    cheque_date    TEXT,
    cheque_type    TEXT NOT NULL DEFAULT 'Post-Dated',
    status         TEXT NOT NULL DEFAULT 'Held',
    received_date  TEXT,
    presented_date TEXT,
    notes          TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    created_by     TEXT NOT NULL,
    modified_at    TEXT,
    modified_by    TEXT
);
CREATE INDEX IF NOT EXISTS idx_matter_cheques_matter ON matter_cheques(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_cheques_org    ON matter_cheques(org_id);

-- Task #158: Opposing Counsel & Judge Intelligence Notes
CREATE TABLE IF NOT EXISTS opposing_counsel (
    counsel_id   TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL,
    name         TEXT NOT NULL,
    bar_no       TEXT,
    firm_name    TEXT,
    phone        TEXT,
    email        TEXT,
    court_preference TEXT,
    known_tactics    TEXT,
    private_notes    TEXT,
    matters_count    INTEGER NOT NULL DEFAULT 0,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL,
    created_by   TEXT NOT NULL,
    modified_at  TEXT,
    modified_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_opposing_counsel_org ON opposing_counsel(org_id);

CREATE TABLE IF NOT EXISTS judge_notes (
    judge_id     TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL,
    name         TEXT NOT NULL,
    court_name   TEXT,
    designation  TEXT,
    known_for    TEXT,
    private_notes TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL,
    created_by   TEXT NOT NULL,
    modified_at  TEXT,
    modified_by  TEXT
);
CREATE INDEX IF NOT EXISTS idx_judge_notes_org ON judge_notes(org_id);

-- ── Feature flags per org (Task #162) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_feature_flags (
    org_id      TEXT NOT NULL REFERENCES organizations(org_id),
    feature     TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    modified_at TEXT NOT NULL DEFAULT (datetime('now')),
    modified_by TEXT NOT NULL DEFAULT 'system',
    PRIMARY KEY (org_id, feature)
);
"""

# Audit columns to add to existing tables (migration-safe)
_AUDIT_COLS = {
    "organizations": [
        ("is_active",   "INTEGER NOT NULL DEFAULT 1"),
        ("created_by",  "TEXT    NOT NULL DEFAULT 'system'"),
        ("modified_at", "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("modified_by", "TEXT    NOT NULL DEFAULT 'system'"),
    ],
    "users": [
        ("is_active",   "INTEGER NOT NULL DEFAULT 1"),
        ("created_by",  "TEXT    NOT NULL DEFAULT 'system'"),
        ("modified_at", "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("modified_by", "TEXT    NOT NULL DEFAULT 'system'"),
    ],
    "categories": [
        ("is_active",   "INTEGER NOT NULL DEFAULT 1"),
        ("created_by",  "TEXT    NOT NULL DEFAULT 'system'"),
        ("modified_at", "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("modified_by", "TEXT    NOT NULL DEFAULT 'system'"),
    ],
    "documents": [
        ("is_active",   "INTEGER NOT NULL DEFAULT 1"),
        ("created_at",  "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("created_by",  "TEXT    NOT NULL DEFAULT 'system'"),
        ("modified_at", "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("modified_by", "TEXT    NOT NULL DEFAULT 'system'"),
    ],
    "permissions": [
        ("is_active",   "INTEGER NOT NULL DEFAULT 1"),
        ("created_at",  "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("created_by",  "TEXT    NOT NULL DEFAULT 'system'"),
        ("modified_at", "TEXT    NOT NULL DEFAULT (datetime('now'))"),
        ("modified_by", "TEXT    NOT NULL DEFAULT 'system'"),
    ],
}


def _run_migrations(conn: sqlite3.Connection):
    """
    Add any missing audit columns to existing tables.
    ALTER TABLE … ADD COLUMN is idempotent via try/except — safe to run every startup.
    """
    for table, cols in _AUDIT_COLS.items():
        for col_name, col_def in cols:
            try:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
            except sqlite3.OperationalError:
                pass  # column already exists

    # WhatsApp number per user — added in Task #26
    try:
        conn.execute("ALTER TABLE users ADD COLUMN whatsapp_number TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists

    # Self-service registration columns — added in Task #41
    _reg_cols = [
        ("slug",           "TEXT"),
        ("phone",          "TEXT"),
        ("city",           "TEXT"),
        ("practice_areas", "TEXT"),  # comma-separated
        ("bar_council_no", "TEXT"),
        ("website",        "TEXT"),
        ("team_size",      "TEXT"),
        ("trial_ends_at",  "TEXT"),
    ]
    for col_name, col_type in _reg_cols:
        try:
            conn.execute(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # column already exists

    # Matter/Client Management — Task #31
    try:
        conn.execute("ALTER TABLE documents ADD COLUMN matter_id TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists

    # Self-service upgrade flow — Task #45
    for _col, _def in [
        ("requested_plan",     "TEXT"),
        ("upgrade_requested_at", "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE organizations ADD COLUMN {_col} {_def}")
        except sqlite3.OperationalError:
            pass

    # Limitation Tracker — Task #132
    for _col, _def in [
        ("limitation_type",       "TEXT"),
        ("cause_of_action_date",  "TEXT"),
        ("limitation_date",       "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE matters ADD COLUMN {_col} {_def}")
        except sqlite3.OperationalError:
            pass

    # Vakalatnama Status — Task #134
    try:
        conn.execute("ALTER TABLE matters ADD COLUMN vakalatnama_status TEXT NOT NULL DEFAULT 'Pending'")
    except sqlite3.OperationalError:
        pass

    # Referral Source — Task #136
    try:
        conn.execute("ALTER TABLE clients ADD COLUMN referral_source TEXT")
    except sqlite3.OperationalError:
        pass

    # Matter Priority — Task #139
    try:
        conn.execute("ALTER TABLE matters ADD COLUMN priority TEXT NOT NULL DEFAULT 'Normal'")
    except sqlite3.OperationalError:
        pass

    # Physical File Reference — Task #151
    for col, defn in [
        ("physical_file_ref", "TEXT"),
        ("rack_no",           "TEXT"),
        ("bundle_no",         "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE matters ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass

    # WHT-Compliant Invoicing — Task #157
    for col, defn in [
        ("wht_rate",    "REAL NOT NULL DEFAULT 0"),
        ("wht_amount",  "REAL NOT NULL DEFAULT 0"),
        ("net_payable", "REAL NOT NULL DEFAULT 0"),
        ("org_ntn",     "TEXT"),
        ("client_ntn",  "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE invoices ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass


def init_db():
    """Create tables if they don't exist, apply migrations, then seed dev data."""
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        _run_migrations(conn)
    _seed_dev_data()


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def check_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


# ── Seed development data ─────────────────────────────────────────────────────

def _seed_dev_data():
    with get_conn() as conn:
        if conn.execute("SELECT 1 FROM organizations LIMIT 1").fetchone():
            return  # already seeded

        conn.execute(
            """INSERT INTO organizations
               (org_id, name, plan, status, max_docs, max_users, industry, created_by, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("acme-legal", "Acme Legal", "pro", "active", 500, 25, "Law Practice", SYSTEM, SYSTEM),
        )
        for row in [
            ("owner-001", "acme-legal", "owner@acmelegal.com", "Firm Owner",   "org_owner", "owner123"),
            ("emp-001",   "acme-legal", "employee@acmelegal.com", "Team Member","employee",  "emp123"),
        ]:
            user_id, org_id, email, name, role, pw = row
            conn.execute(
                """INSERT INTO users
                   (user_id, org_id, email, name, role, password_hash, created_by, modified_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, org_id, email, name, role, hash_password(pw), SYSTEM, SYSTEM),
            )
        for cat_name in ["Contracts", "HR", "Finance", "General"]:
            conn.execute(
                """INSERT INTO categories (category_id, org_id, name, created_by, modified_by)
                   VALUES (?, ?, ?, ?, ?)""",
                (secrets.token_hex(8), "acme-legal", cat_name, SYSTEM, SYSTEM),
            )


# ── Shared audit helpers ──────────────────────────────────────────────────────

def _now() -> str:
    import datetime
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _soft_delete(conn, table: str, pk_col: str, pk_val: str, actor: str):
    conn.execute(
        f"UPDATE {table} SET is_active=0, modified_at=?, modified_by=? WHERE {pk_col}=?",
        (_now(), actor, pk_val),
    )


# ── Organizations ─────────────────────────────────────────────────────────────

def get_org(org_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM organizations WHERE org_id=? AND is_active=1", (org_id,)
        ).fetchone()
        return dict(row) if row else None


# ── Users ─────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email=? AND is_active=1", (email.lower(),)
        ).fetchone()
        return dict(row) if row else None


def get_users_for_org(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT user_id, email, name, role, must_change_password,
                      whatsapp_number,
                      is_active, created_at, created_by, modified_at, modified_by
               FROM users WHERE org_id=? AND is_active=1 ORDER BY created_at""",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_user_by_id(user_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE user_id=? AND is_active=1", (user_id,)
        ).fetchone()
        return dict(row) if row else None


def get_user_by_whatsapp(number: str) -> Optional[dict]:
    """Look up an active user by their WhatsApp number (E.164 format, e.g. +923001234567)."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE whatsapp_number=? AND is_active=1",
            (number.strip(),),
        ).fetchone()
        return dict(row) if row else None


def update_user_whatsapp(user_id: str, number: Optional[str], actor: str = SYSTEM):
    """Set or clear a user's WhatsApp number."""
    with get_conn() as conn:
        conn.execute(
            """UPDATE users SET whatsapp_number=?, modified_at=datetime('now'), modified_by=?
               WHERE user_id=?""",
            (number or None, actor, user_id),
        )


def create_user(
    org_id: str, email: str, name: str, role: str,
    password: str, must_change: bool = False,
    actor: str = SYSTEM,
) -> dict:
    user_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO users
               (user_id, org_id, email, name, role, password_hash,
                must_change_password, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, org_id, email.lower(), name, role,
             hash_password(password), int(must_change),
             now, actor, now, actor),
        )
    return {"user_id": user_id, "org_id": org_id, "email": email, "name": name, "role": role}


def delete_user(user_id: str, actor: str = SYSTEM):
    """Soft-delete a user and their permissions."""
    now = _now()
    with get_conn() as conn:
        _soft_delete(conn, "users", "user_id", user_id, actor)
        conn.execute(
            "UPDATE permissions SET is_active=0, modified_at=?, modified_by=? WHERE user_id=?",
            (now, actor, user_id),
        )


# ── Categories ────────────────────────────────────────────────────────────────

def get_categories(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT category_id, org_id, name,
                      created_at, created_by, modified_at, modified_by
               FROM categories WHERE org_id=? AND is_active=1 ORDER BY name""",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def create_category(org_id: str, name: str, actor: str = SYSTEM) -> dict:
    cat_id = secrets.token_hex(8)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO categories
               (category_id, org_id, name, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (cat_id, org_id, name, now, actor, now, actor),
        )
    return {"category_id": cat_id, "org_id": org_id, "name": name,
            "created_at": now, "created_by": actor}


def delete_category(category_id: str, org_id: str, actor: str = SYSTEM):
    with get_conn() as conn:
        conn.execute(
            "UPDATE categories SET is_active=0, modified_at=?, modified_by=? WHERE category_id=? AND org_id=?",
            (_now(), actor, category_id, org_id),
        )


# ── Documents ─────────────────────────────────────────────────────────────────

def get_documents(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT d.*, c.name AS category_name
               FROM documents d
               LEFT JOIN categories c ON d.category_id = c.category_id
               WHERE d.org_id=? AND d.is_active=1
               ORDER BY d.uploaded_at DESC""",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def create_document(
    org_id: str,
    filename: str,
    size_bytes: int,
    uploaded_by: Optional[str] = None,
    category_id: Optional[str] = None,
    blob_name: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    doc_id = secrets.token_hex(12)
    now    = _now()
    actor  = uploaded_by or actor
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO documents
               (doc_id, org_id, filename, category_id, size_bytes, status,
                blob_name, uploaded_by, uploaded_at,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, org_id, filename, category_id, size_bytes,
             blob_name, uploaded_by, now,
             now, actor, now, actor),
        )
    return {"doc_id": doc_id, "org_id": org_id, "filename": filename,
            "category_id": category_id, "size_bytes": size_bytes,
            "status": "processing", "created_at": now, "created_by": actor}


def update_document_status(doc_id: str, status: str, actor: str = SYSTEM):
    with get_conn() as conn:
        conn.execute(
            "UPDATE documents SET status=?, modified_at=?, modified_by=? WHERE doc_id=?",
            (status, _now(), actor, doc_id),
        )


def delete_document(doc_id: str, org_id: str, actor: str = SYSTEM) -> Optional[dict]:
    """Soft-delete. Returns the row before deletion so the caller can clean up blob + index."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE doc_id=? AND org_id=? AND is_active=1",
            (doc_id, org_id),
        ).fetchone()
        if not row:
            return None
        _soft_delete(conn, "documents", "doc_id", doc_id, actor)
        return dict(row)


def get_doc_counts(org_id: str) -> dict:
    with get_conn() as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM documents WHERE org_id=? AND is_active=1", (org_id,)
        ).fetchone()[0]
        total_bytes = conn.execute(
            "SELECT COALESCE(SUM(size_bytes),0) FROM documents WHERE org_id=? AND is_active=1", (org_id,)
        ).fetchone()[0]
        return {"total_docs": total, "total_bytes": total_bytes}


def get_docs_for_categories(org_id: str, category_ids: list[str]) -> list[dict]:
    """Return active documents for specific categories within an org — full doc record.
    Used both for employee-scoped search filtering and the Employee Portal doc browser."""
    if not category_ids:
        return []
    placeholders = ",".join("?" * len(category_ids))
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT d.doc_id, d.filename, d.category_id, d.size_bytes,
                       d.uploaded_at, d.status, c.name AS category_name
               FROM documents d
               LEFT JOIN categories c ON d.category_id = c.category_id
               WHERE d.org_id=? AND d.is_active=1 AND d.category_id IN ({placeholders})
               ORDER BY d.uploaded_at DESC""",
            [org_id] + list(category_ids),
        ).fetchall()
        return [dict(r) for r in rows]


# ── Permissions ───────────────────────────────────────────────────────────────

def get_permitted_categories(user_id: str) -> list[str]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT category_id FROM permissions WHERE user_id=? AND is_active=1", (user_id,)
        ).fetchall()
        return [r["category_id"] for r in rows]


def set_permissions(user_id: str, category_ids: list[str], actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        # Soft-delete all existing grants for this user
        conn.execute(
            "UPDATE permissions SET is_active=0, modified_at=?, modified_by=? WHERE user_id=?",
            (now, actor, user_id),
        )
        # Re-insert active grants
        for cat_id in category_ids:
            conn.execute(
                """INSERT INTO permissions (user_id, category_id, is_active, created_at, created_by, modified_at, modified_by)
                   VALUES (?, ?, 1, ?, ?, ?, ?)
                   ON CONFLICT(user_id, category_id) DO UPDATE SET
                       is_active=1, modified_at=excluded.modified_at, modified_by=excluded.modified_by""",
                (user_id, cat_id, now, actor, now, actor),
            )


# ── Admin ─────────────────────────────────────────────────────────────────────

# ── Plan configuration ────────────────────────────────────────────────────────
# Single source of truth for all plan limits and pricing.
# Update prices here when ready — they flow to the frontend via /plan-config.
_MB  = 1024 * 1024
_GB  = 1024 * _MB

PLAN_CONFIG: dict[str, dict] = {
    "trial": {
        "label":         "Trial",
        "max_docs":      10,
        "max_users":     2,
        "max_bytes":     30 * _MB,
        "max_searches":  25,           # lifetime total during trial
        "trial_days":    14,
        "price_monthly": 0,
        "price_annual":  0,
        "features": [
            "10 documents",
            "2 users",
            "25 AI searches",
            "30 MB storage",
            "Basic document search",
        ],
    },
    "starter": {
        "label":         "Starter",
        "max_docs":      75,
        "max_users":     5,
        "max_bytes":     1 * _GB,
        "max_searches":  None,         # unlimited
        "trial_days":    None,
        "price_monthly": 5_999,
        "price_annual":  59_999,
        "features": [
            "75 documents",
            "5 users",
            "Unlimited AI searches",
            "1 GB storage",
            "Matter & client management",
            "Document categories",
            "Audit log",
            "Email support (48h)",
        ],
    },
    "pro": {
        "label":         "Pro",
        "max_docs":      500,
        "max_users":     20,
        "max_bytes":     5 * _GB,
        "max_searches":  None,
        "trial_days":    None,
        "price_monthly": 14_999,
        "price_annual":  149_999,
        "features": [
            "500 documents",
            "20 users",
            "Unlimited AI searches",
            "5 GB storage",
            "All Starter features",
            "WhatsApp integration",
            "Court calendar & reminders",
            "Priority support (24h)",
        ],
    },
    "enterprise": {
        "label":         "Enterprise",
        "max_docs":      9_999_999,
        "max_users":     9_999_999,
        "max_bytes":     25 * _GB,
        "max_searches":  None,
        "trial_days":    None,
        "price_monthly": 34_999,
        "price_annual":  349_999,
        "features": [
            "Unlimited documents",
            "Unlimited users",
            "Unlimited AI searches",
            "25 GB storage",
            "All Pro features",
            "PLD/SCMR case law search",
            "Document drafting templates",
            "Client portal",
            "Dedicated onboarding",
            "WhatsApp direct support (4h)",
        ],
    },
    # Legacy alias — existing "free" orgs keep working
    "free": {
        "label":         "Trial",
        "max_docs":      10,
        "max_users":     2,
        "max_bytes":     30 * _MB,
        "max_searches":  25,
        "trial_days":    14,
        "price_monthly": 0,
        "price_annual":  0,
        "features":      [],
    },
}

# Keep backward-compat alias used by admin helpers
PLAN_DEFAULTS = {k: {"max_docs": v["max_docs"], "max_users": v["max_users"]} for k, v in PLAN_CONFIG.items()}


def get_all_orgs() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT
                o.*,
                COUNT(DISTINCT CASE WHEN u.is_active=1 THEN u.user_id END) AS user_count,
                COUNT(DISTINCT CASE WHEN d.is_active=1 THEN d.doc_id  END) AS doc_count,
                COALESCE(SUM(CASE WHEN d.is_active=1 THEN d.size_bytes ELSE 0 END), 0) AS total_bytes
            FROM organizations o
            LEFT JOIN users     u ON u.org_id = o.org_id
            LEFT JOIN documents d ON d.org_id = o.org_id
            WHERE o.is_active = 1
            GROUP BY o.org_id
            ORDER BY o.created_at DESC
        """).fetchall()
        return [dict(r) for r in rows]


def create_org(name: str, plan: str = "free", industry: str = "Other", actor: str = SYSTEM) -> dict:
    org_id = secrets.token_hex(8)
    limits = PLAN_DEFAULTS.get(plan, PLAN_DEFAULTS["free"])
    now    = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO organizations
               (org_id, name, plan, status, max_docs, max_users, industry,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)""",
            (org_id, name, plan, limits["max_docs"], limits["max_users"],
             industry, now, actor, now, actor),
        )
    return {"org_id": org_id, "name": name, "plan": plan, "status": "active",
            "industry": industry, "created_at": now, "created_by": actor, **limits}


def update_org(org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"name", "plan", "status", "max_docs", "max_users", "industry"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_org(org_id)
    if "plan" in updates and "max_docs" not in updates:
        limits = PLAN_DEFAULTS.get(updates["plan"], PLAN_DEFAULTS["free"])
        updates["max_docs"]  = limits["max_docs"]
        updates["max_users"] = limits["max_users"]
    updates["modified_at"] = _now()
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE organizations SET {set_clause} WHERE org_id=?",
            (*updates.values(), org_id),
        )
    return get_org(org_id)


def delete_org(org_id: str, actor: str = SYSTEM):
    """Hard-delete everything for an org (admin purge — intentionally irreversible)."""
    with get_conn() as conn:
        # Cascade Task #31 tables (must happen before documents/users)
        conn.execute("UPDATE documents SET matter_id=NULL WHERE org_id=?", (org_id,))
        conn.execute(
            "DELETE FROM matter_team_members WHERE team_id IN "
            "(SELECT team_id FROM matter_teams WHERE org_id=?)", (org_id,),
        )
        conn.execute("DELETE FROM matters       WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM matter_teams  WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM clients       WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM custom_courts WHERE org_id=?", (org_id,))
        conn.execute(
            "DELETE FROM permissions WHERE user_id IN (SELECT user_id FROM users WHERE org_id=?)",
            (org_id,),
        )
        conn.execute("DELETE FROM documents    WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM categories   WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM users        WHERE org_id=?", (org_id,))
        conn.execute("DELETE FROM organizations WHERE org_id=?", (org_id,))


def get_org_details(org_id: str) -> Optional[dict]:
    org = get_org(org_id)
    if not org:
        return None
    with get_conn() as conn:
        users = conn.execute(
            """SELECT user_id, name, email, role,
                      created_at, created_by, modified_at, modified_by
               FROM users WHERE org_id=? AND is_active=1 ORDER BY created_at""",
            (org_id,),
        ).fetchall()
        docs = conn.execute(
            """SELECT doc_id, filename, size_bytes, status,
                      uploaded_at, created_by, modified_at, modified_by
               FROM documents WHERE org_id=? AND is_active=1 ORDER BY uploaded_at DESC""",
            (org_id,),
        ).fetchall()
    org["users"]     = [dict(u) for u in users]
    org["documents"] = [dict(d) for d in docs]
    return org


# ── Self-service Registration ─────────────────────────────────────────────────

def _slugify(name: str) -> str:
    """Convert firm name to URL-safe slug. 'Khan & Associates' → 'khan-associates'"""
    slug = name.lower().strip()
    slug = re.sub(r"[&+]", "and", slug)
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    if not slug:
        slug = "firm-" + secrets.token_hex(3)
    return slug


def _unique_slug(conn: sqlite3.Connection, base_slug: str) -> str:
    """Append -2, -3, etc. until the slug is unique as an org_id."""
    slug = base_slug
    n = 2
    while conn.execute("SELECT 1 FROM organizations WHERE org_id=?", (slug,)).fetchone():
        slug = f"{base_slug}-{n}"
        n += 1
    return slug


def register_org(
    firm_name: str,
    owner_name: str,
    owner_email: str,
    password: str,
    city: str = "",
    phone: str = "",
    plan: str = "pro",
) -> dict:
    """Public self-service registration. Creates org (pending_payment) + owner user."""
    now    = _now()
    limits = PLAN_DEFAULTS.get(plan, PLAN_DEFAULTS["pro"])
    with get_conn() as conn:
        base_slug = _slugify(firm_name)
        org_id    = _unique_slug(conn, base_slug)
        conn.execute(
            """INSERT INTO organizations
               (org_id, name, plan, status, max_docs, max_users, industry,
                slug, phone, city,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, 'pending_payment', ?, ?, 'Law Practice',
                       ?, ?, ?,
                       ?, 'system', ?, 'system')""",
            (org_id, firm_name, plan,
             limits["max_docs"], limits["max_users"],
             org_id, phone.strip(), city.strip(),
             now, now),
        )
        user_id = secrets.token_hex(10)
        conn.execute(
            """INSERT INTO users
               (user_id, org_id, email, name, role, password_hash,
                must_change_password, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, 'org_owner', ?, 0, ?, 'system', ?, 'system')""",
            (user_id, org_id, owner_email.lower().strip(), owner_name,
             hash_password(password), now, now),
        )
    return {
        "org_id":      org_id,
        "name":        firm_name,
        "plan":        plan,
        "status":      "pending_payment",
        "owner_email": owner_email,
    }


def get_pending_registrations() -> list[dict]:
    """Return all orgs awaiting payment/manual verification."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT o.*,
                      u.name  AS owner_name,
                      u.email AS owner_email,
                      u.user_id AS owner_id
               FROM organizations o
               LEFT JOIN users u
                   ON u.org_id = o.org_id
                   AND u.role = 'org_owner'
                   AND u.is_active = 1
               WHERE o.is_active = 1 AND o.status = 'pending_payment'
               ORDER BY o.created_at DESC"""
        ).fetchall()
        return [dict(r) for r in rows]


def approve_registration(org_id: str, actor: str = SYSTEM) -> Optional[dict]:
    """Flip org status from pending_payment → active."""
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """UPDATE organizations
               SET status='active', modified_at=?, modified_by=?
               WHERE org_id=? AND status='pending_payment'""",
            (now, actor, org_id),
        )
    return get_org(org_id)


def update_org_profile(org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    """Update optional profile fields on the org row."""
    allowed = {"phone", "city", "practice_areas", "bar_council_no", "website", "team_size"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return get_org(org_id)
    updates["modified_at"] = _now()
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE organizations SET {set_clause} WHERE org_id=?",
            (*updates.values(), org_id),
        )
    return get_org(org_id)


# ── Clients ───────────────────────────────────────────────────────────────────

def get_clients(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT c.*,
                      COUNT(DISTINCT CASE WHEN m.is_active=1 THEN m.matter_id END) AS matter_count
               FROM clients c
               LEFT JOIN matters m ON m.client_id = c.client_id
               WHERE c.org_id=? AND c.is_active=1
               GROUP BY c.client_id
               ORDER BY c.name""",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


REFERRAL_SOURCES = (
    "Walk-in", "Referral – Existing Client", "Referral – Colleague",
    "Bar Association", "Online / Website", "Social Media", "WhatsApp", "Other",
)

def create_client(
    org_id: str, name: str, client_type: str = "Individual",
    email: Optional[str] = None, phone: Optional[str] = None,
    address: Optional[str] = None, cnic_ntn: Optional[str] = None,
    notes: Optional[str] = None,
    referral_source: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    client_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO clients
               (client_id, org_id, name, client_type, email, phone, address, cnic_ntn, notes,
                referral_source, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (client_id, org_id, name, client_type, email, phone, address, cnic_ntn, notes,
             referral_source, now, actor, now, actor),
        )
    return {"client_id": client_id, "org_id": org_id, "name": name,
            "client_type": client_type, "created_at": now, "matter_count": 0}


def update_client(client_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"name", "client_type", "email", "phone", "address", "cnic_ntn", "notes", "referral_source"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_client_with_matters(client_id, org_id)
    updates["modified_at"] = _now()
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE clients SET {set_clause} WHERE client_id=? AND org_id=?",
            (*updates.values(), client_id, org_id),
        )
    return get_client_with_matters(client_id, org_id)


def delete_client(client_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        # Soft-delete all matters for this client first
        conn.execute(
            "UPDATE matters SET is_active=0, modified_at=?, modified_by=? WHERE client_id=? AND org_id=?",
            (now, actor, client_id, org_id),
        )
        conn.execute(
            "UPDATE clients SET is_active=0, modified_at=?, modified_by=? WHERE client_id=? AND org_id=?",
            (now, actor, client_id, org_id),
        )


def get_client_with_matters(client_id: str, org_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM clients WHERE client_id=? AND org_id=? AND is_active=1",
            (client_id, org_id),
        ).fetchone()
        if not row:
            return None
        client = dict(row)
        matters = conn.execute(
            """SELECT m.*, t.name AS team_name
               FROM matters m
               LEFT JOIN matter_teams t ON t.team_id = m.team_id
               WHERE m.client_id=? AND m.org_id=? AND m.is_active=1
               ORDER BY m.created_at DESC""",
            (client_id, org_id),
        ).fetchall()
        client["matters"] = [dict(m) for m in matters]
    return client


# ── Matter Teams ──────────────────────────────────────────────────────────────

def get_matter_teams(org_id: str) -> list[dict]:
    with get_conn() as conn:
        teams = conn.execute(
            "SELECT * FROM matter_teams WHERE org_id=? AND is_active=1 ORDER BY name",
            (org_id,),
        ).fetchall()
        result = []
        for t in teams:
            members = conn.execute(
                """SELECT u.user_id, u.name FROM matter_team_members mtm
                   JOIN users u ON u.user_id = mtm.user_id
                   WHERE mtm.team_id=? AND mtm.is_active=1 AND u.is_active=1""",
                (t["team_id"],),
            ).fetchall()
            d = dict(t)
            d["members"] = [dict(m) for m in members]
            result.append(d)
    return result


def create_matter_team(org_id: str, name: str, actor: str = SYSTEM) -> dict:
    team_id = secrets.token_hex(8)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matter_teams (team_id, org_id, name, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (team_id, org_id, name, now, actor, now, actor),
        )
    return {"team_id": team_id, "org_id": org_id, "name": name, "members": [], "created_at": now}


def update_matter_team(team_id: str, org_id: str, name: str, actor: str = SYSTEM) -> Optional[dict]:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_teams SET name=?, modified_at=?, modified_by=? WHERE team_id=? AND org_id=?",
            (name, now, actor, team_id, org_id),
        )
    rows = get_matter_teams(org_id)
    return next((t for t in rows if t["team_id"] == team_id), None)


def delete_matter_team(team_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matters SET team_id=NULL, modified_at=?, modified_by=? WHERE team_id=? AND org_id=?",
            (now, actor, team_id, org_id),
        )
        conn.execute(
            "UPDATE matter_team_members SET is_active=0, modified_at=?, modified_by=? WHERE team_id=?",
            (now, actor, team_id),
        )
        conn.execute(
            "UPDATE matter_teams SET is_active=0, modified_at=?, modified_by=? WHERE team_id=? AND org_id=?",
            (now, actor, team_id, org_id),
        )


def add_matter_team_member(team_id: str, user_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matter_team_members
               (team_id, user_id, is_active, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, 1, ?, ?, ?, ?)
               ON CONFLICT(team_id, user_id) DO UPDATE SET
                   is_active=1, modified_at=excluded.modified_at, modified_by=excluded.modified_by""",
            (team_id, user_id, now, actor, now, actor),
        )


def remove_matter_team_member(team_id: str, user_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_team_members SET is_active=0, modified_at=?, modified_by=? WHERE team_id=? AND user_id=?",
            (now, actor, team_id, user_id),
        )


# ── Custom Courts ─────────────────────────────────────────────────────────────

def get_custom_courts(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM custom_courts WHERE org_id=? AND is_active=1 ORDER BY name",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def add_custom_court(org_id: str, name: str, actor: str = SYSTEM) -> dict:
    court_id = secrets.token_hex(8)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO custom_courts
               (court_id, org_id, name, created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (court_id, org_id, name, now, actor, now, actor),
        )
    return {"court_id": court_id, "org_id": org_id, "name": name}


def delete_custom_court(court_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE custom_courts SET is_active=0, modified_at=?, modified_by=? WHERE court_id=? AND org_id=?",
            (now, actor, court_id, org_id),
        )


# ── Matters ───────────────────────────────────────────────────────────────────

def get_matters(org_id: str, client_id: Optional[str] = None) -> list[dict]:
    where = "m.org_id=? AND m.is_active=1"
    params: list = [org_id]
    if client_id:
        where += " AND m.client_id=?"
        params.append(client_id)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT m.*, c.name AS client_name, t.name AS team_name,
                       COUNT(DISTINCT CASE WHEN d.is_active=1 THEN d.doc_id END) AS doc_count,
                       COUNT(DISTINCT CASE WHEN co.outcome='Adjourned' AND co.is_active=1 THEN co.order_id END) AS adjournment_count
                FROM matters m
                LEFT JOIN clients c ON c.client_id = m.client_id
                LEFT JOIN matter_teams t ON t.team_id = m.team_id
                LEFT JOIN documents d ON d.matter_id = m.matter_id
                LEFT JOIN court_orders co ON co.matter_id = m.matter_id
                WHERE {where}
                GROUP BY m.matter_id
                ORDER BY m.created_at DESC""",
            params,
        ).fetchall()
        return [dict(r) for r in rows]


VAKALATNAMA_STATUSES = ("Not Required", "Pending", "Filed")
MATTER_PRIORITIES    = ("Urgent", "High", "Normal", "Low")

def create_matter(
    org_id: str, client_id: str, title: str, matter_type: str,
    status: str = "Active", court_name: Optional[str] = None,
    case_number: Optional[str] = None, filing_date: Optional[str] = None,
    opposing_party: Optional[str] = None, team_id: Optional[str] = None,
    notes: Optional[str] = None,
    limitation_type: Optional[str] = None,
    cause_of_action_date: Optional[str] = None,
    limitation_date: Optional[str] = None,
    vakalatnama_status: str = "Pending",
    priority: str = "Normal",
    actor: str = SYSTEM,
) -> dict:
    matter_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matters
               (matter_id, org_id, client_id, title, matter_type, status,
                court_name, case_number, filing_date, opposing_party, team_id, notes,
                limitation_type, cause_of_action_date, limitation_date,
                vakalatnama_status, priority,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (matter_id, org_id, client_id, title, matter_type, status,
             court_name, case_number, filing_date, opposing_party, team_id, notes,
             limitation_type, cause_of_action_date, limitation_date,
             vakalatnama_status, priority,
             now, actor, now, actor),
        )
    return {"matter_id": matter_id, "org_id": org_id, "client_id": client_id,
            "title": title, "matter_type": matter_type, "status": status, "created_at": now}


def update_matter(matter_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"title", "matter_type", "status", "court_name", "case_number",
               "filing_date", "opposing_party", "team_id", "notes", "client_id",
               "limitation_type", "cause_of_action_date", "limitation_date",
               "vakalatnama_status", "priority",
               "physical_file_ref", "rack_no", "bundle_no"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_matter_with_docs(matter_id, org_id)
    updates["modified_at"] = _now()
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matters SET {set_clause} WHERE matter_id=? AND org_id=?",
            (*updates.values(), matter_id, org_id),
        )
    return get_matter_with_docs(matter_id, org_id)


def delete_matter(matter_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE documents SET matter_id=NULL, modified_at=?, modified_by=? WHERE matter_id=? AND org_id=?",
            (now, actor, matter_id, org_id),
        )
        conn.execute(
            "UPDATE matters SET is_active=0, modified_at=?, modified_by=? WHERE matter_id=? AND org_id=?",
            (now, actor, matter_id, org_id),
        )


def get_matter_with_docs(matter_id: str, org_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT m.*, c.name AS client_name, t.name AS team_name,
                      (SELECT COUNT(*) FROM court_orders co
                       WHERE co.matter_id=m.matter_id AND co.outcome='Adjourned' AND co.is_active=1
                      ) AS adjournment_count
               FROM matters m
               LEFT JOIN clients c ON c.client_id = m.client_id
               LEFT JOIN matter_teams t ON t.team_id = m.team_id
               WHERE m.matter_id=? AND m.org_id=? AND m.is_active=1""",
            (matter_id, org_id),
        ).fetchone()
        if not row:
            return None
        matter = dict(row)
        docs = conn.execute(
            """SELECT d.*, cat.name AS category_name
               FROM documents d
               LEFT JOIN categories cat ON cat.category_id = d.category_id
               WHERE d.matter_id=? AND d.org_id=? AND d.is_active=1
               ORDER BY cat.name, d.uploaded_at DESC""",
            (matter_id, org_id),
        ).fetchall()
        matter["documents"] = [dict(d) for d in docs]
    return matter


def link_document_to_matter(doc_id: str, matter_id: str, org_id: str,
                             actor: str = SYSTEM) -> bool:
    now = _now()
    with get_conn() as conn:
        result = conn.execute(
            "SELECT doc_id FROM documents WHERE doc_id=? AND org_id=? AND is_active=1",
            (doc_id, org_id),
        ).fetchone()
        if not result:
            return False
        conn.execute(
            "UPDATE documents SET matter_id=?, modified_at=?, modified_by=? WHERE doc_id=? AND org_id=?",
            (matter_id, now, actor, doc_id, org_id),
        )
    return True


def unlink_document_from_matter(doc_id: str, org_id: str,
                                actor: str = SYSTEM) -> bool:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE documents SET matter_id=NULL, modified_at=?, modified_by=? WHERE doc_id=? AND org_id=?",
            (now, actor, doc_id, org_id),
        )
    return True


def search_matters_by_keyword(org_id: str, keyword: str) -> list[dict]:
    """Full-text search on matter title, case_number, and client name.
    Returns up to 10 matches ordered by relevance (exact first, then partial)."""
    kw = keyword.strip().lower()
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT m.matter_id, m.title, m.status, m.case_number,
                      m.court_name, m.matter_type, c.name AS client_name
               FROM matters m
               LEFT JOIN clients c ON c.client_id = m.client_id
               WHERE m.org_id=? AND m.is_active=1
                 AND (lower(m.title) LIKE ? OR lower(m.case_number) LIKE ?
                      OR lower(c.name) LIKE ?)
               ORDER BY
                   CASE WHEN lower(m.title) = ? THEN 0
                        WHEN lower(m.title) LIKE ? THEN 1
                        ELSE 2 END,
                   m.title
               LIMIT 10""",
            (org_id, f"%{kw}%", f"%{kw}%", f"%{kw}%", kw, f"{kw}%"),
        ).fetchall()
    return [dict(r) for r in rows]


def get_filenames_for_matter(matter_id: str, org_id: str) -> list[str]:
    """Return list of filenames (blob names) for documents linked to a matter."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT filename FROM documents
               WHERE matter_id=? AND org_id=? AND is_active=1 AND status='ready'""",
            (matter_id, org_id),
        ).fetchall()
    return [r["filename"] for r in rows]


# ── Upgrade Requests ──────────────────────────────────────────────────────────

def create_upgrade_request(
    org_id: str,
    current_plan: str,
    requested_plan: str,
    payment_ref: str | None = None,
    notes: str | None = None,
) -> dict:
    """
    Create a pending upgrade request and mark the org with requested_plan.
    Returns the new request record.
    """
    request_id = str(uuid.uuid4())
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO upgrade_requests
                (request_id, org_id, current_plan, requested_plan, status, payment_ref, notes, created_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (request_id, org_id, current_plan, requested_plan, "pending", payment_ref, notes, now),
        )
        # Mark org so the admin badge shows immediately
        conn.execute(
            "UPDATE organizations SET requested_plan=?, upgrade_requested_at=? WHERE org_id=?",
            (requested_plan, now, org_id),
        )
    return {
        "request_id":     request_id,
        "org_id":         org_id,
        "current_plan":   current_plan,
        "requested_plan": requested_plan,
        "status":         "pending",
        "created_at":     now,
    }


def get_upgrade_requests(status: str | None = None) -> list[dict]:
    """Return all upgrade requests, optionally filtered by status."""
    where = "WHERE r.status = ?" if status else ""
    params = [status] if status else []
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT r.*, o.name AS org_name, o.plan AS org_current_plan
            FROM upgrade_requests r
            JOIN organizations o ON r.org_id = o.org_id
            {where}
            ORDER BY r.created_at DESC
            """,
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def resolve_upgrade_request(
    request_id: str,
    action: str,      # "approved" or "rejected"
    resolver: str,    # user_id or email of admin
) -> dict | None:
    now = _now()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM upgrade_requests WHERE request_id=?", (request_id,)
        ).fetchone()
        if not row:
            return None

        row = dict(row)
        conn.execute(
            "UPDATE upgrade_requests SET status=?, resolved_at=?, resolved_by=? WHERE request_id=?",
            (action, now, resolver, request_id),
        )

        if action == "approved":
            new_plan = row["requested_plan"]
            limits   = PLAN_DEFAULTS.get(new_plan, PLAN_DEFAULTS["starter"])
            conn.execute(
                """UPDATE organizations
                   SET plan=?, max_docs=?, max_users=?,
                       requested_plan=NULL, upgrade_requested_at=NULL,
                       status='active', modified_at=?, modified_by=?
                   WHERE org_id=?""",
                (new_plan, limits["max_docs"], limits["max_users"],
                 now, resolver, row["org_id"]),
            )
        else:
            # On reject, just clear the pending flag
            conn.execute(
                "UPDATE organizations SET requested_plan=NULL, upgrade_requested_at=NULL WHERE org_id=?",
                (row["org_id"],),
            )

    return {**row, "status": action, "resolved_at": now, "resolved_by": resolver}


# ── Audit Log ─────────────────────────────────────────────────────────────────

def log_event(
    event_type:    str,
    org_id:        str | None = None,
    user_id:       str | None = None,
    actor_name:    str | None = None,
    actor_role:    str | None = None,
    resource_type: str | None = None,
    resource_id:   str | None = None,
    resource_name: str | None = None,
    details:       dict | None = None,
    ip_address:    str | None = None,
) -> None:
    """
    Write one audit event. Safe to call fire-and-forget — errors are swallowed
    so a logging failure never breaks the main request.
    """
    import json as _json
    log_id       = str(uuid.uuid4())
    details_json = _json.dumps(details) if details else None
    try:
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs
                    (log_id, org_id, user_id, actor_name, actor_role,
                     event_type, resource_type, resource_id, resource_name,
                     details, ip_address)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                """,
                (log_id, org_id, user_id, actor_name, actor_role,
                 event_type, resource_type, resource_id, resource_name,
                 details_json, ip_address),
            )
    except Exception:
        pass  # never surface logging errors to callers


def get_audit_logs(
    org_id:     str | None = None,  # None = all orgs (admin view)
    event_type: str | None = None,
    user_id:    str | None = None,
    date_from:  str | None = None,  # ISO date string "YYYY-MM-DD"
    date_to:    str | None = None,
    limit:      int = 200,
    offset:     int = 0,
) -> list[dict]:
    clauses: list[str] = []
    params:  list      = []

    if org_id:
        clauses.append("org_id = ?"); params.append(org_id)
    if event_type:
        clauses.append("event_type = ?"); params.append(event_type)
    if user_id:
        clauses.append("user_id = ?"); params.append(user_id)
    if date_from:
        clauses.append("created_at >= ?"); params.append(date_from + " 00:00:00")
    if date_to:
        clauses.append("created_at <= ?"); params.append(date_to + " 23:59:59")

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    params += [limit, offset]

    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT log_id, org_id, user_id, actor_name, actor_role,
                   event_type, resource_type, resource_id, resource_name,
                   details, ip_address, created_at
            FROM   audit_logs
            {where}
            ORDER  BY created_at DESC
            LIMIT  ? OFFSET ?
            """,
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def count_audit_logs(
    org_id:     str | None = None,
    event_type: str | None = None,
    user_id:    str | None = None,
    date_from:  str | None = None,
    date_to:    str | None = None,
) -> int:
    clauses: list[str] = []
    params:  list      = []

    if org_id:
        clauses.append("org_id = ?"); params.append(org_id)
    if event_type:
        clauses.append("event_type = ?"); params.append(event_type)
    if user_id:
        clauses.append("user_id = ?"); params.append(user_id)
    if date_from:
        clauses.append("created_at >= ?"); params.append(date_from + " 00:00:00")
    if date_to:
        clauses.append("created_at <= ?"); params.append(date_to + " 23:59:59")

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    with get_conn() as conn:
        return conn.execute(
            f"SELECT COUNT(*) FROM audit_logs {where}", params
        ).fetchone()[0]


# ── Fees ──────────────────────────────────────────────────────────────────────

def get_fees(org_id: str, matter_id: Optional[str] = None) -> list[dict]:
    clauses = ["f.org_id=?", "f.is_active=1"]
    params: list = [org_id]
    if matter_id:
        clauses.append("f.matter_id=?"); params.append(matter_id)
    where = "WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT f.*, m.title AS matter_title
                FROM fees f
                LEFT JOIN matters m ON m.matter_id = f.matter_id AND m.is_active=1
                {where} ORDER BY f.fee_date DESC""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def create_fee(
    org_id: str, description: str, fee_date: str, amount: int,
    matter_id: Optional[str] = None,
    fee_type: str = "Consultation",
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    now = _now()
    fid = "fee_" + secrets.token_hex(8)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO fees
               (fee_id,org_id,matter_id,description,fee_type,amount,fee_date,
                notes,created_at,created_by,modified_at,modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (fid, org_id, matter_id or None, description, fee_type, amount, fee_date,
             notes or None, now, actor, now, actor),
        )
    return get_fee(fid)  # type: ignore[return-value]


def get_fee(fee_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT f.*, m.title AS matter_title
               FROM fees f LEFT JOIN matters m ON m.matter_id=f.matter_id
               WHERE f.fee_id=? AND f.is_active=1""",
            (fee_id,),
        ).fetchone()
    return dict(row) if row else None


def update_fee(fee_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"description", "fee_type", "amount", "fee_date", "notes", "is_paid",
               "paid_at", "invoice_id", "matter_id"}
    sets = {k: v for k, v in fields.items() if k in allowed}
    if not sets:
        return get_fee(fee_id)
    sets["modified_at"] = _now()
    sets["modified_by"] = actor
    cols = ", ".join(f"{k}=?" for k in sets)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE fees SET {cols} WHERE fee_id=? AND org_id=?",
            (*sets.values(), fee_id, org_id),
        )
    return get_fee(fee_id)


def delete_fee(fee_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE fees SET is_active=0, modified_at=?, modified_by=? WHERE fee_id=? AND org_id=?",
            (now, actor, fee_id, org_id),
        )


# ── Invoices ──────────────────────────────────────────────────────────────────

def _next_invoice_number(org_id: str, conn: sqlite3.Connection) -> str:
    """Generate next sequential invoice number for this org: INV-YYYY-NNN."""
    import datetime as _dt
    year = _dt.datetime.utcnow().year
    row = conn.execute(
        "SELECT COUNT(*) FROM invoices WHERE org_id=? AND invoice_number LIKE ?",
        (org_id, f"INV-{year}-%"),
    ).fetchone()
    seq = (row[0] if row else 0) + 1
    return f"INV-{year}-{str(seq).zfill(3)}"


def compute_wht(gross: float, client_type: str) -> tuple[float, float, float]:
    """Return (wht_rate, wht_amount, net_payable).
    Pakistan Income Tax Ordinance 2001 §153: 6% WHT on company payments to lawyers.
    Individual clients are exempt from WHT deduction obligation.
    """
    if client_type == "Corporate":
        rate = 0.06
    else:
        rate = 0.0
    wht_amount = round(gross * rate, 2)
    net_payable = round(gross - wht_amount, 2)
    return rate, wht_amount, net_payable


def create_invoice(
    org_id: str, matter_id: str, title: str, issued_date: str,
    client_id: Optional[str] = None,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    """Create an invoice and link all unbilled fees for the matter to it.
    WHT (6%) is auto-applied for Corporate clients per Income Tax Ordinance 2001 §153.
    """
    now  = _now()
    inv_id = "inv_" + secrets.token_hex(8)
    with get_conn() as conn:
        inv_num = _next_invoice_number(org_id, conn)
        # Sum unbilled fees for the matter
        row = conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM fees WHERE matter_id=? AND org_id=? AND is_active=1 AND invoice_id IS NULL",
            (matter_id, org_id),
        ).fetchone()
        total = float(row[0]) if row else 0.0
        # Lookup client_type for WHT
        client_type = "Individual"
        client_ntn: Optional[str] = None
        if client_id:
            cr = conn.execute("SELECT client_type, cnic_ntn FROM clients WHERE client_id=?", (client_id,)).fetchone()
            if cr:
                client_type = cr["client_type"]
                client_ntn = cr["cnic_ntn"]
        # Lookup org NTN
        org_ntn: Optional[str] = None
        or_ = conn.execute("SELECT bar_council_no FROM organizations WHERE org_id=?", (org_id,)).fetchone()
        if or_:
            org_ntn = or_["bar_council_no"]
        wht_rate, wht_amount, net_payable = compute_wht(total, client_type)
        conn.execute(
            """INSERT INTO invoices
               (invoice_id,org_id,matter_id,client_id,invoice_number,title,
                issued_date,due_date,total_amount,notes,
                wht_rate,wht_amount,net_payable,org_ntn,client_ntn,
                created_at,created_by,modified_at,modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (inv_id, org_id, matter_id, client_id or None, inv_num, title,
             issued_date, due_date or None, total, notes or None,
             wht_rate, wht_amount, net_payable, org_ntn, client_ntn,
             now, actor, now, actor),
        )
        # Link all unbilled fees for this matter
        conn.execute(
            "UPDATE fees SET invoice_id=?, modified_at=?, modified_by=? WHERE matter_id=? AND org_id=? AND is_active=1 AND invoice_id IS NULL",
            (inv_id, now, actor, matter_id, org_id),
        )
    return get_invoice_with_fees(inv_id)  # type: ignore[return-value]


def get_invoices(org_id: str, matter_id: Optional[str] = None) -> list[dict]:
    clauses = ["i.org_id=?", "i.is_active=1"]
    params: list = [org_id]
    if matter_id:
        clauses.append("i.matter_id=?"); params.append(matter_id)
    where = "WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT i.*,
                       m.title AS matter_title, m.case_number,
                       c.name  AS client_name
                FROM invoices i
                LEFT JOIN matters m ON m.matter_id = i.matter_id
                LEFT JOIN clients c ON c.client_id = i.client_id
                {where} ORDER BY i.issued_date DESC""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def get_invoice_with_fees(invoice_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT i.*,
                      m.title AS matter_title, m.case_number, m.court_name AS matter_court,
                      c.name  AS client_name,  c.email AS client_email, c.phone AS client_phone
               FROM invoices i
               LEFT JOIN matters m ON m.matter_id = i.matter_id
               LEFT JOIN clients c ON c.client_id = i.client_id
               WHERE i.invoice_id=? AND i.is_active=1""",
            (invoice_id,),
        ).fetchone()
        if not row:
            return None
        inv = dict(row)
        fee_rows = conn.execute(
            "SELECT * FROM fees WHERE invoice_id=? AND is_active=1 ORDER BY fee_date",
            (invoice_id,),
        ).fetchall()
        inv["fees"] = [dict(f) for f in fee_rows]
    return inv


def update_invoice(invoice_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"title", "status", "due_date", "notes", "total_amount"}
    sets = {k: v for k, v in fields.items() if k in allowed}
    if not sets:
        return get_invoice_with_fees(invoice_id)
    sets["modified_at"] = _now()
    sets["modified_by"] = actor
    cols = ", ".join(f"{k}=?" for k in sets)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE invoices SET {cols} WHERE invoice_id=? AND org_id=?",
            (*sets.values(), invoice_id, org_id),
        )
    # If marking paid, mark all linked fees as paid too
    if fields.get("status") == "paid":
        now = _now()
        with get_conn() as conn:
            conn.execute(
                "UPDATE fees SET is_paid=1, paid_at=?, modified_at=?, modified_by=? WHERE invoice_id=? AND org_id=?",
                (now, now, actor, invoice_id, org_id),
            )
    return get_invoice_with_fees(invoice_id)


# ── Hearings ──────────────────────────────────────────────────────────────────

def get_hearings(org_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> list[dict]:
    clauses = ["h.org_id=?", "h.is_active=1"]
    params: list = [org_id]
    if from_date:
        clauses.append("h.hearing_date >= ?"); params.append(from_date)
    if to_date:
        clauses.append("h.hearing_date <= ?"); params.append(to_date)
    where = "WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT h.*, m.title AS matter_title, m.case_number
                FROM hearings h
                LEFT JOIN matters m ON m.matter_id = h.matter_id AND m.is_active=1
                {where} ORDER BY h.hearing_date, h.hearing_time""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def create_hearing(
    org_id: str, title: str, hearing_date: str,
    matter_id: Optional[str] = None, hearing_time: Optional[str] = None,
    court_name: Optional[str] = None, judge_name: Optional[str] = None,
    notes: Optional[str] = None, wa_reminder: bool = False,
    actor: str = SYSTEM,
) -> dict:
    now = _now()
    hid = "hrg_" + secrets.token_hex(8)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO hearings
               (hearing_id,org_id,matter_id,title,hearing_date,hearing_time,
                court_name,judge_name,notes,wa_reminder,
                created_at,created_by,modified_at,modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (hid, org_id, matter_id or None, title, hearing_date, hearing_time,
             court_name or None, judge_name or None, notes or None,
             1 if wa_reminder else 0, now, actor, now, actor),
        )
    return get_hearing(hid)  # type: ignore[return-value]


def get_hearing(hearing_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT h.*, m.title AS matter_title, m.case_number
               FROM hearings h
               LEFT JOIN matters m ON m.matter_id = h.matter_id
               WHERE h.hearing_id=? AND h.is_active=1""",
            (hearing_id,),
        ).fetchone()
    return dict(row) if row else None


def update_hearing(hearing_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"title", "hearing_date", "hearing_time", "matter_id",
               "court_name", "judge_name", "notes", "wa_reminder"}
    sets = {k: v for k, v in fields.items() if k in allowed}
    if not sets:
        return get_hearing(hearing_id)
    sets["modified_at"] = _now()
    sets["modified_by"] = actor
    cols = ", ".join(f"{k}=?" for k in sets)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE hearings SET {cols} WHERE hearing_id=? AND org_id=?",
            (*sets.values(), hearing_id, org_id),
        )
    return get_hearing(hearing_id)


def delete_hearing(hearing_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE hearings SET is_active=0, modified_at=?, modified_by=? WHERE hearing_id=? AND org_id=?",
            (now, actor, hearing_id, org_id),
        )


def get_hearings_needing_reminder() -> list[dict]:
    """Return hearings with wa_reminder=1 and reminder_sent=0, due within next 25 hours."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT h.*, o.org_id,
                      u.whatsapp_number AS owner_wa, u.name AS owner_name,
                      u.email AS owner_email
               FROM hearings h
               JOIN organizations o ON o.org_id = h.org_id AND o.is_active=1
               JOIN users u ON u.org_id = h.org_id AND u.role='org_owner' AND u.is_active=1
               WHERE h.is_active=1 AND h.wa_reminder=1 AND h.reminder_sent=0
                 AND h.hearing_date = date('now', '+1 day')""",
        ).fetchall()
    return [dict(r) for r in rows]


def mark_hearing_reminder_sent(hearing_id: str):
    with get_conn() as conn:
        conn.execute("UPDATE hearings SET reminder_sent=1 WHERE hearing_id=?", (hearing_id,))


# ── Deadlines ─────────────────────────────────────────────────────────────────

def get_deadlines(org_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> list[dict]:
    clauses = ["d.org_id=?", "d.is_active=1"]
    params: list = [org_id]
    if from_date:
        clauses.append("d.due_date >= ?"); params.append(from_date)
    if to_date:
        clauses.append("d.due_date <= ?"); params.append(to_date)
    where = "WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT d.*, m.title AS matter_title, m.case_number
                FROM deadlines d
                LEFT JOIN matters m ON m.matter_id = d.matter_id AND m.is_active=1
                {where} ORDER BY d.due_date""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def create_deadline(
    org_id: str, title: str, due_date: str,
    matter_id: Optional[str] = None,
    deadline_type: str = "Filing",
    notes: Optional[str] = None,
    wa_reminder: bool = False,
    actor: str = SYSTEM,
) -> dict:
    now = _now()
    did = "dl_" + secrets.token_hex(8)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO deadlines
               (deadline_id,org_id,matter_id,title,due_date,deadline_type,
                notes,wa_reminder,created_at,created_by,modified_at,modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (did, org_id, matter_id or None, title, due_date, deadline_type,
             notes or None, 1 if wa_reminder else 0, now, actor, now, actor),
        )
    return get_deadline(did)  # type: ignore[return-value]


def get_deadline(deadline_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT d.*, m.title AS matter_title, m.case_number
               FROM deadlines d
               LEFT JOIN matters m ON m.matter_id = d.matter_id
               WHERE d.deadline_id=? AND d.is_active=1""",
            (deadline_id,),
        ).fetchone()
    return dict(row) if row else None


def update_deadline(deadline_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"title", "due_date", "deadline_type", "matter_id",
               "notes", "wa_reminder", "is_completed"}
    sets = {k: v for k, v in fields.items() if k in allowed}
    if not sets:
        return get_deadline(deadline_id)
    sets["modified_at"] = _now()
    sets["modified_by"] = actor
    # If marking complete, reset reminder state
    if sets.get("is_completed"):
        sets["reminder_sent"] = 1
    cols = ", ".join(f"{k}=?" for k in sets)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE deadlines SET {cols} WHERE deadline_id=? AND org_id=?",
            (*sets.values(), deadline_id, org_id),
        )
    return get_deadline(deadline_id)


def delete_deadline(deadline_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE deadlines SET is_active=0, modified_at=?, modified_by=? WHERE deadline_id=? AND org_id=?",
            (now, actor, deadline_id, org_id),
        )


def get_deadlines_needing_reminder() -> list[dict]:
    """Return deadlines with wa_reminder=1, reminder_sent=0, due within next 25 hours."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT d.*, o.org_id,
                      u.whatsapp_number AS owner_wa, u.name AS owner_name,
                      u.email AS owner_email
               FROM deadlines d
               JOIN organizations o ON o.org_id = d.org_id AND o.is_active=1
               JOIN users u ON u.org_id = d.org_id AND u.role='org_owner' AND u.is_active=1
               WHERE d.is_active=1 AND d.wa_reminder=1 AND d.reminder_sent=0
                 AND d.is_completed=0
                 AND d.due_date = date('now', '+1 day')""",
        ).fetchall()
    return [dict(r) for r in rows]


def mark_deadline_reminder_sent(deadline_id: str):
    with get_conn() as conn:
        conn.execute("UPDATE deadlines SET reminder_sent=1 WHERE deadline_id=?", (deadline_id,))


# ─── Case Law Documents ───────────────────────────────────────────────────────

def create_case_law_doc(
    publisher: str,
    title: str,
    filename: str,
    size_bytes: int,
    year: int | None = None,
    volume: str | None = None,
    court: str | None = None,
    actor: str = "system",
) -> dict:
    doc_id = _new_id()
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO case_law_docs
               (doc_id, publisher, title, year, volume, court, filename,
                size_bytes, status, indexed_by,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (doc_id, publisher, title, year, volume, court, filename,
             size_bytes, "processing", actor,
             now, actor, now, actor),
        )
    return get_case_law_doc(doc_id) or {}


def get_case_law_doc(doc_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM case_law_docs WHERE doc_id=? AND is_active=1", (doc_id,)
        ).fetchone()
    return dict(row) if row else None


def list_case_law_docs(publisher: str | None = None) -> list[dict]:
    with get_conn() as conn:
        if publisher:
            rows = conn.execute(
                "SELECT * FROM case_law_docs WHERE is_active=1 AND publisher=? ORDER BY year DESC, title",
                (publisher,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM case_law_docs WHERE is_active=1 ORDER BY publisher, year DESC, title"
            ).fetchall()
    return [dict(r) for r in rows]


def set_case_law_doc_status(doc_id: str, status: str, error_msg: str | None = None, actor: str = "system"):
    with get_conn() as conn:
        conn.execute(
            "UPDATE case_law_docs SET status=?, error_msg=?, modified_at=?, modified_by=? WHERE doc_id=?",
            (status, error_msg, _now(), actor, doc_id),
        )


def delete_case_law_doc(doc_id: str, actor: str = "system"):
    with get_conn() as conn:
        conn.execute(
            "UPDATE case_law_docs SET is_active=0, modified_at=?, modified_by=? WHERE doc_id=?",
            (_now(), actor, doc_id),
        )


# ── Client Portal Tokens ──────────────────────────────────────────────────────

def create_client_token(
    org_id: str, client_id: str, actor: str,
    matter_id: str | None = None,
    label: str | None = None,
    expires_at: str | None = None,
) -> dict:
    tid   = "ctok_" + secrets.token_hex(8)
    token = secrets.token_urlsafe(32)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO client_tokens
               (token_id, token, org_id, client_id, matter_id, label, expires_at,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (tid, token, org_id, client_id, matter_id, label, expires_at,
             _now(), actor, _now(), actor),
        )
    return get_client_token_by_id(tid)


def get_client_token_by_id(token_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT ct.*, c.name AS client_name, m.title AS matter_title
               FROM client_tokens ct
               JOIN clients c ON ct.client_id = c.client_id
               LEFT JOIN matters m ON ct.matter_id = m.matter_id
               WHERE ct.token_id=? AND ct.is_active=1""",
            (token_id,)
        ).fetchone()
    return dict(row) if row else None


def get_client_token_by_value(token: str) -> dict | None:
    """Look up a token by its secret value — used by the unauthenticated portal."""
    with get_conn() as conn:
        row = conn.execute(
            """SELECT ct.*, c.name AS client_name, c.email AS client_email,
                      c.phone AS client_phone,
                      m.title AS matter_title, m.matter_type, m.case_number,
                      m.court as court_name, m.status AS matter_status,
                      o.name AS org_name
               FROM client_tokens ct
               JOIN clients c      ON ct.client_id = c.client_id
               JOIN organizations o ON ct.org_id   = o.org_id
               LEFT JOIN matters m ON ct.matter_id = m.matter_id
               WHERE ct.token=? AND ct.is_active=1
                 AND (ct.expires_at IS NULL OR ct.expires_at > datetime('now'))""",
            (token,)
        ).fetchone()
    return dict(row) if row else None


def list_client_tokens(org_id: str, client_id: str | None = None) -> list[dict]:
    with get_conn() as conn:
        if client_id:
            rows = conn.execute(
                """SELECT ct.*, c.name AS client_name, m.title AS matter_title
                   FROM client_tokens ct
                   JOIN clients c ON ct.client_id = c.client_id
                   LEFT JOIN matters m ON ct.matter_id = m.matter_id
                   WHERE ct.org_id=? AND ct.client_id=? AND ct.is_active=1
                   ORDER BY ct.created_at DESC""",
                (org_id, client_id)
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT ct.*, c.name AS client_name, m.title AS matter_title
                   FROM client_tokens ct
                   JOIN clients c ON ct.client_id = c.client_id
                   LEFT JOIN matters m ON ct.matter_id = m.matter_id
                   WHERE ct.org_id=? AND ct.is_active=1
                   ORDER BY ct.created_at DESC""",
                (org_id,)
            ).fetchall()
    return [dict(r) for r in rows]


def revoke_client_token(token_id: str, actor: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE client_tokens SET is_active=0, modified_at=?, modified_by=? WHERE token_id=?",
            (_now(), actor, token_id),
        )


# ── Templates ─────────────────────────────────────────────────────────────────

TEMPLATE_TYPES = ("vakalatnama", "plaint", "agreement", "notice", "general")


def list_templates(org_id: str, template_type: str | None = None) -> list[dict]:
    with get_conn() as conn:
        if template_type:
            rows = conn.execute(
                "SELECT * FROM templates WHERE org_id=? AND template_type=? AND is_active=1 ORDER BY title",
                (org_id, template_type),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM templates WHERE org_id=? AND is_active=1 ORDER BY template_type, title",
                (org_id,),
            ).fetchall()
    return [dict(r) for r in rows]


def create_template(
    org_id: str,
    title: str,
    template_type: str,
    content: str,
    description: str,
    actor: str,
) -> dict:
    tid = "tmpl_" + secrets.token_hex(8)
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO templates
               (template_id, org_id, title, template_type, content, description,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (tid, org_id, title, template_type, content, description,
             _now(), actor, _now(), actor),
        )
    return get_template(tid)


def get_template(template_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM templates WHERE template_id=? AND is_active=1", (template_id,)
        ).fetchone()
    return dict(row) if row else None


def update_template(
    template_id: str,
    actor: str,
    title: str | None = None,
    template_type: str | None = None,
    content: str | None = None,
    description: str | None = None,
) -> dict | None:
    fields, vals = [], []
    if title is not None:        fields.append("title=?");         vals.append(title)
    if template_type is not None: fields.append("template_type=?"); vals.append(template_type)
    if content is not None:      fields.append("content=?");       vals.append(content)
    if description is not None:  fields.append("description=?");   vals.append(description)
    if not fields:
        return get_template(template_id)
    fields += ["modified_at=?", "modified_by=?"]
    vals   += [_now(), actor, template_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE templates SET {','.join(fields)} WHERE template_id=?", vals)
    return get_template(template_id)


def delete_template(template_id: str, actor: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE templates SET is_active=0, modified_at=?, modified_by=? WHERE template_id=?",
            (_now(), actor, template_id),
        )


# ── Password Reset Tokens (Task #43) ──────────────────────────────────────────

def create_reset_token(user_id: str) -> str:
    """Generate a 1-hour password-reset token, purge old ones for this user, return raw token."""
    token    = secrets.token_urlsafe(32)
    token_id = secrets.token_hex(8)
    now      = _now()
    expires  = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    expires_str = expires.strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        # Invalidate any existing unused tokens for this user
        conn.execute(
            "UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0",
            (user_id,),
        )
        conn.execute(
            """INSERT INTO password_reset_tokens (token_id, token, user_id, expires_at, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (token_id, token, user_id, expires_str, now),
        )
    return token


def use_reset_token(token: str) -> Optional[str]:
    """Validate token; mark used; return user_id if valid, else None."""
    with get_conn() as conn:
        row = conn.execute(
            """SELECT token_id, user_id FROM password_reset_tokens
               WHERE token=? AND used=0 AND expires_at > datetime('now')""",
            (token,),
        ).fetchone()
        if not row:
            return None
        conn.execute(
            "UPDATE password_reset_tokens SET used=1 WHERE token_id=?",
            (row["token_id"],),
        )
    return row["user_id"]


# ── Court Orders (Task #130) ──────────────────────────────────────────────────

def get_court_orders(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM court_orders
               WHERE matter_id=? AND org_id=? AND is_active=1
               ORDER BY hearing_date DESC""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_court_order(
    matter_id: str, org_id: str, hearing_date: str, order_brief: str,
    outcome: str = "Adjourned", court_name: Optional[str] = None,
    next_date: Optional[str] = None, actor: str = SYSTEM,
) -> dict:
    order_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO court_orders
               (order_id, org_id, matter_id, hearing_date, court_name,
                order_brief, next_date, outcome, created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (order_id, org_id, matter_id, hearing_date, court_name,
             order_brief, next_date, outcome, now, actor, now, actor),
        )
    return {
        "order_id": order_id, "org_id": org_id, "matter_id": matter_id,
        "hearing_date": hearing_date, "court_name": court_name,
        "order_brief": order_brief, "next_date": next_date,
        "outcome": outcome, "created_at": now,
    }


def update_court_order(
    order_id: str, org_id: str, actor: str = SYSTEM, **fields
) -> Optional[dict]:
    allowed = {"hearing_date", "court_name", "order_brief", "next_date", "outcome"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return None
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE court_orders SET {set_clause} WHERE order_id=? AND org_id=?",
            (*updates.values(), order_id, org_id),
        )
        row = conn.execute(
            "SELECT * FROM court_orders WHERE order_id=? AND org_id=?",
            (order_id, org_id),
        ).fetchone()
    return dict(row) if row else None


def delete_court_order(order_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE court_orders SET is_active=0, modified_at=?, modified_by=? WHERE order_id=? AND org_id=?",
            (now, actor, order_id, org_id),
        )


# ── Adverse Parties (Task #131) ───────────────────────────────────────────────

def get_adverse_parties(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM adverse_parties
               WHERE matter_id=? AND org_id=? AND is_active=1
               ORDER BY created_at""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_adverse_party(
    matter_id: str, org_id: str, party_name: str,
    party_type: str = "Individual",
    counsel_name: Optional[str] = None,
    counsel_phone: Optional[str] = None,
    counsel_firm: Optional[str] = None,
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    party_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO adverse_parties
               (party_id, org_id, matter_id, party_name, party_type,
                counsel_name, counsel_phone, counsel_firm, notes,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (party_id, org_id, matter_id, party_name, party_type,
             counsel_name, counsel_phone, counsel_firm, notes,
             now, actor, now, actor),
        )
    return {
        "party_id": party_id, "org_id": org_id, "matter_id": matter_id,
        "party_name": party_name, "party_type": party_type,
        "counsel_name": counsel_name, "counsel_phone": counsel_phone,
        "counsel_firm": counsel_firm, "notes": notes, "created_at": now,
    }


def update_adverse_party(
    party_id: str, org_id: str, actor: str = SYSTEM, **fields
) -> Optional[dict]:
    allowed = {"party_name", "party_type", "counsel_name", "counsel_phone", "counsel_firm", "notes"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return None
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE adverse_parties SET {set_clause} WHERE party_id=? AND org_id=?",
            (*updates.values(), party_id, org_id),
        )
        row = conn.execute(
            "SELECT * FROM adverse_parties WHERE party_id=? AND org_id=?",
            (party_id, org_id),
        ).fetchone()
    return dict(row) if row else None


def delete_adverse_party(party_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE adverse_parties SET is_active=0, modified_at=?, modified_by=? WHERE party_id=? AND org_id=?",
            (now, actor, party_id, org_id),
        )


# ── Time Tracking (Task #133) ─────────────────────────────────────────────────

def get_time_entries(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT te.*, u.name AS user_name
               FROM time_entries te
               LEFT JOIN users u ON u.user_id = te.user_id
               WHERE te.matter_id=? AND te.org_id=? AND te.is_active=1
               ORDER BY te.entry_date DESC, te.created_at DESC""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_time_entry(
    matter_id: str, org_id: str, duration_minutes: int, entry_date: str,
    description: Optional[str] = None, hourly_rate: int = 0,
    billable: int = 1, user_id: Optional[str] = None, actor: str = SYSTEM,
) -> dict:
    entry_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO time_entries
               (entry_id, org_id, matter_id, user_id, description, entry_date,
                duration_minutes, hourly_rate, billable,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (entry_id, org_id, matter_id, user_id, description, entry_date,
             duration_minutes, hourly_rate, billable,
             now, actor, now, actor),
        )
    return {
        "entry_id": entry_id, "org_id": org_id, "matter_id": matter_id,
        "user_id": user_id, "description": description, "entry_date": entry_date,
        "duration_minutes": duration_minutes, "hourly_rate": hourly_rate,
        "billable": billable, "fee_id": None, "created_at": now,
    }


def update_time_entry(
    entry_id: str, org_id: str, actor: str = SYSTEM, **fields
) -> Optional[dict]:
    allowed = {"description", "entry_date", "duration_minutes", "hourly_rate", "billable", "fee_id"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return None
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE time_entries SET {set_clause} WHERE entry_id=? AND org_id=?",
            (*updates.values(), entry_id, org_id),
        )
        row = conn.execute(
            """SELECT te.*, u.name AS user_name FROM time_entries te
               LEFT JOIN users u ON u.user_id = te.user_id
               WHERE te.entry_id=? AND te.org_id=?""",
            (entry_id, org_id),
        ).fetchone()
    return dict(row) if row else None


def delete_time_entry(entry_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE time_entries SET is_active=0, modified_at=?, modified_by=? WHERE entry_id=? AND org_id=?",
            (now, actor, entry_id, org_id),
        )


def bill_time_entries(
    entry_ids: list[str], matter_id: str, org_id: str,
    fee_description: str, actor: str = SYSTEM,
) -> Optional[dict]:
    """Convert selected time entries into a single fee and link them."""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT entry_id, duration_minutes, hourly_rate FROM time_entries
                WHERE entry_id IN ({','.join('?' * len(entry_ids))})
                  AND matter_id=? AND org_id=? AND is_active=1 AND fee_id IS NULL AND billable=1""",
            (*entry_ids, matter_id, org_id),
        ).fetchall()
    if not rows:
        return None
    total_minutes = sum(r["duration_minutes"] for r in rows)
    total_hours   = total_minutes / 60
    # Use the highest hourly rate among selected entries for the fee amount
    avg_rate = max((r["hourly_rate"] for r in rows), default=0)
    amount   = int(total_hours * avg_rate)
    today    = datetime.date.today().strftime("%Y-%m-%d")
    fee      = create_fee(
        org_id=org_id, matter_id=matter_id,
        description=fee_description,
        fee_type="Time-Based",
        amount=amount,
        fee_date=today,
        actor=actor,
    )
    # Link entries to this fee
    now = _now()
    with get_conn() as conn:
        for r in rows:
            conn.execute(
                "UPDATE time_entries SET fee_id=?, modified_at=?, modified_by=? WHERE entry_id=?",
                (fee["fee_id"], now, actor, r["entry_id"]),
            )
    return fee


# ── Limitation Tracker (Task #132) ───────────────────────────────────────────

# Limitation periods in days (Limitation Act 1908, Pakistan)
LIMITATION_PERIODS: dict[str, Optional[int]] = {
    "Contract / Money Recovery":  3 * 365,
    "Immovable Property (Title)": 12 * 365,
    "Mortgage Enforcement":       30 * 365,
    "Tort / Personal Injury":     1 * 365,
    "Service / Employment":       3 * 365,
    "Execution of Decree":        3 * 365,
    "Appeal — High Court":        90,
    "Appeal — Supreme Court":     30,
    "Revision":                   90,
    "Constitutional Petition":    None,   # no fixed period; courts apply laches
}


def compute_limitation_date(
    limitation_type: str, cause_of_action_date: str
) -> Optional[str]:
    """Return the limitation deadline as YYYY-MM-DD, or None if no fixed period."""
    days = LIMITATION_PERIODS.get(limitation_type)
    if days is None:
        return None
    try:
        coa = datetime.datetime.strptime(cause_of_action_date, "%Y-%m-%d").date()
        deadline = coa + datetime.timedelta(days=days)
        return deadline.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def get_matters_with_approaching_limitation(org_id: str, within_days: int = 60) -> list[dict]:
    """Return active matters whose limitation_date falls within the next `within_days` days."""
    today = datetime.date.today()
    cutoff = (today + datetime.timedelta(days=within_days)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT m.matter_id, m.title, m.case_number, m.limitation_date,
                      m.limitation_type, c.name AS client_name
               FROM matters m
               LEFT JOIN clients c ON c.client_id = m.client_id
               WHERE m.org_id=? AND m.is_active=1
                 AND m.limitation_date IS NOT NULL
                 AND m.limitation_date <= ?
               ORDER BY m.limitation_date""",
            (org_id, cutoff),
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        ldate = d.get("limitation_date") or ""
        d["days_remaining"] = (
            datetime.datetime.strptime(ldate, "%Y-%m-%d").date() - today
        ).days if ldate else None
        result.append(d)
    return result


def get_platform_stats() -> dict:
    with get_conn() as conn:
        total_orgs  = conn.execute("SELECT COUNT(*) FROM organizations WHERE is_active=1").fetchone()[0]
        active_orgs = conn.execute("SELECT COUNT(*) FROM organizations WHERE is_active=1 AND status='active'").fetchone()[0]
        total_users = conn.execute("SELECT COUNT(*) FROM users WHERE is_active=1").fetchone()[0]
        total_docs  = conn.execute("SELECT COUNT(*) FROM documents WHERE is_active=1").fetchone()[0]
        total_bytes = conn.execute("SELECT COALESCE(SUM(size_bytes),0) FROM documents WHERE is_active=1").fetchone()[0]
        plan_counts = conn.execute(
            "SELECT plan, COUNT(*) AS cnt FROM organizations WHERE is_active=1 GROUP BY plan"
        ).fetchall()
    return {
        "total_orgs":  total_orgs,
        "active_orgs": active_orgs,
        "total_users": total_users,
        "total_docs":  total_docs,
        "total_bytes": total_bytes,
        "plans": {r["plan"]: r["cnt"] for r in plan_counts},
    }


# ── Cause List Integration — Task #137 ───────────────────────────────────────

import re as _re

# Common Pakistani court case number patterns
_CASE_NUMBER_PATTERNS = [
    r'W\.?\s*P\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',          # Writ Petition
    r'C\.?\s*P\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',           # Civil Petition
    r'C(?:ivil)?\.?\s*S(?:uit)?\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',  # Civil Suit
    r'Crl?\.?\s*(?:Appeal|Rev(?:ision)?|Misc|Petn?)\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',
    r'F\.?\s*A\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',           # First Appeal
    r'R\.?\s*S\.?\s*A\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',    # Regular Second Appeal
    r'R\.?\s*A\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',           # Regular Appeal
    r'C\.?\s*M\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',           # Civil Misc
    r'I\.?\s*C\.?\s*A\.?\s*(?:No\.?)?\s*\d+[\-/]\d{2,4}',    # Intra Court Appeal
    r'Suit\s+(?:No\.?)?\s*\d+[\-/]\d{2,4}',
    r'Case\s+(?:No\.?)?\s*\d+[\-/]\d{2,4}',
]

_CASE_RE = _re.compile(
    '|'.join(f'(?:{p})' for p in _CASE_NUMBER_PATTERNS),
    _re.IGNORECASE
)

_ITEM_RE = _re.compile(r'^\s*(\d+)\s*[.\)]\s*', _re.MULTILINE)


def _normalize_case_number(cn: str) -> str:
    """Strip spaces and punctuation for fuzzy matching."""
    return _re.sub(r'[\s.\-/]', '', cn).upper()


def parse_cause_list_text(text: str, court_name: str = "", list_date: str = "") -> list[dict]:
    """
    Parse raw cause list text (pasted or PDF-extracted) into structured entries.
    Each entry: {item_no, case_number, parties, court_name, list_date}
    """
    entries: list[dict] = []
    lines = text.splitlines()
    item_no = ""
    buffer = ""

    for line in lines:
        m = _ITEM_RE.match(line)
        if m:
            # Flush previous buffer
            if buffer:
                cases = _CASE_RE.findall(buffer)
                for cn in cases:
                    entries.append({
                        "item_no":    item_no,
                        "case_number": cn.strip(),
                        "parties":    buffer.strip()[:300],
                        "court_name": court_name,
                        "list_date":  list_date,
                    })
                if not cases:
                    entries.append({
                        "item_no":    item_no,
                        "case_number": "",
                        "parties":    buffer.strip()[:300],
                        "court_name": court_name,
                        "list_date":  list_date,
                    })
            item_no = m.group(1)
            buffer = line[m.end():]
        else:
            buffer += " " + line.strip()

    # Flush final buffer
    if buffer.strip():
        cases = _CASE_RE.findall(buffer)
        for cn in cases:
            entries.append({
                "item_no":    item_no,
                "case_number": cn.strip(),
                "parties":    buffer.strip()[:300],
                "court_name": court_name,
                "list_date":  list_date,
            })
        if not cases and item_no:
            entries.append({
                "item_no":    item_no,
                "case_number": "",
                "parties":    buffer.strip()[:300],
                "court_name": court_name,
                "list_date":  list_date,
            })

    return entries


def _match_entries_to_matters(entries: list[dict], org_id: str) -> list[dict]:
    """Set matter_id on entries whose case_number matches a matter."""
    with get_conn() as conn:
        matters = conn.execute(
            "SELECT matter_id, case_number FROM matters WHERE org_id=? AND is_active=1 AND case_number IS NOT NULL",
            (org_id,),
        ).fetchall()
    matter_map = {_normalize_case_number(m["case_number"]): m["matter_id"] for m in matters if m["case_number"]}
    for e in entries:
        norm = _normalize_case_number(e.get("case_number", ""))
        e["matter_id"] = matter_map.get(norm)
    return entries


def store_cause_list(org_id: str, entries: list[dict], actor: str = SYSTEM) -> list[dict]:
    """Persist cause list entries, clearing existing ones for the same date+court first."""
    if not entries:
        return []
    list_date  = entries[0].get("list_date", "")
    court_name = entries[0].get("court_name", "")
    now = _now()

    matched = _match_entries_to_matters(entries, org_id)
    stored  = []

    with get_conn() as conn:
        # Soft-delete existing entries for same date+court
        conn.execute(
            "UPDATE cause_list_entries SET is_active=0, modified_at=?, modified_by=? "
            "WHERE org_id=? AND list_date=? AND (court_name=? OR (court_name IS NULL AND ?=''))",
            (now, actor, org_id, list_date, court_name, court_name),
        )
        for e in matched:
            entry_id = secrets.token_hex(10)
            conn.execute(
                """INSERT INTO cause_list_entries
                   (entry_id, org_id, list_date, court_name, item_no, case_number,
                    parties, matter_id, is_active, created_at, created_by, modified_at, modified_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)""",
                (entry_id, org_id, e.get("list_date",""), e.get("court_name",""),
                 e.get("item_no",""), e.get("case_number",""), e.get("parties",""),
                 e.get("matter_id"), now, actor, now, actor),
            )
            stored.append({"entry_id": entry_id, **e})
    return stored


def get_cause_list_entries(org_id: str, list_date: Optional[str] = None) -> list[dict]:
    where = "e.org_id=? AND e.is_active=1"
    params: list = [org_id]
    if list_date:
        where += " AND e.list_date=?"
        params.append(list_date)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT e.*, m.title AS matter_title, m.status AS matter_status
                FROM cause_list_entries e
                LEFT JOIN matters m ON m.matter_id = e.matter_id
                WHERE {where}
                ORDER BY e.list_date DESC, CAST(e.item_no AS INTEGER)""",
            params,
        ).fetchall()
    return [dict(r) for r in rows]


def link_cause_list_entry(entry_id: str, org_id: str, matter_id: Optional[str], actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE cause_list_entries SET matter_id=?, modified_at=?, modified_by=? WHERE entry_id=? AND org_id=?",
            (matter_id, now, actor, entry_id, org_id),
        )


def delete_cause_list_entry(entry_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE cause_list_entries SET is_active=0, modified_at=?, modified_by=? WHERE entry_id=? AND org_id=?",
            (now, actor, entry_id, org_id),
        )


def get_today_cause_list_matches(org_id: str) -> list[dict]:
    """Return today's cause list entries that are matched to a matter."""
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT e.*, m.title AS matter_title, m.status AS matter_status,
                      m.court_name AS matter_court
               FROM cause_list_entries e
               JOIN matters m ON m.matter_id = e.matter_id
               WHERE e.org_id=? AND e.list_date=? AND e.is_active=1""",
            (org_id, today),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Matter Notes ──────────────────────────────────────────────────────────────

NOTE_TYPES = ["Note", "Call", "Meeting", "Instruction", "Email", "WhatsApp", "Other"]


def get_matter_notes(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT n.*, u.name AS author_name
               FROM matter_notes n
               LEFT JOIN users u ON u.user_id = n.created_by
               WHERE n.matter_id=? AND n.org_id=? AND n.is_active=1
               ORDER BY n.note_date DESC, n.created_at DESC""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_note(
    org_id: str,
    matter_id: str,
    note_type: str,
    note_text: str,
    note_date: str,
    actor: str = SYSTEM,
) -> dict:
    note_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matter_notes
               (note_id, org_id, matter_id, note_type, note_text, note_date,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (note_id, org_id, matter_id, note_type, note_text, note_date,
             now, actor, now, actor),
        )
        row = conn.execute(
            "SELECT * FROM matter_notes WHERE note_id=?", (note_id,)
        ).fetchone()
    return dict(row)


def update_matter_note(
    note_id: str,
    org_id: str,
    note_type: str = None,
    note_text: str = None,
    note_date: str = None,
    actor: str = SYSTEM,
) -> dict:
    now = _now()
    allowed = {"note_type", "note_text", "note_date"}
    updates = {k: v for k, v in {"note_type": note_type, "note_text": note_text, "note_date": note_date}.items() if v is not None}
    if not updates:
        with get_conn() as conn:
            row = conn.execute("SELECT * FROM matter_notes WHERE note_id=? AND org_id=?", (note_id, org_id)).fetchone()
        return dict(row) if row else {}
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_notes SET {set_clause}, modified_at=?, modified_by=? WHERE note_id=? AND org_id=?",
            (*updates.values(), now, actor, note_id, org_id),
        )
        row = conn.execute("SELECT * FROM matter_notes WHERE note_id=?", (note_id,)).fetchone()
    return dict(row) if row else {}


def delete_matter_note(note_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_notes SET is_active=0, modified_at=?, modified_by=? WHERE note_id=? AND org_id=?",
            (now, actor, note_id, org_id),
        )


# ── Document Requests — Task #140 ─────────────────────────────────────────────

DOC_REQUEST_STATUSES = ("Pending", "Received", "Waived", "Overdue")


def get_document_requests(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM document_requests
               WHERE matter_id=? AND org_id=? AND is_active=1
               ORDER BY
                   CASE status WHEN 'Pending' THEN 0 WHEN 'Overdue' THEN 1
                               WHEN 'Received' THEN 2 ELSE 3 END,
                   due_date ASC NULLS LAST""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_document_request(
    org_id: str,
    matter_id: str,
    doc_name: str,
    requested_date: str,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    request_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO document_requests
               (request_id, org_id, matter_id, doc_name, requested_date, due_date,
                status, notes, created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (request_id, org_id, matter_id, doc_name, requested_date, due_date,
             "Pending", notes, now, actor, now, actor),
        )
        row = conn.execute(
            "SELECT * FROM document_requests WHERE request_id=?", (request_id,)
        ).fetchone()
    return dict(row)


def update_document_request(
    request_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **fields,
) -> dict:
    allowed = {"doc_name", "requested_date", "due_date", "status", "notes", "received_date"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM document_requests WHERE request_id=? AND org_id=?",
                (request_id, org_id),
            ).fetchone()
        return dict(row) if row else {}
    now = _now()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE document_requests SET {set_clause}, modified_at=?, modified_by=? "
            f"WHERE request_id=? AND org_id=?",
            (*updates.values(), now, actor, request_id, org_id),
        )
        row = conn.execute(
            "SELECT * FROM document_requests WHERE request_id=?", (request_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_document_request(request_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE document_requests SET is_active=0, modified_at=?, modified_by=? "
            "WHERE request_id=? AND org_id=?",
            (now, actor, request_id, org_id),
        )


# ── Witnesses — Task #141 ─────────────────────────────────────────────────────

WITNESS_TYPES     = ("Prosecution", "Defence", "Expert", "Character", "Other")
STATEMENT_STATUSES = ("Not Taken", "Taken", "Filed", "Cross-Examined")


def get_witnesses(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM witnesses
               WHERE matter_id=? AND org_id=? AND is_active=1
               ORDER BY witness_type, witness_name""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_witness(
    org_id: str,
    matter_id: str,
    witness_name: str,
    witness_type: str = "Defence",
    contact_number: Optional[str] = None,
    address: Optional[str] = None,
    statement_status: str = "Not Taken",
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    witness_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO witnesses
               (witness_id, org_id, matter_id, witness_name, witness_type,
                contact_number, address, statement_status, notes,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (witness_id, org_id, matter_id, witness_name, witness_type,
             contact_number, address, statement_status, notes,
             now, actor, now, actor),
        )
        row = conn.execute(
            "SELECT * FROM witnesses WHERE witness_id=?", (witness_id,)
        ).fetchone()
    return dict(row)


def update_witness(witness_id: str, org_id: str, actor: str = SYSTEM, **fields) -> dict:
    allowed = {"witness_name", "witness_type", "contact_number", "address",
               "statement_status", "notes"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM witnesses WHERE witness_id=? AND org_id=?",
                (witness_id, org_id),
            ).fetchone()
        return dict(row) if row else {}
    now = _now()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE witnesses SET {set_clause}, modified_at=?, modified_by=? "
            f"WHERE witness_id=? AND org_id=?",
            (*updates.values(), now, actor, witness_id, org_id),
        )
        row = conn.execute(
            "SELECT * FROM witnesses WHERE witness_id=?", (witness_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_witness(witness_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE witnesses SET is_active=0, modified_at=?, modified_by=? "
            "WHERE witness_id=? AND org_id=?",
            (now, actor, witness_id, org_id),
        )


# ── Matter Deadlines — Task #142 ──────────────────────────────────────────────

DEADLINE_PRIORITIES = ("High", "Medium", "Low")


def get_matter_deadlines(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM matter_deadlines
               WHERE matter_id=? AND org_id=? AND is_active=1
               ORDER BY completed ASC,
                        CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
                        due_date ASC""",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_deadline(
    org_id: str,
    matter_id: str,
    title: str,
    due_date: str,
    priority: str = "Medium",
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    deadline_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matter_deadlines
               (deadline_id, org_id, matter_id, title, due_date, priority, notes,
                created_at, created_by, modified_at, modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (deadline_id, org_id, matter_id, title, due_date, priority, notes,
             now, actor, now, actor),
        )
        row = conn.execute(
            "SELECT * FROM matter_deadlines WHERE deadline_id=?", (deadline_id,)
        ).fetchone()
    return dict(row)


def update_matter_deadline(
    deadline_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **fields,
) -> dict:
    allowed = {"title", "due_date", "priority", "notes", "completed", "completed_at"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM matter_deadlines WHERE deadline_id=? AND org_id=?",
                (deadline_id, org_id),
            ).fetchone()
        return dict(row) if row else {}
    now = _now()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_deadlines SET {set_clause}, modified_at=?, modified_by=? "
            f"WHERE deadline_id=? AND org_id=?",
            (*updates.values(), now, actor, deadline_id, org_id),
        )
        row = conn.execute(
            "SELECT * FROM matter_deadlines WHERE deadline_id=?", (deadline_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_matter_deadline(deadline_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_deadlines SET is_active=0, modified_at=?, modified_by=? "
            "WHERE deadline_id=? AND org_id=?",
            (now, actor, deadline_id, org_id),
        )


# ── Matter Expenses (Task #143) ───────────────────────────────────────────────

EXPENSE_CATEGORIES = ("Court Fees", "Filing", "Travel", "Printing", "Misc")


def get_matter_expenses(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_expenses WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY expense_date DESC",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_expense(
    org_id: str,
    matter_id: str,
    description: str,
    amount_pkr: float,
    expense_date: str,
    category: str = "Misc",
    billable: int = 1,
    receipt_ref: str | None = None,
    actor: str = SYSTEM,
) -> dict:
    expense_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_expenses (expense_id, org_id, matter_id, description, "
            "amount_pkr, expense_date, category, billable, receipt_ref, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (expense_id, org_id, matter_id, description, amount_pkr, expense_date,
             category, billable, receipt_ref, now, actor, now, actor),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_expenses WHERE expense_id=?", (expense_id,)
        ).fetchone()
    return dict(row) if row else {}


def update_matter_expense(
    expense_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **kwargs,
) -> dict:
    allowed = {"description", "amount_pkr", "expense_date", "category", "billable", "receipt_ref"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return {}
    now = _now()
    fields["modified_at"] = now
    fields["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in fields)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_expenses SET {set_clause} WHERE expense_id=? AND org_id=?",
            (*fields.values(), expense_id, org_id),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_expenses WHERE expense_id=?", (expense_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_matter_expense(expense_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_expenses SET is_active=0, modified_at=?, modified_by=? "
            "WHERE expense_id=? AND org_id=?",
            (now, actor, expense_id, org_id),
        )


# ── Matter Correspondence (Task #144) ────────────────────────────────────────

CORR_DIRECTIONS = ("Sent", "Received")
CORR_TYPES = ("Letter", "Email", "Notice", "Legal Notice", "Application", "Other")


def get_matter_correspondence(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_correspondence WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY corr_date DESC",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_correspondence(
    org_id: str,
    matter_id: str,
    corr_date: str,
    subject: str,
    direction: str = "Sent",
    corr_type: str = "Letter",
    party: str | None = None,
    reference_no: str | None = None,
    notes: str | None = None,
    actor: str = SYSTEM,
) -> dict:
    corr_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_correspondence (corr_id, org_id, matter_id, corr_date, "
            "direction, corr_type, subject, party, reference_no, notes, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (corr_id, org_id, matter_id, corr_date, direction, corr_type,
             subject, party, reference_no, notes, now, actor, now, actor),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_correspondence WHERE corr_id=?", (corr_id,)
        ).fetchone()
    return dict(row) if row else {}


def update_matter_correspondence(
    corr_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **kwargs,
) -> dict:
    allowed = {"corr_date", "direction", "corr_type", "subject", "party", "reference_no", "notes"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return {}
    now = _now()
    fields["modified_at"] = now
    fields["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in fields)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_correspondence SET {set_clause} WHERE corr_id=? AND org_id=?",
            (*fields.values(), corr_id, org_id),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_correspondence WHERE corr_id=?", (corr_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_matter_correspondence(corr_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_correspondence SET is_active=0, modified_at=?, modified_by=? "
            "WHERE corr_id=? AND org_id=?",
            (now, actor, corr_id, org_id),
        )


# ── Matter Bail & Interim Relief (Task #145) ─────────────────────────────────

RELIEF_TYPES   = ("Bail", "Stay Order", "Injunction", "Ad-interim Relief", "Anticipatory Bail", "Other")
RELIEF_STATUSES = ("Pending", "Granted", "Rejected", "Recalled", "Expired", "Withdrawn")


def get_matter_relief(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_relief WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY application_date DESC",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_relief(
    org_id: str,
    matter_id: str,
    application_date: str,
    relief_type: str = "Bail",
    court: str | None = None,
    judge: str | None = None,
    status: str = "Pending",
    conditions: str | None = None,
    surety_amount_pkr: float | None = None,
    surety_name: str | None = None,
    notes: str | None = None,
    actor: str = SYSTEM,
) -> dict:
    relief_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_relief (relief_id, org_id, matter_id, application_date, "
            "relief_type, court, judge, status, conditions, surety_amount_pkr, surety_name, notes, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (relief_id, org_id, matter_id, application_date, relief_type, court, judge,
             status, conditions, surety_amount_pkr, surety_name, notes, now, actor, now, actor),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_relief WHERE relief_id=?", (relief_id,)
        ).fetchone()
    return dict(row) if row else {}


def update_matter_relief(
    relief_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **kwargs,
) -> dict:
    allowed = {"application_date", "relief_type", "court", "judge", "status",
               "conditions", "surety_amount_pkr", "surety_name", "notes"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return {}
    now = _now()
    fields["modified_at"] = now
    fields["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in fields)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_relief SET {set_clause} WHERE relief_id=? AND org_id=?",
            (*fields.values(), relief_id, org_id),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_relief WHERE relief_id=?", (relief_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_matter_relief(relief_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_relief SET is_active=0, modified_at=?, modified_by=? "
            "WHERE relief_id=? AND org_id=?",
            (now, actor, relief_id, org_id),
        )


# ── Matter Outcome & Disposal (Task #146) ────────────────────────────────────

OUTCOME_TYPES = (
    "Pending", "Decree", "Acquittal", "Conviction", "Compromise",
    "Dismissed", "Withdrawn", "Settlement", "Other",
)


def get_matter_outcome(matter_id: str, org_id: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_outcomes WHERE matter_id=? AND org_id=?",
            (matter_id, org_id),
        ).fetchone()
    return dict(row) if row else {}


def upsert_matter_outcome(
    org_id: str,
    matter_id: str,
    outcome_type: str = "Pending",
    disposal_date: str | None = None,
    court: str | None = None,
    judge: str | None = None,
    decree_amount_pkr: float | None = None,
    appeal_filed: int = 0,
    appeal_deadline: str | None = None,
    notes: str | None = None,
    actor: str = SYSTEM,
) -> dict:
    now = _now()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT outcome_id FROM matter_outcomes WHERE matter_id=? AND org_id=?",
            (matter_id, org_id),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE matter_outcomes SET outcome_type=?, disposal_date=?, court=?, judge=?, "
                "decree_amount_pkr=?, appeal_filed=?, appeal_deadline=?, notes=?, "
                "modified_at=?, modified_by=? WHERE matter_id=? AND org_id=?",
                (outcome_type, disposal_date, court, judge, decree_amount_pkr,
                 appeal_filed, appeal_deadline, notes, now, actor, matter_id, org_id),
            )
        else:
            outcome_id = secrets.token_hex(10)
            conn.execute(
                "INSERT INTO matter_outcomes (outcome_id, org_id, matter_id, outcome_type, "
                "disposal_date, court, judge, decree_amount_pkr, appeal_filed, appeal_deadline, "
                "notes, created_at, created_by, modified_at, modified_by) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (outcome_id, org_id, matter_id, outcome_type, disposal_date, court, judge,
                 decree_amount_pkr, appeal_filed, appeal_deadline, notes,
                 now, actor, now, actor),
            )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_outcomes WHERE matter_id=? AND org_id=?",
            (matter_id, org_id),
        ).fetchone()
    return dict(row) if row else {}


# ── Matter Charges (Task #147) ────────────────────────────────────────────────

PLEA_OPTIONS = ("No Plea", "Not Guilty", "Guilty", "Absconder")


def get_matter_charges(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_charges WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY created_at ASC",
            (matter_id, org_id),
        ).fetchall()
    return [dict(r) for r in rows]


def create_matter_charge(
    org_id: str,
    matter_id: str,
    section_no: str,
    description: str | None = None,
    plea: str = "No Plea",
    charge_framed: int = 0,
    charge_framed_date: str | None = None,
    court: str | None = None,
    notes: str | None = None,
    actor: str = SYSTEM,
) -> dict:
    charge_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_charges (charge_id, org_id, matter_id, section_no, description, "
            "plea, charge_framed, charge_framed_date, court, notes, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (charge_id, org_id, matter_id, section_no, description, plea,
             charge_framed, charge_framed_date, court, notes, now, actor, now, actor),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_charges WHERE charge_id=?", (charge_id,)
        ).fetchone()
    return dict(row) if row else {}


def update_matter_charge(
    charge_id: str,
    org_id: str,
    actor: str = SYSTEM,
    **kwargs,
) -> dict:
    allowed = {"section_no", "description", "plea", "charge_framed", "charge_framed_date", "court", "notes"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return {}
    now = _now()
    fields["modified_at"] = now
    fields["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in fields)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_charges SET {set_clause} WHERE charge_id=? AND org_id=?",
            (*fields.values(), charge_id, org_id),
        )
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM matter_charges WHERE charge_id=?", (charge_id,)
        ).fetchone()
    return dict(row) if row else {}


def delete_matter_charge(charge_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_charges SET is_active=0, modified_at=?, modified_by=? "
            "WHERE charge_id=? AND org_id=?",
            (now, actor, charge_id, org_id),
        )


# ── Matter FIR — Task #148 ────────────────────────────────────────────────────

def get_matter_fir(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_fir WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY fir_date DESC, created_at DESC",
            (matter_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def create_matter_fir(matter_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    fir_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_fir (fir_id, org_id, matter_id, fir_number, police_station, "
            "district, io_name, complainant, arrest_date, sections_at_fir, "
            "sections_after_challan, fir_date, notes, created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (fir_id, org_id, matter_id,
             data.get("fir_number", ""), data.get("police_station", ""),
             data.get("district"), data.get("io_name"), data.get("complainant"),
             data.get("arrest_date"), data.get("sections_at_fir"),
             data.get("sections_after_challan"), data.get("fir_date"),
             data.get("notes"), now, actor, now, actor),
        )
        row = conn.execute("SELECT * FROM matter_fir WHERE fir_id=?", (fir_id,)).fetchone()
        return dict(row)


def update_matter_fir(fir_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    allowed = {"fir_number", "police_station", "district", "io_name", "complainant",
               "arrest_date", "sections_at_fir", "sections_after_challan", "fir_date", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_fir SET {set_clause} WHERE fir_id=? AND org_id=?",
            (*updates.values(), fir_id, org_id),
        )
        row = conn.execute("SELECT * FROM matter_fir WHERE fir_id=?", (fir_id,)).fetchone()
        return dict(row) if row else {}


def delete_matter_fir(fir_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_fir SET is_active=0, modified_at=?, modified_by=? "
            "WHERE fir_id=? AND org_id=?",
            (now, actor, fir_id, org_id),
        )


# ── Matter Challan — Task #149 ────────────────────────────────────────────────

CHALLAN_TYPES   = ("Complete", "Incomplete", "Supplementary")
CHALLAN_STATUSES = ("Pending", "Submitted", "Returned", "Accepted")

def get_matter_challan(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_challan WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY challan_date DESC, created_at DESC",
            (matter_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def create_matter_challan(matter_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    challan_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_challan (challan_id, org_id, matter_id, challan_date, challan_type, "
            "submitted_in_time, witnesses_count, challan_court, status, notes, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (challan_id, org_id, matter_id,
             data.get("challan_date"), data.get("challan_type", "Complete"),
             int(bool(data.get("submitted_in_time", True))),
             int(data.get("witnesses_count", 0)),
             data.get("challan_court"), data.get("status", "Pending"),
             data.get("notes"), now, actor, now, actor),
        )
        row = conn.execute("SELECT * FROM matter_challan WHERE challan_id=?", (challan_id,)).fetchone()
        return dict(row)


def update_matter_challan(challan_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    allowed = {"challan_date", "challan_type", "submitted_in_time", "witnesses_count",
               "challan_court", "status", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_challan SET {set_clause} WHERE challan_id=? AND org_id=?",
            (*updates.values(), challan_id, org_id),
        )
        row = conn.execute("SELECT * FROM matter_challan WHERE challan_id=?", (challan_id,)).fetchone()
        return dict(row) if row else {}


def delete_matter_challan(challan_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_challan SET is_active=0, modified_at=?, modified_by=? "
            "WHERE challan_id=? AND org_id=?",
            (now, actor, challan_id, org_id),
        )


# ── Court Fee Calculator — Task #152 ─────────────────────────────────────────

COURT_FEE_TYPES = ("Ad Valorem", "Fixed")

def compute_court_fee(claim_amount: float, fee_type: str = "Ad Valorem") -> float:
    """
    Punjab Court Fees Act slab calculator (approximate).
    Rates updated per Punjab Finance Act amendments; verify current gazette for exact rates.
    """
    if fee_type != "Ad Valorem" or claim_amount <= 0:
        return 0.0
    c = claim_amount
    if c <= 1_000:
        return round(max(20.0, c * 0.02), 2)
    elif c <= 5_000:
        return round(20 + (c - 1_000) * 0.01, 2)
    elif c <= 10_000:
        return round(60 + (c - 5_000) * 0.015, 2)
    elif c <= 50_000:
        return round(135 + (c - 10_000) * 0.02, 2)
    elif c <= 100_000:
        return round(935 + (c - 50_000) * 0.025, 2)
    elif c <= 500_000:
        return round(2185 + (c - 100_000) * 0.03, 2)
    elif c <= 1_000_000:
        return round(14185 + (c - 500_000) * 0.035, 2)
    else:
        return round(31685 + (c - 1_000_000) * 0.04, 2)


def get_court_fee_payments(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM court_fee_payments WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY payment_date DESC, created_at DESC",
            (matter_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def create_court_fee_payment(matter_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    fp_id = secrets.token_hex(10)
    now = _now()
    claim  = float(data.get("claim_amount_pkr", 0) or 0)
    ftype  = data.get("fee_type", "Ad Valorem")
    calc   = float(data.get("calculated_fee") or 0) or compute_court_fee(claim, ftype)
    actual = float(data.get("actual_paid", 0) or 0)
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO court_fee_payments (fee_payment_id, org_id, matter_id, claim_amount_pkr, "
            "fee_type, calculated_fee, actual_paid, payment_date, challan_no, court, notes, "
            "created_at, created_by, modified_at, modified_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (fp_id, org_id, matter_id, claim, ftype, calc, actual,
             data.get("payment_date"), data.get("challan_no"), data.get("court"),
             data.get("notes"), now, actor, now, actor),
        )
        row = conn.execute("SELECT * FROM court_fee_payments WHERE fee_payment_id=?", (fp_id,)).fetchone()
        return dict(row)


def update_court_fee_payment(fp_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    allowed = {"claim_amount_pkr", "fee_type", "calculated_fee", "actual_paid",
               "payment_date", "challan_no", "court", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE court_fee_payments SET {set_clause} WHERE fee_payment_id=? AND org_id=?",
            (*updates.values(), fp_id, org_id),
        )
        row = conn.execute("SELECT * FROM court_fee_payments WHERE fee_payment_id=?", (fp_id,)).fetchone()
        return dict(row) if row else {}


def delete_court_fee_payment(fp_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE court_fee_payments SET is_active=0, modified_at=?, modified_by=? "
            "WHERE fee_payment_id=? AND org_id=?",
            (now, actor, fp_id, org_id),
        )


# ── Associate / Wakeel Fees — Task #153 ──────────────────────────────────────

def get_associate_fees(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM associate_fees WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY appearance_date DESC, created_at DESC",
            (matter_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def get_associate_fees_summary(org_id: str) -> list[dict]:
    """Year-end summary: total paid per advocate across all matters."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT advocate_name, bar_no, COUNT(*) as appearances, "
            "SUM(amount_pkr) as total_amount, SUM(CASE WHEN paid=1 THEN amount_pkr ELSE 0 END) as total_paid "
            "FROM associate_fees WHERE org_id=? AND is_active=1 "
            "GROUP BY advocate_name, bar_no ORDER BY total_amount DESC",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def create_associate_fee(matter_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    af_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO associate_fees (assoc_fee_id, org_id, matter_id, advocate_name, bar_no, "
            "appearance_date, amount_pkr, paid, payment_date, notes, "
            "created_at, created_by, modified_at, modified_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (af_id, org_id, matter_id,
             data.get("advocate_name", ""), data.get("bar_no"),
             data.get("appearance_date"), float(data.get("amount_pkr", 0) or 0),
             int(bool(data.get("paid", False))), data.get("payment_date"),
             data.get("notes"), now, actor, now, actor),
        )
        row = conn.execute("SELECT * FROM associate_fees WHERE assoc_fee_id=?", (af_id,)).fetchone()
        return dict(row)


def update_associate_fee(af_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    allowed = {"advocate_name", "bar_no", "appearance_date", "amount_pkr", "paid", "payment_date", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    now = _now()
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE associate_fees SET {set_clause} WHERE assoc_fee_id=? AND org_id=?",
            (*updates.values(), af_id, org_id),
        )
        row = conn.execute("SELECT * FROM associate_fees WHERE assoc_fee_id=?", (af_id,)).fetchone()
        return dict(row) if row else {}


def delete_associate_fee(af_id: str, org_id: str, actor: str = SYSTEM):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE associate_fees SET is_active=0, modified_at=?, modified_by=? "
            "WHERE assoc_fee_id=? AND org_id=?",
            (now, actor, af_id, org_id),
        )


# ─── Task #154: Client Trust / Advance Money Ledger ──────────────────────────

TRUST_TXN_TYPES = ("Credit", "Debit")


def get_trust_ledger(client_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM client_trust_ledger WHERE client_id=? AND org_id=? AND is_active=1 "
            "ORDER BY txn_date ASC, created_at ASC",
            (client_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def get_trust_balance(client_id: str, org_id: str) -> float:
    """Return current running balance for client."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT balance_pkr FROM client_trust_ledger WHERE client_id=? AND org_id=? AND is_active=1 "
            "ORDER BY txn_date ASC, created_at ASC LIMIT 1 OFFSET -1",
            (client_id, org_id),
        ).fetchone()
        if row:
            return row["balance_pkr"]
        # Compute from scratch
        rows = conn.execute(
            "SELECT txn_type, amount_pkr FROM client_trust_ledger "
            "WHERE client_id=? AND org_id=? AND is_active=1",
            (client_id, org_id),
        ).fetchall()
        bal = 0.0
        for r in rows:
            bal += r["amount_pkr"] if r["txn_type"] == "Credit" else -r["amount_pkr"]
        return bal


def _recompute_balances(client_id: str, org_id: str, conn) -> None:
    """Recompute running balance column for all active entries of a client."""
    rows = conn.execute(
        "SELECT ledger_id, txn_type, amount_pkr FROM client_trust_ledger "
        "WHERE client_id=? AND org_id=? AND is_active=1 ORDER BY txn_date ASC, created_at ASC",
        (client_id, org_id),
    ).fetchall()
    bal = 0.0
    for r in rows:
        bal += r["amount_pkr"] if r["txn_type"] == "Credit" else -r["amount_pkr"]
        conn.execute(
            "UPDATE client_trust_ledger SET balance_pkr=? WHERE ledger_id=?",
            (round(bal, 2), r["ledger_id"]),
        )


def create_trust_entry(client_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    lid = secrets.token_hex(10)
    now = _now()
    txn_type = data.get("txn_type", "Credit")
    amount = float(data.get("amount_pkr", 0))
    with get_conn() as conn:
        # Compute balance from last entry
        last = conn.execute(
            "SELECT balance_pkr FROM client_trust_ledger WHERE client_id=? AND org_id=? AND is_active=1 "
            "ORDER BY txn_date ASC, created_at ASC",
            (client_id, org_id),
        ).fetchall()
        last_bal = last[-1]["balance_pkr"] if last else 0.0
        new_bal = round(last_bal + (amount if txn_type == "Credit" else -amount), 2)
        conn.execute(
            "INSERT INTO client_trust_ledger (ledger_id, org_id, client_id, matter_id, txn_type, "
            "amount_pkr, balance_pkr, description, txn_date, reference_no, notes, "
            "is_active, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
            (lid, org_id, client_id, data.get("matter_id"), txn_type, amount, new_bal,
             data.get("description", ""), data.get("txn_date", now[:10]),
             data.get("reference_no"), data.get("notes"), now, actor),
        )
        row = conn.execute("SELECT * FROM client_trust_ledger WHERE ledger_id=?", (lid,)).fetchone()
        return dict(row) if row else {}


def update_trust_entry(ledger_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    now = _now()
    allowed = {"txn_type", "amount_pkr", "description", "txn_date", "reference_no", "notes", "matter_id"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        # Get client_id for balance recompute
        row = conn.execute("SELECT client_id FROM client_trust_ledger WHERE ledger_id=?", (ledger_id,)).fetchone()
        conn.execute(
            f"UPDATE client_trust_ledger SET {set_clause} WHERE ledger_id=? AND org_id=?",
            (*updates.values(), ledger_id, org_id),
        )
        if row:
            _recompute_balances(row["client_id"], org_id, conn)
        row2 = conn.execute("SELECT * FROM client_trust_ledger WHERE ledger_id=?", (ledger_id,)).fetchone()
        return dict(row2) if row2 else {}


def delete_trust_entry(ledger_id: str, org_id: str, actor: str = SYSTEM) -> None:
    now = _now()
    with get_conn() as conn:
        row = conn.execute("SELECT client_id FROM client_trust_ledger WHERE ledger_id=?", (ledger_id,)).fetchone()
        conn.execute(
            "UPDATE client_trust_ledger SET is_active=0, modified_at=?, modified_by=? "
            "WHERE ledger_id=? AND org_id=?",
            (now, actor, ledger_id, org_id),
        )
        if row:
            _recompute_balances(row["client_id"], org_id, conn)


# ─── Task #155: Post-Dated / Undated Cheque Tracker ──────────────────────────

CHEQUE_TYPES    = ("Post-Dated", "Undated", "Bearer", "Crossed")
CHEQUE_STATUSES = ("Held", "Presented", "Cleared", "Bounced", "Returned", "Cancelled")


def get_matter_cheques(matter_id: str, org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matter_cheques WHERE matter_id=? AND org_id=? AND is_active=1 "
            "ORDER BY cheque_date ASC, created_at ASC",
            (matter_id, org_id),
        ).fetchall()
        return [dict(r) for r in rows]


def create_matter_cheque(matter_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    cid = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO matter_cheques (cheque_id, org_id, matter_id, client_id, cheque_no, bank_name, "
            "account_title, amount_pkr, cheque_date, cheque_type, status, received_date, "
            "presented_date, notes, is_active, created_at, created_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
            (cid, org_id, matter_id, data.get("client_id"), data.get("cheque_no", ""),
             data.get("bank_name"), data.get("account_title"), float(data.get("amount_pkr", 0)),
             data.get("cheque_date"), data.get("cheque_type", "Post-Dated"),
             data.get("status", "Held"), data.get("received_date"), data.get("presented_date"),
             data.get("notes"), now, actor),
        )
        row = conn.execute("SELECT * FROM matter_cheques WHERE cheque_id=?", (cid,)).fetchone()
        return dict(row) if row else {}


def update_matter_cheque(cheque_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    now = _now()
    allowed = {"cheque_no", "bank_name", "account_title", "amount_pkr", "cheque_date",
               "cheque_type", "status", "received_date", "presented_date", "notes", "client_id"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE matter_cheques SET {set_clause} WHERE cheque_id=? AND org_id=?",
            (*updates.values(), cheque_id, org_id),
        )
        row = conn.execute("SELECT * FROM matter_cheques WHERE cheque_id=?", (cheque_id,)).fetchone()
        return dict(row) if row else {}


def delete_matter_cheque(cheque_id: str, org_id: str, actor: str = SYSTEM) -> None:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE matter_cheques SET is_active=0, modified_at=?, modified_by=? "
            "WHERE cheque_id=? AND org_id=?",
            (now, actor, cheque_id, org_id),
        )


# ─── Task #158: Opposing Counsel & Judge Intelligence Notes ──────────────────

def get_opposing_counsel(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM opposing_counsel WHERE org_id=? AND is_active=1 ORDER BY name ASC",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def create_opposing_counsel(org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    cid = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO opposing_counsel (counsel_id, org_id, name, bar_no, firm_name, phone, email, "
            "court_preference, known_tactics, private_notes, is_active, created_at, created_by) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)",
            (cid, org_id, data.get("name", ""), data.get("bar_no"), data.get("firm_name"),
             data.get("phone"), data.get("email"), data.get("court_preference"),
             data.get("known_tactics"), data.get("private_notes"), now, actor),
        )
        row = conn.execute("SELECT * FROM opposing_counsel WHERE counsel_id=?", (cid,)).fetchone()
        return dict(row) if row else {}


def update_opposing_counsel(counsel_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    now = _now()
    allowed = {"name", "bar_no", "firm_name", "phone", "email", "court_preference", "known_tactics", "private_notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE opposing_counsel SET {set_clause} WHERE counsel_id=? AND org_id=?",
            (*updates.values(), counsel_id, org_id),
        )
        row = conn.execute("SELECT * FROM opposing_counsel WHERE counsel_id=?", (counsel_id,)).fetchone()
        return dict(row) if row else {}


def delete_opposing_counsel(counsel_id: str, org_id: str, actor: str = SYSTEM) -> None:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE opposing_counsel SET is_active=0, modified_at=?, modified_by=? WHERE counsel_id=? AND org_id=?",
            (now, actor, counsel_id, org_id),
        )


def get_judge_notes(org_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM judge_notes WHERE org_id=? AND is_active=1 ORDER BY name ASC",
            (org_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def create_judge_note(org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    jid = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO judge_notes (judge_id, org_id, name, court_name, designation, "
            "known_for, private_notes, is_active, created_at, created_by) VALUES (?,?,?,?,?,?,?,1,?,?)",
            (jid, org_id, data.get("name", ""), data.get("court_name"), data.get("designation"),
             data.get("known_for"), data.get("private_notes"), now, actor),
        )
        row = conn.execute("SELECT * FROM judge_notes WHERE judge_id=?", (jid,)).fetchone()
        return dict(row) if row else {}


def update_judge_note(judge_id: str, org_id: str, data: dict, actor: str = SYSTEM) -> dict:
    now = _now()
    allowed = {"name", "court_name", "designation", "known_for", "private_notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["modified_at"] = now
    updates["modified_by"] = actor
    set_clause = ", ".join(f"{k}=?" for k in updates)
    with get_conn() as conn:
        conn.execute(
            f"UPDATE judge_notes SET {set_clause} WHERE judge_id=? AND org_id=?",
            (*updates.values(), judge_id, org_id),
        )
        row = conn.execute("SELECT * FROM judge_notes WHERE judge_id=?", (judge_id,)).fetchone()
        return dict(row) if row else {}


def delete_judge_note(judge_id: str, org_id: str, actor: str = SYSTEM) -> None:
    now = _now()
    with get_conn() as conn:
        conn.execute(
            "UPDATE judge_notes SET is_active=0, modified_at=?, modified_by=? WHERE judge_id=? AND org_id=?",
            (now, actor, judge_id, org_id),
        )


# ── Feature Flags (Task #162) ─────────────────────────────────────────────────

FEATURE_KEYS: tuple[str, ...] = (
    "documents",     # Document Library
    "clients",       # Client Management
    "matters",       # Matter Management
    "calendar",      # Court Calendar
    "diary",         # Daily Diary
    "invoices",      # Invoices & Fees
    "team",          # Team Members
    "drafting",      # Document Drafting
    "causelist",     # Cause List
    "vakalat",       # Vakalatnama Register
    "intelligence",  # Counsel & Judge Intelligence
    "audit",         # Audit Log
    "client_portal", # Client Portal sharing
    "whatsapp",      # WhatsApp reminders
    "lhc_lookup",    # LHC Case Status lookup
    "wht_invoicing", # WHT tax invoicing (§153)
)

FEATURE_LABELS: dict[str, str] = {
    "documents":     "Document Library",
    "clients":       "Client Management",
    "matters":       "Matter Management",
    "calendar":      "Court Calendar",
    "diary":         "Daily Diary",
    "invoices":      "Invoices & Fees",
    "team":          "Team Members",
    "drafting":      "Document Drafting",
    "causelist":     "Cause List",
    "vakalat":       "Vakalatnama Register",
    "intelligence":  "Counsel Intelligence",
    "audit":         "Audit Log",
    "client_portal": "Client Portal",
    "whatsapp":      "WhatsApp",
    "lhc_lookup":    "LHC Lookup",
    "wht_invoicing": "WHT Invoicing",
}


def get_org_flags(org_id: str) -> dict[str, bool]:
    """Return feature flags for an org. Defaults to True (all enabled) for any missing key."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT feature, enabled FROM org_feature_flags WHERE org_id=?", (org_id,)
        ).fetchall()
    stored = {r["feature"]: bool(r["enabled"]) for r in rows}
    return {k: stored.get(k, True) for k in FEATURE_KEYS}


def set_org_flags(org_id: str, flags: dict, actor: str = SYSTEM) -> dict[str, bool]:
    """Upsert feature flags for an org. Unknown keys are silently ignored."""
    now = _now()
    with get_conn() as conn:
        for feature, enabled in flags.items():
            if feature not in FEATURE_KEYS:
                continue
            conn.execute(
                """INSERT INTO org_feature_flags(org_id, feature, enabled, modified_at, modified_by)
                   VALUES(?,?,?,?,?)
                   ON CONFLICT(org_id, feature) DO UPDATE SET
                       enabled=excluded.enabled,
                       modified_at=excluded.modified_at,
                       modified_by=excluded.modified_by""",
                (org_id, feature, 1 if enabled else 0, now, actor),
            )
    return get_org_flags(org_id)


def get_all_org_flags() -> list[dict]:
    """Return flags for every active org — used by admin feature-access panel."""
    with get_conn() as conn:
        orgs = conn.execute(
            "SELECT org_id, name FROM organizations WHERE is_active=1 ORDER BY name"
        ).fetchall()
    return [
        {"org_id": o["org_id"], "name": o["name"], "flags": get_org_flags(o["org_id"])}
        for o in orgs
    ]
