import sqlite3, json

DB = r'C:\Users\Lenovo\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Search for user directives across ALL sessions for this project
proj_id = 'f5171eca-3190-4252-84f4-ad4530966749'

# Get all sessions for this project
c.execute("SELECT id, title FROM session WHERE project_id = ?", (proj_id,))
sessions = c.fetchall()
print("=== ALL PROJECT SESSIONS ===")
for s in sessions:
    print(f"  {s['id']}: {s['title']}")

# For each session, get user text parts (to find directives)
for s in sessions:
    sid = s['id']
    c.execute("""
        SELECT p.data
        FROM part p
        JOIN message m ON m.id = p.message_id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
        ORDER BY m.time_created
    """, (sid,))
    rows = c.fetchall()
    if rows:
        print(f"\n=== USER MESSAGES in {sid} ({s['title']}) ===")
        for r in rows:
            pdata = json.loads(r['data'])
            text = pdata.get('text', '')[:500]
            print(f"  > {text}")

# Search for text containing rule-like keywords across ALL sessions
print("\n=== SEARCHING FOR RULES/DECISIONS IN ALL SESSIONS ===")
keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'preference', 'please', 'dont', "don't"]
for kw in keywords:
    c.execute("""
        SELECT m.session_id, json_extract(m.data, '$.role') as role, p.data
        FROM part p
        JOIN message m ON m.id = p.message_id
        WHERE json_extract(p.data, '$.type') = 'text'
          AND json_extract(p.data, '$.text') LIKE ?
        ORDER BY m.time_created
        LIMIT 5
    """, (f'%{kw}%',))
    rows = c.fetchall()
    for r in rows:
        pdata = json.loads(r['data'])
        text = pdata.get('text', '')[:300]
        if any(k in text.lower() for k in ['always', 'never', 'remember', 'rule', 'decision', 'preference', 'please']):
            print(f"  [{kw}] sess={r['session_id'][:20]} role={r['role']}: {text[:200]}")

# Check tasks
c.execute("SELECT id, session_id, title FROM task WHERE session_id IN (SELECT id FROM session WHERE project_id = ?)", (proj_id,))
tasks = c.fetchall()
print(f"\n=== TASKS for project ({len(tasks)} total) ===")
for t in tasks:
    print(f"  {t['id']}: {t['title']} (session: {t['session_id'][:20]}...)")

conn.close()
