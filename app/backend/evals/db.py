"""
SQLite database for Project Ease eval results.
Stores per-query retrieval quality metrics (precision@k, answer relevance).
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "eval_results.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # rows behave like dicts
    return conn


def init_db():
    """Create tables if they don't exist. Safe to call on every startup."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS eval_results (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp               TEXT    NOT NULL DEFAULT (datetime('now')),
                organization_id         TEXT,
                original_query          TEXT    NOT NULL,
                rewritten_query         TEXT,
                retrieved_docs          TEXT,   -- JSON array of sourcepage strings
                answer                  TEXT,
                precision_at_k          REAL,   -- fraction of retrieved docs judged relevant (0.0 - 1.0)
                answer_relevance_score  REAL,   -- LLM-judged relevance 1-5
                answer_relevance_reason TEXT,
                model                   TEXT,
                latency_ms              INTEGER
            )
        """)
        conn.commit()


def insert_eval(
    organization_id: str | None,
    original_query: str,
    rewritten_query: str | None,
    retrieved_docs: list[str],
    answer: str,
    precision_at_k: float | None,
    answer_relevance_score: float | None,
    answer_relevance_reason: str | None,
    model: str,
    latency_ms: int,
):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO eval_results
                (organization_id, original_query, rewritten_query, retrieved_docs,
                 answer, precision_at_k, answer_relevance_score, answer_relevance_reason,
                 model, latency_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                organization_id,
                original_query,
                rewritten_query,
                json.dumps(retrieved_docs),
                answer,
                precision_at_k,
                answer_relevance_score,
                answer_relevance_reason,
                model,
                latency_ms,
            ),
        )
        conn.commit()


def fetch_recent(limit: int = 50) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM eval_results
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def fetch_summary(organization_id: str | None = None) -> dict:
    """Aggregate stats — optionally scoped to one org."""
    filter_clause = "WHERE organization_id = ?" if organization_id else ""
    params = (organization_id,) if organization_id else ()

    with get_connection() as conn:
        row = conn.execute(
            f"""
            SELECT
                COUNT(*)                        AS total_queries,
                ROUND(AVG(precision_at_k), 3)   AS avg_precision_at_k,
                ROUND(AVG(answer_relevance_score), 2) AS avg_answer_relevance,
                ROUND(AVG(latency_ms))          AS avg_latency_ms
            FROM eval_results
            {filter_clause}
            """,
            params,
        ).fetchone()
    return dict(row)
