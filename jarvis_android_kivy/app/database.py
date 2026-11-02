"""
SQLite persistent storage for JARVIS AI conversations and settings.
"""
import sqlite3
import time
from typing import List, Dict, Optional


class JarvisDatabase:
    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()

    def _init_tables(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                updated_at REAL NOT NULL,
                model TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp REAL NOT NULL,
                model TEXT NOT NULL
            )
            """
        )
        self.conn.commit()

    def set_setting(self, key: str, value: str) -> None:
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
        self.conn.commit()

    def get_setting(self, key: str, default: str = "") -> str:
        cur = self.conn.cursor()
        cur.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cur.fetchone()
        return row["value"] if row else default

    def save_message(
        self, conversation_id: str, role: str, content: str, model: str = "gemini-3.8-flash"
    ) -> None:
        now = time.time()
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT OR IGNORE INTO conversations (id, title, updated_at, model)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, content[:36] or "Session", now, model),
        )
        cur.execute(
            "UPDATE conversations SET updated_at = ?, model = ? WHERE id = ?",
            (now, model, conversation_id),
        )
        cur.execute(
            """
            INSERT INTO messages (conversation_id, role, content, timestamp, model)
            VALUES (?, ?, ?, ?, ?)
            """,
            (conversation_id, role, content, now, model),
        )
        self.conn.commit()

    def get_messages(self, conversation_id: str) -> List[Dict[str, str]]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT role, content, model, timestamp FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        )
        return [dict(r) for r in cur.fetchall()]

    def search_conversations(self, query: str) -> List[Dict[str, str]]:
        cur = self.conn.cursor()
        like_q = f"%{query}%"
        cur.execute(
            """
            SELECT DISTINCT c.id, c.title, c.model
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.title LIKE ? OR m.content LIKE ?
            ORDER BY c.updated_at DESC
            """,
            (like_q, like_q),
        )
        return [dict(r) for r in cur.fetchall()]

    def delete_conversation(self, conversation_id: str) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        cur.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        self.conn.commit()

    def clear_all_conversations(self) -> None:
        cur = self.conn.cursor()
        cur.execute("DELETE FROM messages")
        cur.execute("DELETE FROM conversations")
        self.conn.commit()
