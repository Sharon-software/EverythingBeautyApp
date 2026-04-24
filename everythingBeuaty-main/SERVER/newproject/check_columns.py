import sqlite3

conn = sqlite3.connect("db.sqlite3")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(api_booking);")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
