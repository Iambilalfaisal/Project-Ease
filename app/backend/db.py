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


def create_client(
    org_id: str, name: str, client_type: str = "Individual",
    email: Optional[str] = None, phone: Optional[str] = None,
    address: Optional[str] = None, cnic_ntn: Optional[str] = None,
    notes: Optional[str] = None, actor: str = SYSTEM,
) -> dict:
    client_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO clients
               (client_id, org_id, name, client_type, email, phone, address, cnic_ntn, notes,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (client_id, org_id, name, client_type, email, phone, address, cnic_ntn, notes,
             now, actor, now, actor),
        )
    return {"client_id": client_id, "org_id": org_id, "name": name,
            "client_type": client_type, "created_at": now, "matter_count": 0}


def update_client(client_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"name", "client_type", "email", "phone", "address", "cnic_ntn", "notes"}
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
                       COUNT(DISTINCT CASE WHEN d.is_active=1 THEN d.doc_id END) AS doc_count
                FROM matters m
                LEFT JOIN clients c ON c.client_id = m.client_id
                LEFT JOIN matter_teams t ON t.team_id = m.team_id
                LEFT JOIN documents d ON d.matter_id = m.matter_id
                WHERE {where}
                GROUP BY m.matter_id
                ORDER BY m.created_at DESC""",
            params,
        ).fetchall()
        return [dict(r) for r in rows]


def create_matter(
    org_id: str, client_id: str, title: str, matter_type: str,
    status: str = "Active", court_name: Optional[str] = None,
    case_number: Optional[str] = None, filing_date: Optional[str] = None,
    opposing_party: Optional[str] = None, team_id: Optional[str] = None,
    notes: Optional[str] = None, actor: str = SYSTEM,
) -> dict:
    matter_id = secrets.token_hex(10)
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO matters
               (matter_id, org_id, client_id, title, matter_type, status,
                court_name, case_number, filing_date, opposing_party, team_id, notes,
                created_at, created_by, modified_at, modified_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (matter_id, org_id, client_id, title, matter_type, status,
             court_name, case_number, filing_date, opposing_party, team_id, notes,
             now, actor, now, actor),
        )
    return {"matter_id": matter_id, "org_id": org_id, "client_id": client_id,
            "title": title, "matter_type": matter_type, "status": status, "created_at": now}


def update_matter(matter_id: str, org_id: str, actor: str = SYSTEM, **fields) -> Optional[dict]:
    allowed = {"title", "matter_type", "status", "court_name", "case_number",
               "filing_date", "opposing_party", "team_id", "notes", "client_id"}
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
            """SELECT m.*, c.name AS client_name, t.name AS team_name
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


def create_invoice(
    org_id: str, matter_id: str, title: str, issued_date: str,
    client_id: Optional[str] = None,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    actor: str = SYSTEM,
) -> dict:
    """Create an invoice and link all unbilled fees for the matter to it."""
    now  = _now()
    inv_id = "inv_" + secrets.token_hex(8)
    with get_conn() as conn:
        inv_num = _next_invoice_number(org_id, conn)
        # Sum unbilled fees for the matter
        row = conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM fees WHERE matter_id=? AND org_id=? AND is_active=1 AND invoice_id IS NULL",
            (matter_id, org_id),
        ).fetchone()
        total = row[0] if row else 0
        conn.execute(
            """INSERT INTO invoices
               (invoice_id,org_id,matter_id,client_id,invoice_number,title,
                issued_date,due_date,total_amount,notes,
                created_at,created_by,modified_at,modified_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (inv_id, org_id, matter_id, client_id or None, inv_num, title,
             issued_date, due_date or None, total, notes or None,
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
