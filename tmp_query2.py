import sqlite3, json

DB = r'C:\Users\Lenovo\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get all messages + parts for the "Fix all code errors" session
sid = 'ses_0ade55c10ffeh2YdAk52KiNxW5'

c.execute("""
    SELECT m.id as msg_id, json_extract(m.data, '$.role') as role, m.agent_id,
           p.id as part_id, json_extract(p.data, '$.type') as part_type,
           substr(p.data, 1, 1500) as part_data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (sid,))
rows = c.fetchall()
print(f"=== SESSION {sid} - Parts ({len(rows)} total) ===")
for r in rows:
    role = r['role']
    agent = r['agent_id']
    ptype = r['part_type']
    pdata = r['part_data']
    print(f"\n[{role}] agent={agent} | part_type={ptype}")
    print(f"  data: {pdata[:800]}")

conn.close()
