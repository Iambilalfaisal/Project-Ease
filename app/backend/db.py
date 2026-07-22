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

PLAN_DEFAULTS = {
    "free":       {"max_docs": 20,       "max_users": 5},
    "pro":        {"max_docs": 500,      "max_users": 25},
    "enterprise": {"max_docs": 9_999_999,"max_users": 9_999_999},
}


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
