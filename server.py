#!/usr/bin/env python3
"""
Society Election System - offline voting server
------------------------------------------------
Runs completely without internet. Uses only Python's built-in libraries.

    python3 server.py            # booth + admin on this computer only
    python3 server.py --lan      # also let other devices on the local Wi-Fi
                                 # open the Admin panel / Results display
    python3 server.py --port 9000

Votes can ONLY be cast from the computer that runs this server (the booth),
even in --lan mode.
"""
import argparse
import base64
import csv
import hashlib
import hmac
import io
import json
import math
import os
import re
import secrets
import shutil
import socket
import sqlite3
import sys
import threading
import time
import traceback
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
DATA_DIR = os.path.join(BASE_DIR, "data")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
DB_PATH = os.path.join(DATA_DIR, "election.db")

os.makedirs(BACKUP_DIR, exist_ok=True)

DB_LOCK = threading.RLock()
CONN = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
CONN.row_factory = sqlite3.Row
CONN.execute("PRAGMA journal_mode=WAL")
CONN.execute("PRAGMA synchronous=FULL")
CONN.execute("PRAGMA foreign_keys=ON")

ADMIN_SESSIONS = {}      # token -> expiry
VOTE_SESSIONS = {}       # token -> {"voter_id", "exp"}
FAILED_ATTEMPTS = {}     # voter_id -> count
CHANGE_COUNTER = {"n": 0, "backed_up": 0}

DEFAULT_SETTINGS = {
    "society_name": "Our Housing Society",
    "election_name": "AOA Election 2026",
    "status": "setup",               # setup | open | paused | closed
    "face_threshold": "0.50",        # lower = stricter
    "require_face": "1",
    "liveness": "0",                 # ask voter to blink
    "one_vote_per_flat": "1",        # weight belongs to the flat, so one vote per flat
    "block_weights": "[]",           # [{"block":"A","area":1500,"weight":1.25}, ...]
    "default_weight": "1",           # weight for flats whose block is not in the table
    "cross_team": "1",               # voters may mix candidates from different teams
    "must_fill_all": "0",            # voters must choose exactly all seats
    "max_face_attempts": "3",
    "public_live_results": "0",      # show counts on Results display while voting is on
    "booth_idle_seconds": "150",
    "next_voter_no": "1",
    "opened_at": "",
    "closed_at": "",
}


# --------------------------------------------------------------------------- DB
def init_db():
    with DB_LOCK:
        c = CONN
        c.executescript("""
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, name_hi TEXT DEFAULT '',
            seats INTEGER NOT NULL DEFAULT 1, sort INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            color TEXT DEFAULT '#1d4e9e', symbol TEXT DEFAULT '', sort INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            name TEXT NOT NULL, flat TEXT DEFAULT '', symbol TEXT DEFAULT '',
            photo TEXT DEFAULT '', sort INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS voters (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, flat TEXT NOT NULL,
            phone TEXT DEFAULT '', id_type TEXT DEFAULT '', id_number TEXT DEFAULT '',
            photo TEXT DEFAULT '', descriptor TEXT DEFAULT '',
            has_voted INTEGER NOT NULL DEFAULT 0, voted_at TEXT DEFAULT '',
            verify_method TEXT DEFAULT '', created_at TEXT);
        -- Ballots are stored WITHOUT voter id, WITHOUT time and WITHOUT insertion
        -- order (random primary key, WITHOUT ROWID) => secret ballot.
        CREATE TABLE IF NOT EXISTS ballots (
            ballot_id TEXT PRIMARY KEY, choices TEXT NOT NULL, sig TEXT NOT NULL
        ) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL,
            event TEXT NOT NULL, voter_id TEXT DEFAULT '', detail TEXT DEFAULT '',
            snapshot TEXT DEFAULT '');
        CREATE TRIGGER IF NOT EXISTS ballots_no_update BEFORE UPDATE ON ballots
            BEGIN SELECT RAISE(ABORT, 'Ballots cannot be changed'); END;
        """)
        # upgrades for databases created by older versions
        add_col("candidates", "team_id", "INTEGER")
        add_col("voters", "weight", "TEXT DEFAULT ''")
        add_col("ballots", "weight", "REAL NOT NULL DEFAULT 1")
        for k, v in DEFAULT_SETTINGS.items():
            c.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
        c.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('hmac_key',?)",
                  (secrets.token_hex(32),))


def add_col(table, col, decl):
    cols = [r["name"] for r in CONN.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        CONN.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")


def S(key):
    r = CONN.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return r["value"] if r else DEFAULT_SETTINGS.get(key, "")


def set_s(key, value):
    CONN.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (key, str(value)))


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def audit(event, voter_id="", detail="", snapshot=""):
    CONN.execute("INSERT INTO audit(ts,event,voter_id,detail,snapshot) VALUES(?,?,?,?,?)",
                 (now(), event, voter_id or "", detail or "", snapshot or ""))
    CHANGE_COUNTER["n"] += 1


def hash_pin(pin, salt=None):
    salt = salt or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", str(pin).encode(), salt.encode(), 120000).hex()
    return f"{salt}${h}"


def check_pin(pin, stored):
    if not stored or "$" not in stored:
        return False
    salt = stored.split("$")[0]
    return hmac.compare_digest(hash_pin(pin, salt), stored)


def sign_ballot(ballot_id, choices_json, weight):
    key = S("hmac_key").encode()
    return hmac.new(key, f"{ballot_id}|{choices_json}|{fmt_w(weight)}".encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------- vote weights
def fmt_w(w):
    return f"{float(w):.4f}"


def block_of(flat):
    """'A-101' -> 'A', 'D 204' -> 'D', 'T2-1203' -> 'T2', '1203' -> ''."""
    f = (flat or "").strip().upper()
    m = re.match(r"^([A-Z]+[0-9]*)\s*[-/ ]", f) or re.match(r"^([A-Z]+)", f)
    return m.group(1) if m else ""


def weight_table():
    try:
        t = json.loads(S("block_weights") or "[]")
    except Exception:
        t = []
    return {str(x.get("block", "")).strip().upper(): float(x.get("weight") or 0) for x in t if x.get("block")}


def voter_weight(v, table=None):
    ov = (v["weight"] or "").strip() if "weight" in v.keys() else ""
    if ov:
        try:
            return round(float(ov), 4)
        except ValueError:
            pass
    table = weight_table() if table is None else table
    b = block_of(v["flat"])
    if b in table:
        return round(table[b], 4)
    return round(float(S("default_weight") or 1), 4)


def wnum(x):
    """Pretty number: 3.0 -> 3, 2.5 -> 2.5, 1.25 -> 1.25"""
    x = round(float(x), 2)
    return int(x) if x == int(x) else x


def distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def rows(sql, args=()):
    return [dict(r) for r in CONN.execute(sql, args).fetchall()]


# ---------------------------------------------------------------- data helpers
def get_teams():
    return rows("SELECT * FROM teams ORDER BY sort, id")


def get_posts(with_photos=True):
    posts = rows("SELECT * FROM posts ORDER BY sort, id")
    tsort = {t["id"]: i for i, t in enumerate(get_teams())}
    cands = rows("SELECT * FROM candidates ORDER BY sort, id")
    cands.sort(key=lambda c: (tsort.get(c["team_id"], 9999), c["sort"], c["id"]))
    for p in posts:
        p["candidates"] = []
        for c in cands:
            if c["post_id"] == p["id"]:
                if not with_photos:
                    c = {k: v for k, v in c.items() if k != "photo"}
                p["candidates"].append(c)
    return posts


def voter_public(v, photo=True):
    d = {
        "id": v["id"], "name": v["name"], "flat": v["flat"],
        "has_voted": bool(v["has_voted"]), "face_enrolled": bool(v["descriptor"]),
        "weight": wnum(voter_weight(v)),
    }
    if photo:
        d["photo"] = v["photo"]
    return d


def flat_has_voted(flat):
    r = CONN.execute("SELECT COUNT(*) n FROM voters WHERE lower(flat)=lower(?) AND has_voted=1",
                     (flat,)).fetchone()
    return r["n"] > 0


def compute_results():
    posts = get_posts(with_photos=False)
    teams = {t["id"]: t for t in get_teams()}
    ballots = rows("SELECT choices, weight FROM ballots")
    counts, wsum = {}, {}
    nota, wnota = {}, {}
    for b in ballots:
        ch = json.loads(b["choices"])
        w = float(b["weight"] or 1)
        for pid, sel in ch.items():
            for s in sel:
                if s == "NOTA":
                    nota[pid] = nota.get(pid, 0) + 1
                    wnota[pid] = wnota.get(pid, 0) + w
                else:
                    k = (pid, str(s))
                    counts[k] = counts.get(k, 0) + 1
                    wsum[k] = wsum.get(k, 0) + w
    out = []
    for p in posts:
        pid = str(p["id"])
        cs = []
        for c in p["candidates"]:
            k = (pid, str(c["id"]))
            cs.append({"id": c["id"], "name": c["name"], "flat": c["flat"], "symbol": c["symbol"],
                       "team_id": c["team_id"], "votes": counts.get(k, 0), "wvotes": wnum(wsum.get(k, 0))})
        # rank by weighted total; head-count only decides display order of equals
        ranked = sorted(cs, key=lambda x: (-x["wvotes"], -x["votes"]))
        winners, tie = [], False
        seats = p["seats"]
        if ranked and ranked[0]["wvotes"] > 0:
            if len(ranked) > seats and ranked[seats - 1]["wvotes"] == ranked[seats]["wvotes"]:
                tie = True
            cutoff = ranked[min(seats, len(ranked)) - 1]["wvotes"]
            winners = [c["id"] for c in ranked if c["wvotes"] >= cutoff and c["wvotes"] > 0]
        team_sum = []
        tids = [c["team_id"] for c in cs if c["team_id"]]
        for tid in dict.fromkeys(tids):
            t = teams.get(tid)
            if not t:
                continue
            mine = [c for c in cs if c["team_id"] == tid]
            team_sum.append({"id": tid, "name": t["name"], "color": t["color"], "symbol": t["symbol"],
                             "candidates": len(mine),
                             "seats_won": sum(1 for c in mine if c["id"] in winners),
                             "wvotes": wnum(sum(c["wvotes"] for c in mine))})
        team_sum.sort(key=lambda x: (-x["seats_won"], -x["wvotes"]))
        out.append({"id": p["id"], "name": p["name"], "name_hi": p["name_hi"],
                    "seats": seats, "candidates": cs, "nota": nota.get(pid, 0),
                    "wnota": wnum(wnota.get(pid, 0)), "leaders": winners, "tie": tie,
                    "teams": team_sum})
    return out


def counts():
    r = CONN.execute("""SELECT COUNT(*) total, SUM(has_voted) voted,
                        SUM(CASE WHEN descriptor!='' THEN 1 ELSE 0 END) faces,
                        COUNT(DISTINCT lower(flat)) flats FROM voters""").fetchone()
    total = r["total"] or 0
    voted = r["voted"] or 0
    fv = CONN.execute("SELECT COUNT(DISTINCT lower(flat)) n FROM voters WHERE has_voted=1").fetchone()["n"]
    br = CONN.execute("SELECT COUNT(*) n, COALESCE(SUM(weight),0) w FROM ballots").fetchone()
    ballots, wcast = br["n"], br["w"]
    # total vote value that could be cast
    table = weight_table()
    wtotal = 0.0
    if S("one_vote_per_flat") == "1":
        per_flat = {}
        for v in CONN.execute("SELECT flat, weight FROM voters").fetchall():
            f = v["flat"].lower()
            per_flat[f] = max(per_flat.get(f, 0), voter_weight(v, table))
        wtotal = sum(per_flat.values())
    else:
        wtotal = sum(voter_weight(v, table) for v in CONN.execute("SELECT flat, weight FROM voters").fetchall())
    eligible = (r["flats"] or 0) if S("one_vote_per_flat") == "1" else total
    return {"registered": total, "voted": voted, "faces": r["faces"] or 0,
            "flats": r["flats"] or 0, "flats_voted": fv, "ballots": ballots,
            "eligible": eligible,
            "turnout": round(100.0 * ballots / eligible, 1) if eligible else 0,
            "weight_cast": wnum(wcast), "weight_total": wnum(wtotal),
            "weighted_turnout": round(100.0 * wcast / wtotal, 1) if wtotal else 0}


def integrity():
    bad = 0
    items = []
    for b in rows("SELECT * FROM ballots ORDER BY ballot_id"):
        ok = hmac.compare_digest(sign_ballot(b["ballot_id"], b["choices"], b["weight"]), b["sig"])
        if not ok:
            bad += 1
        items.append(f"{b['ballot_id']}:{b['sig']}")
    c = counts()
    fp = hashlib.sha256("\n".join(items).encode()).hexdigest()
    ok = bad == 0 and c["ballots"] == c["voted"]
    return {"ok": ok, "ballots": c["ballots"], "voters_marked_voted": c["voted"],
            "bad_signatures": bad, "fingerprint": fp[:16].upper()}


def timeline():
    last_reset = CONN.execute("SELECT COALESCE(MAX(id),0) n FROM audit WHERE event='VOTES_RESET'").fetchone()["n"]
    evs = rows("SELECT ts FROM audit WHERE event='VOTE_CAST' AND id>? ORDER BY id", (last_reset,))
    buckets = {}
    for e in evs:
        t = datetime.strptime(e["ts"], "%Y-%m-%d %H:%M:%S")
        key = t.replace(minute=(t.minute // 15) * 15, second=0).strftime("%H:%M")
        buckets[key] = buckets.get(key, 0) + 1
    return [{"t": k, "n": v} for k, v in buckets.items()]


# --------------------------------------------------------------------- backups
def backup(tag="auto"):
    with DB_LOCK:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = os.path.join(BACKUP_DIR, f"election-{stamp}-{tag}.db")
        dst = sqlite3.connect(path)
        CONN.backup(dst)
        dst.close()
        latest = sqlite3.connect(os.path.join(BACKUP_DIR, "latest.db"))
        CONN.backup(latest)
        latest.close()
        CHANGE_COUNTER["backed_up"] = CHANGE_COUNTER["n"]
    files = sorted(f for f in os.listdir(BACKUP_DIR) if f.startswith("election-"))
    for f in files[:-60]:
        try:
            os.remove(os.path.join(BACKUP_DIR, f))
        except OSError:
            pass
    return os.path.basename(path)


def quick_mirror():
    """Keep data/backups/latest.db always up-to-date (called after each vote)."""
    with DB_LOCK:
        latest = sqlite3.connect(os.path.join(BACKUP_DIR, "latest.db"))
        CONN.backup(latest)
        latest.close()


def backup_loop():
    while True:
        time.sleep(300)
        try:
            if CHANGE_COUNTER["n"] != CHANGE_COUNTER["backed_up"]:
                backup("auto")
        except Exception:
            traceback.print_exc()


# --------------------------------------------------------------------- sample
def load_sample():
    with DB_LOCK:
        if CONN.execute("SELECT COUNT(*) n FROM posts").fetchone()["n"]:
            raise ValueError("Posts already exist. Sample data can only be loaded into an empty election.")
        teams = [
            ("Team Green", "#15803d", "🍃", ["Ramesh Sharma A-101", "Sunita Verma B-204", "Anil Kapoor C-302", "Priya Nair A-305",
                                            "Vikram Singh D-102", "Meena Joshi B-110", "Rajiv Mehta C-208", "Kavita Rao A-202",
                                            "Deepak Gupta B-301", "Farhan Ali C-104"]),
            ("Team Yellow", "#a16207", "🌻", ["Lakshmi Iyer D-210", "Harpreet Kaur A-410", "Sameer Khan B-402", "Neha Agarwal C-110",
                                             "Rohit Bansal D-305", "Anjali Desai A-108", "Manoj Tiwari B-215", "Shalini Gupta C-406",
                                             "Imran Qureshi D-120", "Pallavi Joshi A-312"]),
            ("Team Orange", "#ea580c", "🍊", ["Vivek Chauhan B-118", "Ritu Malhotra C-221", "Sandeep Yadav D-401", "Fatima Shaikh A-215",
                                             "Gaurav Sethi B-309", "Kiran Bedi C-115", "Ashok Pandey D-211", "Nisha Rawat A-404",
                                             "Tarun Arora B-122", "Swati Kulkarni C-318"]),
        ]
        cur = CONN.execute("INSERT INTO posts(name,name_hi,seats,sort) VALUES(?,?,?,?)",
                           ("Managing Committee", "प्रबंध समिति", 10, 0))
        post_id = cur.lastrowid
        for i, (tn, col, sym, members) in enumerate(teams):
            t = CONN.execute("INSERT INTO teams(name,color,symbol,sort) VALUES(?,?,?,?)", (tn, col, sym, i)).lastrowid
            for j, m in enumerate(members):
                nm, fl = m.rsplit(" ", 1)
                CONN.execute("INSERT INTO candidates(post_id,team_id,name,flat,symbol,sort) VALUES(?,?,?,?,?,?)",
                             (post_id, t, nm, fl, sym, j))
        if S("block_weights") in ("", "[]"):
            set_s("block_weights", json.dumps([
                {"block": "A", "area": 1500, "weight": 1.25}, {"block": "B", "area": 1200, "weight": 1.0},
                {"block": "C", "area": 1800, "weight": 1.5}, {"block": "D", "area": 2100, "weight": 1.75}]))
        if not CONN.execute("SELECT COUNT(*) n FROM voters").fetchone()["n"]:
            for name, flat in [("Asha Kulkarni", "A-101"), ("Mohan Das", "A-102"), ("Geeta Bhatia", "A-201"), ("Kunal Shah", "A-204"),
                               ("Ramesh Sharma", "A-301"), ("Pallavi Joshi", "A-312"), ("Nisha Rawat", "A-404"), ("Harpreet Kaur", "A-410"),
                               ("Rahul Mishra", "A-502"), ("Seema Kohli", "A-506"),
                               ("Sanjay Malhotra", "B-101"), ("Nirmala Devi", "B-102"), ("Meena Joshi", "B-110"), ("Tarun Arora", "B-122"),
                               ("Arjun Reddy", "B-202"), ("Sunita Verma", "B-204"), ("Manoj Tiwari", "B-215"), ("Gaurav Sethi", "B-309"),
                               ("Sameer Khan", "B-402"), ("Alka Sinha", "B-405"),
                               ("Pooja Saxena", "C-101"), ("Farhan Ali", "C-104"), ("Neha Agarwal", "C-110"), ("Kiran Bedi", "C-115"),
                               ("Suresh Pillai", "C-201"), ("Rajiv Mehta", "C-208"), ("Ritu Malhotra", "C-221"), ("Anil Kapoor", "C-302"),
                               ("Swati Kulkarni", "C-318"), ("Shalini Gupta", "C-406"),
                               ("Rekha Menon", "D-101"), ("Vikram Singh", "D-102"), ("Imran Qureshi", "D-120"), ("Gopal Krishnan", "D-202"),
                               ("Lakshmi Iyer", "D-210"), ("Ashok Pandey", "D-211"), ("Usha Rani", "D-303"), ("Rohit Bansal", "D-305"),
                               ("Sandeep Yadav", "D-401"), ("Bhavna Chopra", "D-406")]:
                add_voter({"name": name, "flat": flat, "id_type": "Society ID Card"})
        audit("SAMPLE_DATA", detail="Sample: Team Green, Team Yellow, Team Orange (10 each), block weights and 40 voters loaded")


def check_weight(w):
    w = str(w or "").strip()
    if not w:
        return ""
    try:
        f = float(w)
    except ValueError:
        raise ValueError("Vote weight must be a number like 1.25")
    if f <= 0:
        raise ValueError("Vote weight must be more than 0")
    return str(round(f, 4))


def add_voter(d):
    name = (d.get("name") or "").strip()
    flat = (d.get("flat") or "").strip().upper()
    if not name or not flat:
        raise ValueError("Name and Flat number are required")
    n = int(S("next_voter_no") or "1")
    vid = f"V{n:04d}"
    while CONN.execute("SELECT 1 FROM voters WHERE id=?", (vid,)).fetchone():
        n += 1
        vid = f"V{n:04d}"
    set_s("next_voter_no", n + 1)
    CONN.execute("""INSERT INTO voters(id,name,flat,phone,id_type,id_number,weight,created_at)
                    VALUES(?,?,?,?,?,?,?,?)""",
                 (vid, name, flat, (d.get("phone") or "").strip(), (d.get("id_type") or "").strip(),
                  (d.get("id_number") or "").strip(), check_weight(d.get("weight", "")), now()))
    CHANGE_COUNTER["n"] += 1
    return vid


# ------------------------------------------------------------------- handler
class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.code = code


MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".json": "application/json", ".bin": "application/octet-stream",
        ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
        ".wav": "audio/wav", ".mp3": "audio/mpeg"}


class Handler(BaseHTTPRequestHandler):
    server_version = "SocietyElection/1.0"

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet

    # ---- helpers
    def is_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file_bytes(self, data, ctype, filename=None):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 25 * 1024 * 1024:
            raise ApiError("Request too large")
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw or b"{}")
        except Exception:
            raise ApiError("Bad JSON")

    def require_admin(self, q=None):
        tok = self.headers.get("X-Admin-Token") or (q or {}).get("token", [""])[0]
        exp = ADMIN_SESSIONS.get(tok)
        if not exp or exp < time.time():
            raise ApiError("Please log in again", 401)
        ADMIN_SESSIONS[tok] = time.time() + 12 * 3600

    def require_booth(self):
        if not self.is_local():
            raise ApiError("Voting is only allowed on the booth computer", 403)

    # ---- routing
    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def route(self, method):
        u = urlparse(self.path)
        path = unquote(u.path)
        q = parse_qs(u.query)
        try:
            if path.startswith("/api/"):
                with DB_LOCK:
                    res = self.api(method, path[5:], q)
                if res is not None:
                    self.send_json(res)
            else:
                self.static(path)
        except ApiError as e:
            self.send_json({"ok": False, "error": str(e)}, e.code)
        except ValueError as e:
            self.send_json({"ok": False, "error": str(e)}, 400)
        except Exception as e:
            traceback.print_exc()
            self.send_json({"ok": False, "error": "Server error: " + str(e)}, 500)

    def static(self, path):
        if path in ("", "/"):
            path = "/index.html"
        if path in ("/booth", "/admin", "/display"):
            path += ".html"
        full = os.path.normpath(os.path.join(WEB_DIR, path.lstrip("/")))
        if not full.startswith(WEB_DIR) or not os.path.isfile(full):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")
            return
        ext = os.path.splitext(full)[1].lower()
        with open(full, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        if ext in (".bin",):
            self.send_header("Cache-Control", "max-age=86400")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    # ------------------------------------------------------------------ API
    def api(self, method, p, q):
        # ---------- public
        if p == "public/status":
            st = S("status")
            res = {"society_name": S("society_name"), "election_name": S("election_name"),
                   "status": st, "counts": counts(), "time": now(),
                   "show_results": st == "closed" or S("public_live_results") == "1",
                   "one_vote_per_flat": S("one_vote_per_flat") == "1", "teams": get_teams()}
            if res["show_results"]:
                res["results"] = compute_results()
            res["posts"] = [{"id": x["id"], "name": x["name"], "name_hi": x["name_hi"], "seats": x["seats"],
                             "candidates": [{"id": c["id"], "photo": c["photo"]} for c in x["candidates"]]}
                            for x in get_posts()]
            return res

        # ---------- booth (local computer only)
        if p.startswith("booth/"):
            self.require_booth()
            return self.booth_api(method, p[6:], q)

        # ---------- admin
        if p == "admin/state":
            return {"setup_done": bool(S("admin_pin")), "society_name": S("society_name"),
                    "election_name": S("election_name"), "is_local": self.is_local()}
        if p == "admin/setup" and method == "POST":
            if S("admin_pin"):
                raise ApiError("Already set up")
            b = self.body()
            ap, op = str(b.get("admin_pin", "")), str(b.get("officer_pin", ""))
            if len(ap) < 4 or len(op) < 4:
                raise ApiError("PINs must be at least 4 digits")
            if ap == op:
                raise ApiError("Admin PIN and Officer PIN must be different")
            set_s("admin_pin", hash_pin(ap))
            set_s("officer_pin", hash_pin(op))
            if b.get("society_name"):
                set_s("society_name", b["society_name"].strip())
            if b.get("election_name"):
                set_s("election_name", b["election_name"].strip())
            audit("SETUP", detail="Admin & officer PIN created")
            tok = secrets.token_hex(16)
            ADMIN_SESSIONS[tok] = time.time() + 12 * 3600
            return {"ok": True, "token": tok}
        if p == "admin/login" and method == "POST":
            b = self.body()
            if not check_pin(b.get("pin", ""), S("admin_pin")):
                audit("ADMIN_LOGIN_FAILED", detail=f"from {self.client_address[0]}")
                time.sleep(1)
                raise ApiError("Wrong PIN", 403)
            tok = secrets.token_hex(16)
            ADMIN_SESSIONS[tok] = time.time() + 12 * 3600
            audit("ADMIN_LOGIN", detail=f"from {self.client_address[0]}")
            return {"ok": True, "token": tok}
        if p.startswith("admin/"):
            self.require_admin(q)
            return self.admin_api(method, p[6:], q)
        raise ApiError("Unknown endpoint", 404)

    # ------------------------------------------------------------ booth API
    def booth_api(self, method, p, q):
        if p == "config":
            return {"society_name": S("society_name"), "election_name": S("election_name"),
                    "status": S("status"), "require_face": S("require_face") == "1",
                    "liveness": S("liveness") == "1", "idle_seconds": int(S("booth_idle_seconds") or 150),
                    "max_face_attempts": int(S("max_face_attempts") or 3),
                    "one_vote_per_flat": S("one_vote_per_flat") == "1",
                    "cross_team": S("cross_team") == "1", "must_fill_all": S("must_fill_all") == "1",
                    "teams": get_teams(), "posts": get_posts()}
        if p == "status":
            return {"status": S("status")}
        if p == "search":
            term = (q.get("q", [""])[0]).strip().lower()
            if len(term) < 1:
                return {"voters": []}
            like = f"%{term}%"
            vs = rows("""SELECT * FROM voters WHERE lower(name) LIKE ? OR lower(flat) LIKE ?
                         OR lower(replace(flat,'-','')) LIKE ? OR lower(id)=?
                         ORDER BY flat, name LIMIT 24""",
                      (like, like, f"%{term.replace('-', '')}%", term))
            out = []
            for v in vs:
                d = voter_public(v)
                d["flat_done"] = S("one_vote_per_flat") == "1" and not v["has_voted"] and flat_has_voted(v["flat"])
                out.append(d)
            return {"voters": out}
        if p == "voter":
            vid = (q.get("id", [""])[0]).strip().upper()
            v = CONN.execute("SELECT * FROM voters WHERE id=?", (vid,)).fetchone()
            if not v:
                raise ApiError("Voter slip not recognised", 404)
            d = voter_public(v)
            d["flat_done"] = S("one_vote_per_flat") == "1" and not v["has_voted"] and flat_has_voted(v["flat"])
            return {"voter": d}
        if p == "verify" and method == "POST":
            b = self.body()
            vid = b.get("voter_id", "")
            v = self.check_can_vote(vid)
            if not v["descriptor"]:
                raise ApiError("Face not registered for this voter. Please call the polling officer.")
            desc = b.get("descriptor") or []
            if len(desc) != 128:
                raise ApiError("No face captured")
            dist = distance(desc, json.loads(v["descriptor"]))
            thr = float(S("face_threshold") or 0.5)
            maxa = int(S("max_face_attempts") or 3)
            if dist <= thr:
                FAILED_ATTEMPTS.pop(vid, None)
                tok = secrets.token_hex(16)
                VOTE_SESSIONS[tok] = {"voter_id": vid, "exp": time.time() + 900, "method": f"face ({dist:.2f})"}
                audit("FACE_VERIFIED", vid, f"match distance {dist:.3f} (limit {thr})", b.get("snapshot", ""))
                return {"ok": True, "token": tok, "distance": round(dist, 3)}
            n = FAILED_ATTEMPTS.get(vid, 0) + 1
            FAILED_ATTEMPTS[vid] = n
            audit("FACE_MISMATCH", vid, f"attempt {n}, distance {dist:.3f} (limit {thr})", b.get("snapshot", ""))
            return {"ok": False, "attempts": n, "max_attempts": maxa, "distance": round(dist, 3),
                    "need_officer": n >= maxa}
        if p == "self_confirm" and method == "POST":
            # Only when face verification is switched OFF in settings
            b = self.body()
            vid = b.get("voter_id", "")
            v = self.check_can_vote(vid)
            if S("require_face") == "1" and v["descriptor"]:
                raise ApiError("Face verification is required")
            if S("require_face") == "1":
                raise ApiError("Face not registered. Please call the polling officer.")
            tok = secrets.token_hex(16)
            VOTE_SESSIONS[tok] = {"voter_id": vid, "exp": time.time() + 900, "method": "self-confirmed (face check off)"}
            audit("SELF_CONFIRMED", vid, "Face check switched off; voter confirmed identity on screen", b.get("snapshot", ""))
            return {"ok": True, "token": tok}
        if p == "override" and method == "POST":
            b = self.body()
            vid = b.get("voter_id", "")
            self.check_can_vote(vid)
            if not check_pin(b.get("pin", ""), S("officer_pin")) and not check_pin(b.get("pin", ""), S("admin_pin")):
                audit("OFFICER_PIN_FAILED", vid, b.get("reason", ""))
                time.sleep(1)
                raise ApiError("Wrong officer PIN", 403)
            reason = (b.get("reason") or "Officer verified photo ID").strip()
            tok = secrets.token_hex(16)
            VOTE_SESSIONS[tok] = {"voter_id": vid, "exp": time.time() + 900, "method": "officer: " + reason}
            FAILED_ATTEMPTS.pop(vid, None)
            audit("OFFICER_OVERRIDE", vid, reason, b.get("snapshot", ""))
            return {"ok": True, "token": tok}
        if p == "cancel" and method == "POST":
            b = self.body()
            s = VOTE_SESSIONS.pop(b.get("token", ""), None)
            if s:
                audit("SESSION_CANCELLED", s["voter_id"], b.get("reason", "Voter left without voting"))
            return {"ok": True}
        if p == "cast" and method == "POST":
            return self.cast(self.body())
        raise ApiError("Unknown booth endpoint", 404)

    def check_can_vote(self, vid):
        st = S("status")
        if st != "open":
            raise ApiError("Voting is not open right now" if st != "paused" else "Voting is paused. Please wait.")
        v = CONN.execute("SELECT * FROM voters WHERE id=?", (vid,)).fetchone()
        if not v:
            raise ApiError("Voter not found")
        if v["has_voted"]:
            audit("DUPLICATE_ATTEMPT", vid, "Voter tried to vote again")
            raise ApiError("This voter has ALREADY VOTED. A second vote is not allowed.")
        if S("one_vote_per_flat") == "1" and flat_has_voted(v["flat"]):
            audit("DUPLICATE_ATTEMPT", vid, f"Flat {v['flat']} has already voted")
            raise ApiError(f"Flat {v['flat']} has already voted (one vote per flat).")
        return v

    def cast(self, b):
        tok = b.get("token", "")
        s = VOTE_SESSIONS.get(tok)
        if not s or s["exp"] < time.time():
            VOTE_SESSIONS.pop(tok, None)
            raise ApiError("Your session expired. Please start again.")
        vid = s["voter_id"]
        v = self.check_can_vote(vid)
        choices = b.get("choices") or {}
        posts = get_posts(with_photos=False)
        clean = {}
        for p in posts:
            sel = choices.get(str(p["id"])) or []
            if not isinstance(sel, list) or not sel:
                raise ApiError(f"Please make a choice for {p['name']}")
            valid = {c["id"] for c in p["candidates"]}
            if sel == ["NOTA"]:
                clean[str(p["id"])] = ["NOTA"]
                continue
            ids = []
            for x in sel:
                try:
                    x = int(x)
                except Exception:
                    raise ApiError("Invalid choice")
                if x not in valid or x in ids:
                    raise ApiError("Invalid choice")
                ids.append(x)
            if len(ids) > p["seats"]:
                raise ApiError(f"Too many choices for {p['name']}")
            if S("must_fill_all") == "1" and len(ids) != p["seats"]:
                raise ApiError(f"Please choose all {p['seats']} for {p['name']}")
            if S("cross_team") == "0":
                tset = {c["team_id"] for c in p["candidates"] if c["id"] in ids}
                if len(tset) > 1:
                    raise ApiError("You can choose members of one team only")
            clean[str(p["id"])] = sorted(ids)
        cj = json.dumps(clean, sort_keys=True, separators=(",", ":"))
        bid = secrets.token_hex(12)
        w = voter_weight(v)
        CONN.execute("BEGIN IMMEDIATE")
        try:
            cur = CONN.execute("UPDATE voters SET has_voted=1, voted_at=?, verify_method=? WHERE id=? AND has_voted=0",
                               (now(), s["method"], vid))
            if cur.rowcount != 1:
                raise ApiError("This voter has already voted.")
            CONN.execute("INSERT INTO ballots(ballot_id,choices,sig,weight) VALUES(?,?,?,?)",
                         (bid, cj, sign_ballot(bid, cj, w), w))
            CONN.execute("INSERT INTO audit(ts,event,voter_id,detail) VALUES(?,?,?,?)",
                         (now(), "VOTE_CAST", vid, f"Vote value {wnum(w)} · verified by {s['method']}"))
            CONN.execute("COMMIT")
        except Exception:
            CONN.execute("ROLLBACK")
            raise
        VOTE_SESSIONS.pop(tok, None)
        CHANGE_COUNTER["n"] += 1
        try:
            quick_mirror()
        except Exception:
            traceback.print_exc()
        return {"ok": True}

    # ------------------------------------------------------------ admin API
    def admin_api(self, method, p, q):
        st = S("status")
        if p == "dashboard":
            recent = rows("""SELECT a.id,a.ts,a.event,a.voter_id,a.detail, v.name, v.flat,
                             CASE WHEN a.snapshot!='' THEN 1 ELSE 0 END has_snap
                             FROM audit a LEFT JOIN voters v ON v.id=a.voter_id
                             ORDER BY a.id DESC LIMIT 25""")
            return {"status": st, "society_name": S("society_name"), "election_name": S("election_name"),
                    "counts": counts(), "results": compute_results(), "timeline": timeline(),
                    "recent": recent, "opened_at": S("opened_at"), "closed_at": S("closed_at"),
                    "integrity": integrity(), "time": now(),
                    "one_flat": S("one_vote_per_flat") == "1",
                    "weights_text": ", ".join([f"{x['block']} block = {wnum(x['weight'])}" for x in json.loads(S("block_weights") or "[]")]
                                              + [f"others = {wnum(S('default_weight') or 1)}"]),
                    "last_backup": CHANGE_COUNTER["backed_up"] == CHANGE_COUNTER["n"]}
        if p == "settings" and method == "GET":
            keys = ["society_name", "election_name", "face_threshold", "require_face", "liveness",
                    "one_vote_per_flat", "max_face_attempts", "public_live_results", "booth_idle_seconds",
                    "block_weights", "default_weight", "cross_team", "must_fill_all"]
            res = {k: S(k) for k in keys}
            res["status"] = st
            # how many voters / flats fall in each block (for the weight table editor)
            per = {}
            for v in CONN.execute("SELECT flat FROM voters").fetchall():
                bk = block_of(v["flat"]) or "(none)"
                per.setdefault(bk, set()).add(v["flat"].lower())
            res["blocks_found"] = {k: len(x) for k, x in sorted(per.items())}
            return res
        if p == "settings" and method == "POST":
            b = self.body()
            allowed = {"society_name", "election_name", "face_threshold", "require_face", "liveness",
                       "one_vote_per_flat", "max_face_attempts", "public_live_results", "booth_idle_seconds",
                       "block_weights", "default_weight", "cross_team", "must_fill_all"}
            locked = {"one_vote_per_flat", "block_weights", "default_weight", "cross_team", "must_fill_all"}
            if "block_weights" in b:
                tbl = b["block_weights"] if isinstance(b["block_weights"], list) else json.loads(b["block_weights"] or "[]")
                clean_t, seen = [], set()
                for r in tbl:
                    bk = str(r.get("block", "")).strip().upper()
                    if not bk:
                        continue
                    if bk in seen:
                        raise ApiError(f"Block {bk} appears twice in the weight table")
                    seen.add(bk)
                    wt = float(r.get("weight") or 0)
                    if not (0 < wt <= 100):
                        raise ApiError(f"Weight for block {bk} must be more than 0")
                    clean_t.append({"block": bk, "area": r.get("area") or "", "weight": round(wt, 4)})
                b["block_weights"] = json.dumps(clean_t)
            if "default_weight" in b:
                if float(b["default_weight"] or 0) <= 0:
                    raise ApiError("Default weight must be more than 0")
            changed = []
            for k, v in b.items():
                if k in allowed:
                    if k in locked and st != "setup" and str(v) != S(k):
                        raise ApiError("Vote weights and team rules can only be changed before voting starts")
                    if k == "face_threshold":
                        v = f"{min(0.7, max(0.3, float(v))):.2f}"
                    set_s(k, v)
                    changed.append(f"{k}={v}")
            if changed:
                audit("SETTINGS_CHANGED", detail=", ".join(changed))
            return {"ok": True}
        if p == "change_pin" and method == "POST":
            b = self.body()
            if not check_pin(b.get("current", ""), S("admin_pin")):
                raise ApiError("Current admin PIN is wrong", 403)
            which = b.get("which")
            new = str(b.get("new", ""))
            if len(new) < 4:
                raise ApiError("PIN must be at least 4 digits")
            if which not in ("admin_pin", "officer_pin"):
                raise ApiError("Bad request")
            set_s(which, hash_pin(new))
            audit("PIN_CHANGED", detail=which)
            return {"ok": True}

        # ---- election control
        if p == "status" and method == "POST":
            b = self.body()
            new = b.get("status")
            allowed = {"setup": ["open"], "open": ["paused", "closed"], "paused": ["open", "closed"], "closed": []}
            if new not in allowed.get(st, []):
                raise ApiError(f"Cannot change from '{st}' to '{new}'")
            if new == "open" and st == "setup":
                posts = get_posts(False)
                if not posts or any(len(x["candidates"]) == 0 for x in posts):
                    raise ApiError("Add at least one post, and candidates for every post, before opening voting")
                if not CONN.execute("SELECT COUNT(*) n FROM voters").fetchone()["n"]:
                    raise ApiError("Add voters before opening voting")
                set_s("opened_at", now())
            if new == "closed":
                if not check_pin(b.get("pin", ""), S("admin_pin")):
                    raise ApiError("Admin PIN required to close voting", 403)
                set_s("closed_at", now())
                VOTE_SESSIONS.clear()
            set_s("status", new)
            audit("ELECTION_" + new.upper(), detail=f"{st} -> {new}")
            backup(new)
            return {"ok": True}
        if p == "reset" and method == "POST":
            b = self.body()
            if st == "open":
                raise ApiError("Pause or close voting first")
            if b.get("confirm") != "RESET" or not check_pin(b.get("pin", ""), S("admin_pin")):
                raise ApiError("Type RESET and enter the admin PIN", 403)
            name = backup("before-reset")
            CONN.execute("DROP TRIGGER IF EXISTS ballots_no_update")
            CONN.execute("DELETE FROM ballots")
            CONN.execute("""CREATE TRIGGER IF NOT EXISTS ballots_no_update BEFORE UPDATE ON ballots
                            BEGIN SELECT RAISE(ABORT, 'Ballots cannot be changed'); END;""")
            CONN.execute("UPDATE voters SET has_voted=0, voted_at='', verify_method=''")
            set_s("status", "setup")
            set_s("opened_at", "")
            set_s("closed_at", "")
            FAILED_ATTEMPTS.clear()
            VOTE_SESSIONS.clear()
            audit("VOTES_RESET", detail=f"All votes cleared. Backup saved as {name}")
            return {"ok": True, "backup": name}
        if p == "sample" and method == "POST":
            if st != "setup":
                raise ApiError("Only possible before voting starts")
            load_sample()
            return {"ok": True}

        # ---- posts & candidates
        if p == "posts" and method == "GET":
            return {"posts": get_posts(), "teams": get_teams(), "locked": st != "setup"}
        if p in ("post/save", "post/delete", "candidate/save", "candidate/delete",
                 "team/save", "team/delete") and st != "setup":
            raise ApiError("Posts and candidates are locked once voting has started")
        if p == "post/save" and method == "POST":
            b = self.body()
            name = (b.get("name") or "").strip()
            if not name:
                raise ApiError("Post name required")
            seats = max(1, int(b.get("seats") or 1))
            if b.get("id"):
                CONN.execute("UPDATE posts SET name=?, name_hi=?, seats=? WHERE id=?",
                             (name, b.get("name_hi", ""), seats, b["id"]))
            else:
                n = CONN.execute("SELECT COALESCE(MAX(sort),0)+1 n FROM posts").fetchone()["n"]
                CONN.execute("INSERT INTO posts(name,name_hi,seats,sort) VALUES(?,?,?,?)",
                             (name, b.get("name_hi", ""), seats, n))
            audit("POST_SAVED", detail=name)
            return {"ok": True}
        if p == "post/delete" and method == "POST":
            b = self.body()
            CONN.execute("DELETE FROM posts WHERE id=?", (b.get("id"),))
            audit("POST_DELETED", detail=str(b.get("id")))
            return {"ok": True}
        if p == "post/move" and method == "POST":
            if st != "setup":
                raise ApiError("Locked")
            b = self.body()
            ids = [x["id"] for x in rows("SELECT id FROM posts ORDER BY sort,id")]
            i = ids.index(b["id"])
            j = i + (1 if b.get("dir") == "down" else -1)
            if 0 <= j < len(ids):
                ids[i], ids[j] = ids[j], ids[i]
            for k, pid in enumerate(ids):
                CONN.execute("UPDATE posts SET sort=? WHERE id=?", (k, pid))
            return {"ok": True}
        if p == "team/save" and method == "POST":
            b = self.body()
            name = (b.get("name") or "").strip()
            if not name:
                raise ApiError("Team name required")
            if b.get("id"):
                CONN.execute("UPDATE teams SET name=?, color=?, symbol=? WHERE id=?",
                             (name, b.get("color") or "#1d4e9e", b.get("symbol", ""), b["id"]))
            else:
                n = CONN.execute("SELECT COALESCE(MAX(sort),0)+1 n FROM teams").fetchone()["n"]
                CONN.execute("INSERT INTO teams(name,color,symbol,sort) VALUES(?,?,?,?)",
                             (name, b.get("color") or "#1d4e9e", b.get("symbol", ""), n))
            audit("TEAM_SAVED", detail=name)
            return {"ok": True}
        if p == "team/delete" and method == "POST":
            b = self.body()
            CONN.execute("UPDATE candidates SET team_id=NULL WHERE team_id=?", (b.get("id"),))
            CONN.execute("DELETE FROM teams WHERE id=?", (b.get("id"),))
            audit("TEAM_DELETED", detail=str(b.get("id")))
            return {"ok": True}
        if p == "candidate/save" and method == "POST":
            b = self.body()
            name = (b.get("name") or "").strip()
            if not name:
                raise ApiError("Candidate name required")
            team = b.get("team_id") or None
            if b.get("id"):
                CONN.execute("UPDATE candidates SET name=?, flat=?, symbol=?, photo=?, team_id=? WHERE id=?",
                             (name, b.get("flat", "").upper(), b.get("symbol", ""), b.get("photo", ""), team, b["id"]))
            else:
                n = CONN.execute("SELECT COALESCE(MAX(sort),0)+1 n FROM candidates WHERE post_id=?",
                                 (b["post_id"],)).fetchone()["n"]
                CONN.execute("INSERT INTO candidates(post_id,team_id,name,flat,symbol,photo,sort) VALUES(?,?,?,?,?,?,?)",
                             (b["post_id"], team, name, b.get("flat", "").upper(), b.get("symbol", ""), b.get("photo", ""), n))
            audit("CANDIDATE_SAVED", detail=name)
            return {"ok": True}
        if p == "candidate/delete" and method == "POST":
            b = self.body()
            CONN.execute("DELETE FROM candidates WHERE id=?", (b.get("id"),))
            audit("CANDIDATE_DELETED", detail=str(b.get("id")))
            return {"ok": True}

        # ---- voters
        if p == "voters" and method == "GET":
            vs = CONN.execute("SELECT * FROM voters ORDER BY flat, name").fetchall()
            table = weight_table()
            out = []
            for v in vs:
                d = {k: v[k] for k in ("id", "name", "flat", "phone", "id_type", "id_number", "photo",
                                       "voted_at", "verify_method")}
                d["has_voted"] = bool(v["has_voted"])
                d["face_enrolled"] = bool(v["descriptor"])
                d["block"] = block_of(v["flat"])
                d["weight_override"] = v["weight"] or ""
                d["weight"] = wnum(voter_weight(v, table))
                out.append(d)
            return {"voters": out}
        if p == "voter/save" and method == "POST":
            b = self.body()
            if b.get("id"):
                v = CONN.execute("SELECT * FROM voters WHERE id=?", (b["id"],)).fetchone()
                if not v:
                    raise ApiError("Voter not found")
                if v["has_voted"] and (b.get("flat", v["flat"]).upper() != v["flat"]):
                    raise ApiError("Cannot change flat of a voter who has already voted")
                if v["has_voted"] and str(b.get("weight", v["weight"]) or "") != (v["weight"] or ""):
                    raise ApiError("Cannot change vote weight of a voter who has already voted")
                CONN.execute("UPDATE voters SET name=?, flat=?, phone=?, id_type=?, id_number=?, weight=? WHERE id=?",
                             (b.get("name", "").strip(), b.get("flat", "").strip().upper(), b.get("phone", ""),
                              b.get("id_type", ""), b.get("id_number", ""), check_weight(b.get("weight", "")), b["id"]))
                audit("VOTER_UPDATED", b["id"])
                vid = b["id"]
            else:
                vid = add_voter(b)
                audit("VOTER_ADDED", vid, f"{b.get('name')} ({b.get('flat')})" + (" [late registration]" if st != "setup" else ""))
            return {"ok": True, "id": vid}
        if p == "voter/delete" and method == "POST":
            b = self.body()
            v = CONN.execute("SELECT * FROM voters WHERE id=?", (b.get("id"),)).fetchone()
            if not v:
                raise ApiError("Voter not found")
            if v["has_voted"]:
                raise ApiError("Cannot delete a voter who has already voted")
            CONN.execute("DELETE FROM voters WHERE id=?", (b["id"],))
            audit("VOTER_DELETED", b["id"], f"{v['name']} ({v['flat']})")
            return {"ok": True}
        if p == "voter/face" and method == "POST":
            b = self.body()
            vid = b.get("id")
            v = CONN.execute("SELECT * FROM voters WHERE id=?", (vid,)).fetchone()
            if not v:
                raise ApiError("Voter not found")
            desc = b.get("descriptor") or []
            if len(desc) != 128:
                raise ApiError("No face found in the photo")
            if v["has_voted"]:
                raise ApiError("This voter has already voted; face cannot be changed now")
            thr = float(S("face_threshold") or 0.5)
            if not b.get("force"):
                best = None
                for o in rows("SELECT id,name,flat,descriptor FROM voters WHERE descriptor!='' AND id!=?", (vid,)):
                    d = distance(desc, json.loads(o["descriptor"]))
                    if d <= thr and (best is None or d < best[0]):
                        best = (d, o)
                if best:
                    o = best[1]
                    return {"ok": False, "duplicate": True,
                            "error": f"This face looks like an already registered voter: {o['name']} "
                                     f"(Flat {o['flat']}, {o['id']}). Same person cannot be registered twice.",
                            "match_id": o["id"], "distance": round(best[0], 3)}
            CONN.execute("UPDATE voters SET descriptor=?, photo=? WHERE id=?",
                         (json.dumps([round(x, 6) for x in desc]), b.get("photo", ""), vid))
            audit("FACE_ENROLLED", vid, "forced (look-alike accepted by admin)" if b.get("force") else "")
            return {"ok": True}
        if p == "voters/import" and method == "POST":
            b = self.body()
            text = b.get("csv", "")
            reader = csv.DictReader(io.StringIO(text))
            added, skipped = 0, 0
            norm = lambda s: re.sub(r"[^a-z]", "", (s or "").lower())
            for r in reader:
                r = {norm(k): (v or "").strip() for k, v in r.items() if k}
                name = r.get("name") or r.get("votername") or r.get("membername")
                flat = r.get("flat") or r.get("flatno") or r.get("flatnumber") or r.get("unit")
                if not name or not flat:
                    skipped += 1
                    continue
                exists = CONN.execute("SELECT 1 FROM voters WHERE lower(name)=lower(?) AND lower(flat)=lower(?)",
                                      (name, flat)).fetchone()
                if exists:
                    skipped += 1
                    continue
                add_voter({"name": name, "flat": flat, "phone": r.get("phone") or r.get("mobile", ""),
                           "id_type": r.get("idtype", ""), "id_number": r.get("idnumber", ""),
                           "weight": r.get("weight") or r.get("voteweight", "")})
                added += 1
            audit("VOTERS_IMPORTED", detail=f"{added} added, {skipped} skipped")
            return {"ok": True, "added": added, "skipped": skipped}

        # ---- audit, integrity, backups, exports
        if p == "audit":
            lim = int(q.get("limit", ["500"])[0])
            ev = q.get("event", [""])[0]
            sql = """SELECT a.id,a.ts,a.event,a.voter_id,a.detail, v.name, v.flat,
                     CASE WHEN a.snapshot!='' THEN 1 ELSE 0 END has_snap
                     FROM audit a LEFT JOIN voters v ON v.id=a.voter_id"""
            args = []
            if ev:
                sql += " WHERE a.event=?"
                args.append(ev)
            sql += " ORDER BY a.id DESC LIMIT ?"
            args.append(lim)
            return {"audit": rows(sql, args)}
        if p == "audit/snapshot":
            r = CONN.execute("SELECT snapshot FROM audit WHERE id=?", (q.get("id", ["0"])[0],)).fetchone()
            return {"snapshot": r["snapshot"] if r else ""}
        if p == "integrity":
            return integrity()
        if p == "backup" and method == "POST":
            name = backup("manual")
            audit("BACKUP", detail=name)
            return {"ok": True, "file": name, "folder": BACKUP_DIR}
        if p == "backups":
            files = sorted((f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")), reverse=True)
            return {"folder": BACKUP_DIR,
                    "files": [{"name": f, "size": os.path.getsize(os.path.join(BACKUP_DIR, f))} for f in files[:30]]}
        if p == "export/database":
            name = backup("download")
            with open(os.path.join(BACKUP_DIR, name), "rb") as f:
                self.send_file_bytes(f.read(), "application/octet-stream", name)
            return None
        if p == "export/results.csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow([S("society_name"), S("election_name")])
            w.writerow(["Status", st, "Generated", now()])
            c = counts()
            w.writerow(["Registered voters", c["registered"], "Voted", c["voted"], "Turnout %", c["turnout"]])
            w.writerow(["Weighted votes cast", c["weight_cast"], "of", c["weight_total"], "Weighted turnout %", c["weighted_turnout"]])
            w.writerow(["Integrity fingerprint", integrity()["fingerprint"]])
            w.writerow(["Block weights"] + [f"{x['block']}={x['weight']}" for x in json.loads(S("block_weights") or "[]")]
                       + [f"others={S('default_weight')}"])
            w.writerow([])
            tnames = {t["id"]: t["name"] for t in get_teams()}
            w.writerow(["Post", "Seats", "Rank", "Candidate", "Team", "Flat", "Weighted votes", "Voters", "Result"])
            for r in compute_results():
                ranked = sorted(r["candidates"], key=lambda x: (-x["wvotes"], -x["votes"]))
                for i, cnd in enumerate(ranked, 1):
                    w.writerow([r["name"], r["seats"], i, cnd["name"], tnames.get(cnd["team_id"], ""), cnd["flat"],
                                cnd["wvotes"], cnd["votes"],
                                ("TIE" if r["tie"] and cnd["id"] in r["leaders"] else
                                 "ELECTED" if cnd["id"] in r["leaders"] and st == "closed" else
                                 "LEADING" if cnd["id"] in r["leaders"] else "")])
                w.writerow([r["name"], "", "", "NOTA (None of the above)", "", "", r["wnota"], r["nota"], ""])
                if r["teams"]:
                    w.writerow([])
                    w.writerow(["Team summary", "", "", "Team", "Seats won", "", "Weighted votes"])
                    for t in r["teams"]:
                        w.writerow(["", "", "", t["name"], t["seats_won"], "", t["wvotes"]])
                w.writerow([])
            self.send_file_bytes(out.getvalue().encode("utf-8-sig"), "text/csv", "election-results.csv")
            return None
        if p == "export/turnout.csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(["Voter ID", "Name", "Flat", "Phone", "ID type", "ID number", "Face registered",
                        "Voted", "Voted at", "Verified by", "Vote weight"])
            for v in CONN.execute("SELECT * FROM voters ORDER BY flat,name").fetchall():
                w.writerow([v["id"], v["name"], v["flat"], v["phone"], v["id_type"], v["id_number"],
                            "Yes" if v["descriptor"] else "No", "Yes" if v["has_voted"] else "No",
                            v["voted_at"], v["verify_method"], wnum(voter_weight(v))])
            self.send_file_bytes(out.getvalue().encode("utf-8-sig"), "text/csv", "voter-turnout.csv")
            return None
        if p == "export/audit.csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(["#", "Time", "Event", "Voter ID", "Detail"])
            for a in rows("SELECT id,ts,event,voter_id,detail FROM audit ORDER BY id"):
                w.writerow([a["id"], a["ts"], a["event"], a["voter_id"], a["detail"]])
            self.send_file_bytes(out.getvalue().encode("utf-8-sig"), "text/csv", "audit-log.csv")
            return None
        if p == "logout" and method == "POST":
            ADMIN_SESSIONS.pop(self.headers.get("X-Admin-Token", ""), None)
            return {"ok": True}
        raise ApiError("Unknown admin endpoint", 404)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--lan", action="store_true", help="allow admin/display from other devices on local network")
    a = ap.parse_args()
    init_db()
    host = "0.0.0.0" if a.lan else "127.0.0.1"
    try:
        srv = ThreadingHTTPServer((host, a.port), Handler)
    except OSError:
        print(f"\n  Port {a.port} is busy. Is the election app already running?\n"
              f"  Open http://localhost:{a.port} in Chrome, or close the other window first.\n")
        sys.exit(1)
    threading.Thread(target=backup_loop, daemon=True).start()
    print("=" * 62)
    print("   SOCIETY ELECTION SYSTEM  -  running offline")
    print("=" * 62)
    print(f"   Start page     : http://localhost:{a.port}")
    print(f"   Voting booth   : http://localhost:{a.port}/booth")
    print(f"   Admin panel    : http://localhost:{a.port}/admin")
    print(f"   Results screen : http://localhost:{a.port}/display")
    if a.lan:
        ip = lan_ip()
        if ip:
            print(f"\n   From other devices on the same Wi-Fi:")
            print(f"   Admin  : http://{ip}:{a.port}/admin")
            print(f"   Results: http://{ip}:{a.port}/display")
    print(f"\n   Data is saved in : {DATA_DIR}")
    print("   Keep this window open during the election. Press Ctrl+C to stop.")
    print("=" * 62)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nSaving final backup...")
        backup("shutdown")
        print("Stopped. Data is safe in the 'data' folder.")


if __name__ == "__main__":
    main()
