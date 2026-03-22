import json
import random

bases = [
    ("tan(x) * cos(x)", "sin(x)"),
    ("sec(x) * cot(x)", "csc(x)"),
    ("csc(x) / sec(x)", "cot(x)"),
    ("(sin(x) + cos(x))^2 - 1", "2 * sin(x) * cos(x)"),
    ("sec(x)^2 - 1", "tan(x)^2"),
    ("cos(x) * (tan(x) + cot(x))", "csc(x)"),
    ("sin(x)^2 + cos(x)^2", "1"),
    ("tan(x)^2 + 1", "sec(x)^2"),
    ("cot(x)^2 + 1", "csc(x)^2"),
    ("1 - sin(x)^2", "cos(x)^2"),
    ("1 - cos(x)^2", "sin(x)^2")
]

multipliers = ["sin(x)", "cos(x)", "tan(x)", "sec(x)", "csc(x)", "cot(x)", "sin(x)^2", "cos(x)^2"]
additives = ["1", "sin(x)", "cos(x)", "tan(x)", "2", "3"]

db = []
seen = set()

random.seed(42)

# Start by adding the base ones
for b in bases:
    diff = 1 if len(b[0]) < 20 else 2
    db.append({"left": b[0], "right": b[1], "diff": diff})
    seen.add(f"{b[0]}===={b[1]}")

def wrap(e):
    if '+' in e or '-' in e:
        return f"({e})"
    return e

print("Fast gen...")
attempts = 0

while len(db) < 1100 and attempts < 10000:
    attempts += 1
    # Pick a random existing identity
    base = random.choice(db)
    new_l = wrap(base["left"])
    new_r = wrap(base["right"])
    
    op = random.choice(['mul', 'div', 'add', 'sub', 'pow', 'swap'])
    
    if op == 'mul':
        m = random.choice(multipliers)
        new_l = f"{new_l} * {m}"
        new_r = f"{new_r} * {m}"
    elif op == 'div':
        m = random.choice(multipliers)
        new_l = f"{new_l} / {m}"
        new_r = f"{new_r} / {m}"
    elif op == 'add':
        m = random.choice(additives)
        new_l = f"{new_l} + {m}"
        new_r = f"{new_r} + {m}"
    elif op == 'sub':
        m = random.choice(additives)
        new_l = f"{new_l} - {m}"
        new_r = f"{new_r} - {m}"
    elif op == 'pow':
        new_l = f"({new_l})^2"
        new_r = f"({new_r})^2"
    elif op == 'swap':
        new_l, new_r = new_r, new_l
        
    diff = min(base["diff"] + 1, 10)
    # prevent getting too large
    if len(new_l) > 100 or len(new_r) > 100:
        continue
        
    canon = "====".join(sorted([new_l, new_r]))
    if canon not in seen:
        seen.add(canon)
        db.append({"left": new_l, "right": new_r, "diff": diff})

print(f"Generated {len(db)} identities!")

with open('levels.js', 'w') as f:
    f.write('const hugeLevelDB = ' + json.dumps(db, indent=2) + ';\n')
