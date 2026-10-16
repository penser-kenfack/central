import sqlite3,os
DB=os.path.join(os.path.dirname(__file__),"scanner.db")
def conn():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c
def init_db():
    c=conn(); c.executescript("""CREATE TABLE IF NOT EXISTS scans(id INTEGER PRIMARY KEY AUTOINCREMENT,target TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS findings(id INTEGER PRIMARY KEY AUTOINCREMENT,scan_id INTEGER,title TEXT,severity TEXT,source TEXT,url TEXT,description TEXT,evidence TEXT,recommendation TEXT);"""); c.commit(); c.close()
def create_scan(target):
    c=conn(); x=c.execute("INSERT INTO scans(target) VALUES(?)",(target,)); c.commit(); i=x.lastrowid;c.close();return i
def save_findings(i,fs):
    c=conn(); c.execute("DELETE FROM findings WHERE scan_id=?",(i,))
    c.executemany("INSERT INTO findings(scan_id,title,severity,source,url,description,evidence,recommendation) VALUES(?,?,?,?,?,?,?,?)",
    [(i,f["title"],f["severity"],f["source"],f["url"],f["description"],f["evidence"],f["recommendation"]) for f in fs]);c.commit();c.close()
def get_scans():
    c=conn();r=c.execute("SELECT * FROM scans ORDER BY id DESC").fetchall();c.close();return r
def get_scan(i):
    c=conn();r=c.execute("SELECT * FROM scans WHERE id=?",(i,)).fetchone();c.close();return r
def get_findings(i):
    c=conn();r=c.execute("SELECT * FROM findings WHERE scan_id=? ORDER BY id",(i,)).fetchall();c.close();return r
