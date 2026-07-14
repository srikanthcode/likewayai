import sqlite3, json

DB = r'C:\Users\Lenovo\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get ALL parts from the fix-errors session to understand what happened
sid = 'ses_0ade55c10ffeh2YdAk52KiNxW5'
c.execute("""
    SELECT m.id as msg_id, json_extract(m.data, '$.role') as role, m.agent_id,
           json_extract(p.data, '$.type') as part_type,
           p.data as part_data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (sid,))
rows = c.fetchall()

# Filter for interesting parts: tool calls, text, patches
for r in rows:
    role = r['role']
    ptype = r['part_type']
    pdata = json.loads(r['part_data'])
    
    # Show tool calls (what was attempted)
    if ptype == 'tool' and role == 'assistant':
        tool = pdata.get('tool', '?')
        state = pdata.get('state', {})
        status = state.get('status', '?')
        inp = state.get('input', {})
        
        if tool in ('bash', 'write', 'edit', 'glob', 'grep', 'read'):
            cmd_or_path = inp.get('command', inp.get('file_path', inp.get('pattern', '?')))
            output = state.get('output', '')
            exit_code = state.get('metadata', {}).get('exit', '?')
            print(f"  [{tool}] {cmd_or_path}")
            if output:
                print(f"    output (first 200): {output[:200]}")
    
    # Show assistant text (analysis/decisions)
    elif ptype == 'text' and role == 'assistant':
        text = pdata.get('text', '')
        if len(text) > 20:
            print(f"  [TEXT] {text[:300]}")
    
    # Show reasoning
    elif ptype == 'reasoning' and role == 'assistant':
        text = pdata.get('text', '')
        if len(text) > 30:
            print(f"  [REASONING] {text[:400]}")
    
    # Show patches
    elif ptype == 'patch':
        files = pdata.get('files', [])
        print(f"  [PATCH] files: {files}")

# Also check the task table schema
c.execute("PRAGMA table_info(task)")
print("\n=== TASK TABLE SCHEMA ===")
for r in c.fetchall():
    print(f"  {r}")

# Get tasks for this session
c.execute("SELECT * FROM task WHERE session_id = ?", (sid,))
tasks = c.fetchall()
print(f"\n=== TASKS for session {sid} ({len(tasks)} total) ===")
for t in tasks:
    print(f"  {dict(t)}")

# Get task events
c.execute("""
    SELECT te.*, t.title as task_title 
    FROM task_event te 
    JOIN task t ON t.id = te.task_id 
    WHERE te.session_id = ?
    ORDER BY te.time_created
""", (sid,))
events = c.fetchall()
print(f"\n=== TASK EVENTS for session ({len(events)} total) ===")
for e in events:
    print(f"  task={e['task_id'][:20]}... action={e.get('action', '?')} data={str(e.get('data', ''))[:200]}")

conn.close()
