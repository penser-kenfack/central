import sqlite3, os
from datetime import datetime

DB = os.environ.get("WVS_DB", os.path.join(os.path.dirname(__file__), "scanner.db"))

SCAN_COLUMNS = {
    "status": "TEXT DEFAULT 'queued'", "progress": "INTEGER DEFAULT 0", "message": "TEXT", "pages": "INTEGER DEFAULT 0",
    "forms": "INTEGER DEFAULT 0", "urls": "INTEGER DEFAULT 0", "score": "INTEGER", "grade": "TEXT", "error": "TEXT", "finished_at": "TIMESTAMP",
}


def conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    c = conn()
    c.executescript("""CREATE TABLE IF NOT EXISTS scans(id INTEGER PRIMARY KEY AUTOINCREMENT,target TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS findings(id INTEGER PRIMARY KEY AUTOINCREMENT,scan_id INTEGER,title TEXT,severity TEXT,source TEXT,url TEXT,description TEXT,evidence TEXT,recommendation TEXT,category TEXT);
    CREATE TABLE IF NOT EXISTS pages(id INTEGER PRIMARY KEY AUTOINCREMENT,scan_id INTEGER,url TEXT,status INTEGER,content_type TEXT,length INTEGER);""")
    # older databases: add the columns introduced by this version
    have = {r["name"] for r in c.execute("PRAGMA table_info(scans)")}
    for name, ddl in SCAN_COLUMNS.items():
        if name not in have:
            c.execute(f"ALTER TABLE scans ADD COLUMN {name} {ddl}")
    if "category" not in {r["name"] for r in c.execute("PRAGMA table_info(findings)")}:
        c.execute("ALTER TABLE findings ADD COLUMN category TEXT")
    c.commit(); c.close()


def create_scan(target):
    # local time, like finished_at (SQLite CURRENT_TIMESTAMP would be UTC)
    c = conn(); x = c.execute("INSERT INTO scans(target, created_at) VALUES(?, ?)", (target, datetime.now().isoformat(sep=' ', timespec='seconds')))
    c.commit(); i = x.lastrowid; c.close(); return i


def update_scan(i, **fields):
    """Persist the live status so that results survive a server restart."""
    fields = {k: v for k, v in fields.items() if k in SCAN_COLUMNS}
    if not fields:
        return
    c = conn()
    c.execute(f"UPDATE scans SET {', '.join(k + '=?' for k in fields)} WHERE id=?", (*fields.values(), i))
    c.commit(); c.close()


def save_findings(i, fs):
    c = conn(); c.execute("DELETE FROM findings WHERE scan_id=?", (i,))
    c.executemany("INSERT INTO findings(scan_id,title,severity,source,url,description,evidence,recommendation,category) VALUES(?,?,?,?,?,?,?,?,?)",
                  [(i, f["title"], f["severity"], f["source"], f["url"], f["description"], f["evidence"], f["recommendation"], f.get("category")) for f in fs])
    c.commit(); c.close()


def save_pages(i, pages):
    c = conn(); c.execute("DELETE FROM pages WHERE scan_id=?", (i,))
    c.executemany("INSERT INTO pages(scan_id,url,status,content_type,length) VALUES(?,?,?,?,?)",
                  [(i, p["url"], p["status"], p["content_type"], p["length"]) for p in pages])
    c.commit(); c.close()


def get_scans():
    c = conn(); r = c.execute("SELECT * FROM scans ORDER BY id DESC").fetchall(); c.close(); return r


def get_scan(i):
    c = conn(); r = c.execute("SELECT * FROM scans WHERE id=?", (i,)).fetchone(); c.close(); return r


def get_findings(i):
    c = conn(); r = c.execute("SELECT * FROM findings WHERE scan_id=? ORDER BY id", (i,)).fetchall(); c.close(); return r


def get_pages(i):
    c = conn(); r = c.execute("SELECT * FROM pages WHERE scan_id=? ORDER BY id", (i,)).fetchall(); c.close(); return r
