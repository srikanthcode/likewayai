import sqlite3, sys, json, time

DB = r'C:\Users\Lenovo\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get project ID from current session
c.execute("SELECT id, directory FROM session WHERE id = 'ses_0ade55b1affexOtmq3NYbx2Hqh'")
current = c.fetchone()
print(f"Current session: {current['id']}, dir: {current['directory']}")

# Get project ID
c.execute("SELECT project_id FROM session WHERE id = 'ses_0ade55b1affexOtmq3NYbx2Hqh'")
proj_row = c.fetchone()
proj_id = proj_row['project_id']
print(f"\nProject ID: {proj_id}")

# All sessions for this project
c.execute("SELECT id, title, time_created, directory FROM session WHERE project_id = ? ORDER BY time_created DESC", (proj_id,))
print(f"\n=== ALL SESSIONS for project {proj_id} ===")
for r in c.fetchall():
    print(f"  {r['id']} | {r['title']} | dir={r['directory']} | ts={r['time_created']}")

# All sessions in last 7 days
seven_days_ago = int((time.time() - 7*24*3600) * 1000)
c.execute("SELECT id, project_id, title, directory, time_created FROM session WHERE time_created > ? ORDER BY time_created DESC", (seven_days_ago,))
print(f"\n=== SESSIONS IN LAST 7 DAYS ===")
for r in c.fetchall():
    print(f"  {r['id']} | proj={r['project_id'][:12]}... | {r['title']} | ts={r['time_created']}")

# Tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("\n=== TABLES ===")
for r in c.fetchall():
    print(f"  {r[0]}")

conn.close()
