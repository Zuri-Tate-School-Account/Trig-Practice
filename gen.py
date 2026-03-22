import json
import random
import sympy as sp
from sympy import sin, cos, tan, sec, csc, cot, symbols, trigsimp, expand_trig, expand, factor

x = symbols('x')
bases = [
    sin(x), cos(x), tan(x), sec(x), csc(x), cot(x),
    sin(x)**2 * cos(x)**2,
    sin(x)**3,
    (sin(x) + cos(x))**2,
    sec(x)**2 - 1,
    sin(x) / cos(x)
]

def format_eq(expr):
    # Convert sympy to string compatible with math.js parser
    s = str(expr)
    s = s.replace('**', '^')
    s = s.replace('sin(x)', 'sin(x)').replace('cos(x)', 'cos(x)')
    return s

db = []
seen = set()

# Seed predefined known identities
known = [
    ("tan(x) * cos(x)", "sin(x)", 1),
    ("sec(x) * cot(x)", "csc(x)", 1),
    ("csc(x) / sec(x)", "cot(x)", 1),
    ("(sin(x) + cos(x))^2 - 1", "2 * sin(x) * cos(x)", 2),
    ("sec(x)^2 - 1", "tan(x)^2", 2),
    ("cos(x) * (tan(x) + cot(x))", "csc(x)", 2)
]
for k in known:
    db.append({"left": k[0], "right": k[1], "diff": k[2]})
    seen.add(f"{k[0]}===={k[1]}")

def mutated(expr, difficulty):
    res = expr
    for _ in range(difficulty):
        choice = random.randint(1, 4)
        if choice == 1:
            res = expand_trig(res)
        elif choice == 2:
            res = trigsimp(res)
        elif choice == 3:
            res = expand(res)
        elif choice == 4:
            res = factor(res)
    return res

print("Generating with Sympy...")
random.seed(42)

for i in range(2500):
    base = random.choice(bases)
    
    # randomly add or multiply another term
    op = random.choice(['+', '-', '*', '/'])
    term = random.choice(bases)
    if op == '+': e1 = base + term
    elif op == '-': e1 = base - term
    elif op == '*': e1 = base * term
    elif op == '/': e1 = base / term
    
    diff = random.randint(1, 10)
    e2 = mutated(e1, diff)
    
    # Just to be sure they are different
    if e1 == e2:
        e2 = trigsimp(e1)
        if e1 == e2: continue
        
    s1 = format_eq(e1)
    s2 = format_eq(e2)
    
    if len(s1) > 120 or len(s2) > 120:
        continue
        
    if s1 == s2:
        continue
        
    canon = "====".join(sorted([s1, s2]))
    if canon not in seen:
        seen.add(canon)
        # random swap
        if random.random() > 0.5:
            db.append({"left": s1, "right": s2, "diff": diff})
        else:
            db.append({"left": s2, "right": s1, "diff": diff})
            
    if len(db) >= 1500:
        break

print(f"Generated {len(db)} identities.")

with open('levels.js', 'w') as f:
    f.write('const hugeLevelDB = ' + json.dumps(db, indent=2) + ';\n')
print("Written to levels.js")
