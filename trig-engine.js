// ═══════════════════════════════════════════════════════════════
//  TRIG ENGINE — AST-based matching, highlighting, algebra ops
// ═══════════════════════════════════════════════════════════════

// ─── Comprehensive Identity Database ──────────────────────────
const identityCategories = [
    {
        name: "Quotient",
        ids: [
            ["tan(x)","sin(x) / cos(x)"],
            ["cot(x)","cos(x) / sin(x)"]
        ]
    },
    {
        name: "Reciprocal",
        ids: [
            ["sec(x)","1 / cos(x)"],
            ["csc(x)","1 / sin(x)"],
            ["cot(x)","1 / tan(x)"],
            ["tan(x)","1 / cot(x)"]
        ]
    },
    {
        name: "Pythagorean",
        ids: [
            ["sin(x)^2 + cos(x)^2","1"],
            ["1 - sin(x)^2","cos(x)^2"],
            ["1 - cos(x)^2","sin(x)^2"],
            ["tan(x)^2 + 1","sec(x)^2"],
            ["sec(x)^2 - 1","tan(x)^2"],
            ["cot(x)^2 + 1","csc(x)^2"],
            ["csc(x)^2 - 1","cot(x)^2"],
            ["sec(x)^2 - tan(x)^2","1"],
            ["csc(x)^2 - cot(x)^2","1"]
        ]
    },
    {
        name: "Double Angle",
        ids: [
            ["sin(2 * x)","2 * sin(x) * cos(x)"],
            ["cos(2 * x)","cos(x)^2 - sin(x)^2"],
            ["cos(2 * x)","2 * cos(x)^2 - 1"],
            ["cos(2 * x)","1 - 2 * sin(x)^2"],
            ["tan(2 * x)","(2 * tan(x)) / (1 - tan(x)^2)"]
        ]
    },
    {
        name: "Half Angle",
        ids: [
            ["sin(x / 2)^2","(1 - cos(x)) / 2"],
            ["cos(x / 2)^2","(1 + cos(x)) / 2"]
        ]
    },
    {
        name: "Power Reducing",
        ids: [
            ["sin(x)^2","(1 - cos(2 * x)) / 2"],
            ["cos(x)^2","(1 + cos(2 * x)) / 2"],
            ["tan(x)^2","(1 - cos(2 * x)) / (1 + cos(2 * x))"]
        ]
    },
    {
        name: "Cofunction",
        ids: [
            ["sin(pi / 2 - x)","cos(x)"],
            ["cos(pi / 2 - x)","sin(x)"],
            ["tan(pi / 2 - x)","cot(x)"],
            ["cot(pi / 2 - x)","tan(x)"],
            ["sec(pi / 2 - x)","csc(x)"],
            ["csc(pi / 2 - x)","sec(x)"]
        ]
    },
    {
        name: "Even / Odd",
        ids: [
            ["sin(-x)","-sin(x)"],
            ["cos(-x)","cos(x)"],
            ["tan(-x)","-tan(x)"],
            ["csc(-x)","-csc(x)"],
            ["sec(-x)","sec(x)"],
            ["cot(-x)","-cot(x)"]
        ]
    },
    {
        name: "Sum ↔ Product",
        ids: [
            ["sin(x) * cos(x)","sin(2 * x) / 2"],
            ["cos(x)^2 - sin(x)^2","cos(2 * x)"]
        ]
    },
    {
        name: "Logarithms",
        ids: [
            ["log(x * y)","log(x) + log(y)"],
            ["log(x / y)","log(x) - log(y)"],
            ["log(a ^ b)","b * log(a)"]
        ]
    },
    {
        name: "Fractions",
        ids: [
            ["(a / b) * c","(a * c) / b"],
            ["a / (b / c)","(a * c) / b"],
            ["(a / b) / c","a / (b * c)"],
            ["a / b + c / d","(a * d + b * c) / (b * d)"]
        ]
    }
];

// ─── Variable Normalization ──────────────────────────────────
function normalizeVars(exprStr) {
    try {
        const node = math.parse(exprStr);
        const result = node.transform(function(n) {
            if (n.type === 'SymbolNode') {
                return new math.SymbolNode('x');
            }
            return n;
        });
        return result.toString();
    } catch(e) {
        return exprStr;
    }
}

function getMainVar(exprStr) {
    try {
        const node = math.parse(exprStr);
        const vars = new Set();
        node.traverse(function(n) {
            if (n.type === 'SymbolNode') vars.add(n.name);
        });
        return vars.size === 1 ? Array.from(vars)[0] : null;
    } catch(e) {
        return null;
    }
}

// ─── Block Tokenizer ─────────────────────────────────────────
// Splits a math.js toString() output into visual "blocks"
// keeping function calls intact, separating parens & operators.
function exprToBlocks(str) {
    const blocks = [];
    let i = 0;
    const fns = ['sin','cos','tan','sec','csc','cot','asin','acos','atan'];
    while (i < str.length) {
        if (str[i] === ' ') { i++; continue; }
        if (str[i] === '(' || str[i] === ')') { blocks.push(str[i]); i++; continue; }
        if ('+-*/^'.includes(str[i])) { blocks.push(str[i]); i++; continue; }

        // Try function name
        let fnMatch = false;
        for (const fn of fns) {
            if (str.substr(i, fn.length) === fn && str[i + fn.length] === '(') {
                let depth = 0, j = i + fn.length;
                do { if (str[j]==='(') depth++; if (str[j]===')') depth--; j++; } while (depth > 0 && j < str.length);
                blocks.push(str.substring(i, j));
                i = j; fnMatch = true; break;
            }
        }
        if (fnMatch) continue;

        // Number or identifier
        let tok = '';
        while (i < str.length && str[i] !== ' ' && str[i] !== '(' && str[i] !== ')' && !'+-*/^'.includes(str[i])) {
            tok += str[i]; i++;
        }
        if (tok) blocks.push(tok);
    }
    return blocks;
}

// ─── Syntax Highlight Tokens → HTML ──────────────────────────
function tokenToHTML(raw) {
    const fnNames = ['sin','cos','tan','sec','csc','cot','asin','acos','atan'];
    // If it's a function call like sin(x), break into parts
    for (const fn of fnNames) {
        if (raw.startsWith(fn + '(') && raw.endsWith(')')) {
            const inner = raw.slice(fn.length + 1, -1);
            return `<span class="syn-fn">${fn}</span><span class="syn-op">(</span>${highlightInner(inner)}<span class="syn-op">)</span>`;
        }
    }
    if ('+-*/^'.includes(raw) || raw === '(' || raw === ')') return `<span class="syn-op">${raw}</span>`;
    if (/^\d+(\.\d+)?$/.test(raw)) return `<span class="syn-num">${raw}</span>`;
    if (raw === 'x') return `<span class="syn-var">θ</span>`;
    if (raw === 'pi') return `<span class="syn-num">π</span>`;
    return `<span class="syn-var">${raw}</span>`;
}

function highlightInner(s) {
    // Recursively highlight inner content of function args
    const innerBlocks = exprToBlocks(s);
    return innerBlocks.map(b => tokenToHTML(b)).join('');
}

function syntaxHighlight(exprStr) {
    try {
        const node = math.parse(exprStr);
        return renderMathRecursive(node);
    } catch(e) {
        return exprToBlocks(exprStr).map(b => tokenToHTML(b)).join(' ');
    }
}

function renderMathRecursive(node) {
    if (node.type === 'OperatorNode') {
        if (node.op === '/') {
            return `<div class="math-frac"><div class="math-num">${renderMathRecursive(node.args[0])}</div><div class="math-den">${renderMathRecursive(node.args[1])}</div></div>`;
        }
        if (node.op === '^') {
            const base = renderMathRecursive(node.args[0]);
            const exp = renderMathRecursive(node.args[1]);
            return `${base}<span class="math-sup">${exp}</span>`;
        }
        
        // Handle normal operators with precedence/parens if needed
        const ops = { '+': '+', '-': '-', '*': '\u00B7' };
        let char = ops[node.op] || node.op;
        
        const wrap = (child, isLow) => {
            let html = renderMathRecursive(child);
            if (isLow && child.type === 'OperatorNode' && (child.op === '+' || child.op === '-')) {
                return `<span class="syn-op">(</span>${html}<span class="syn-op">)</span>`;
            }
            return html;
        };

        const isLow = (node.op === '*' || node.op === '/'); 
        return `${wrap(node.args[0], isLow)} <span class="syn-op">${char}</span> ${wrap(node.args[1], isLow)}`;
    }
    
    if (node.type === 'FunctionNode') {
        const name = node.fn.name || node.name;
        const args = node.args.map(a => renderMathRecursive(a)).join('<span class="syn-op">, </span>');
        return `<span class="syn-fn">${name}</span><span class="syn-op">(</span>${args}<span class="syn-op">)</span>`;
    }

    if (node.type === 'ParenthesisNode') {
        return `<span class="syn-op">(</span>${renderMathRecursive(node.content)}<span class="syn-op">)</span>`;
    }

    if (node.type === 'SymbolNode') {
        if (node.name === 'x') return `<span class="syn-var">\u03B8</span>`;
        if (node.name === 'pi') return `<span class="syn-num">\u03C0</span>`;
        return `<span class="syn-var">${node.name}</span>`;
    }

    if (node.type === 'ConstantNode') {
        return `<span class="syn-num">${node.value}</span>`;
    }

    return node.toString();
}

// ─── AST-based Match Finding ─────────────────────────────────
// Finds all contiguous block subsequences that match an identity
// pattern when parsed. Returns array of {start, end, from, to}
function findAllMatches(blocks, r) {
    const matches = [];
    const maxLen = blocks.length;

    for (let s = 0; s < maxLen; s++) {
        for (let e = s; e < maxLen; e++) {
            const sub = blocks.slice(s, e + 1).join(' ');
            try {
                const parsed = math.parse(sub).toString();
                const parsedNorm = normalizeVars(parsed);
                const fromNorm = normalizeVars(r.from);
                if (parsedNorm === fromNorm) {
                    const varName = getMainVar(sub);
                    let to = r.to;
                    if (varName && r.to.includes('x')) {
                        to = r.to.replace(/x/g, varName);
                    }
                    matches.push({start: s, end: e, from: parsed, to: to});
                } else if (parsedNorm === normalizeVars(r.to)) {
                    const varName = getMainVar(sub);
                    let from = r.from;
                    if (varName && r.from.includes('x')) {
                        from = r.from.replace(/x/g, varName);
                    }
                    matches.push({start: s, end: e, from: parsed, to: from});
                }
            } catch(ex) { /* invalid sub-expr */ }
        }
    }

    // Parametric matching for Double Angle
    if (r.type === 'double_angle') {
        for (let s = 0; s < maxLen; s++) {
            for (let e = s; e < maxLen; e++) {
                const sub = blocks.slice(s, e + 1).join(' ');
                try {
                    const subAst = math.parse(sub);
                    // For sin(2*x) -> 2*sin(x)*cos(x)
                    if (r.from === 'sin(2 * x)') {
                        if (subAst.type === 'FunctionNode' && subAst.name === 'sin' && subAst.args.length === 1) {
                            const arg = subAst.args[0];
                            if (arg.type === 'OperatorNode' && arg.op === '*' && arg.args.length === 2) {
                                const [left, right] = arg.args;
                                if (left.type === 'ConstantNode' && left.value % 2 === 0 && left.value > 0) {
                                    const c = left.value;
                                    const exprStr = right.toString();
                                    const toStr = math.parse(`2 * sin(${c/2} * ${exprStr}) * cos(${c/2} * ${exprStr})`).toString();
                                    matches.push({start: s, end: e, from: sub, to: toStr});
                                }
                            }
                        }
                    }
                    // For 2*sin(x)*cos(x) -> sin(2*x)
                    else if (r.from === '2 * sin(x) * cos(x)') {
                        if (subAst.type === 'OperatorNode' && subAst.op === '*' && subAst.args.length === 2) {
                            const [left, right] = subAst.args;
                            if (left.type === 'ConstantNode' && left.value === 2 && right.type === 'OperatorNode' && right.op === '*' && right.args.length === 2) {
                                const [sinPart, cosPart] = right.args;
                                if (sinPart.type === 'FunctionNode' && sinPart.name === 'sin' && sinPart.args.length === 1 &&
                                    cosPart.type === 'FunctionNode' && cosPart.name === 'cos' && cosPart.args.length === 1) {
                                    const expr = sinPart.args[0];
                                    if (expr.toString() === cosPart.args[0].toString()) {
                                        const exprStr = expr.toString();
                                        const toStr = math.parse(`sin(2 * ${exprStr})`).toString();
                                        matches.push({start: s, end: e, from: sub, to: toStr});
                                    }
                                }
                            }
                        }
                    }
                    // For cos(2*x) -> cos^2 - sin^2
                    else if (r.from === 'cos(2 * x)') {
                        if (subAst.type === 'FunctionNode' && subAst.name === 'cos' && subAst.args.length === 1) {
                            const arg = subAst.args[0];
                            if (arg.type === 'OperatorNode' && arg.op === '*' && arg.args.length === 2) {
                                const [left, right] = arg.args;
                                if (left.type === 'ConstantNode' && left.value % 2 === 0 && left.value > 0) {
                                    const c = left.value;
                                    const exprStr = right.toString();
                                    const toStr = math.parse(`cos(${c/2} * ${exprStr})^2 - sin(${c/2} * ${exprStr})^2`).toString();
                                    matches.push({start: s, end: e, from: sub, to: toStr});
                                }
                            }
                        }
                    }
                    // For cos^2 - sin^2 -> cos(2*x)
                    else if (r.from === 'cos(x)^2 - sin(x)^2') {
                        if (subAst.type === 'OperatorNode' && subAst.op === '-' && subAst.args.length === 2) {
                            const [left, right] = subAst.args;
                            if (left.type === 'OperatorNode' && left.op === '^' && left.args.length === 2 &&
                                right.type === 'OperatorNode' && right.op === '^' && right.args.length === 2) {
                                const [cosBase, cosExp] = left.args;
                                const [sinBase, sinExp] = right.args;
                                if (cosExp.type === 'ConstantNode' && cosExp.value === 2 &&
                                    sinExp.type === 'ConstantNode' && sinExp.value === 2 &&
                                    cosBase.type === 'FunctionNode' && cosBase.name === 'cos' && cosBase.args.length === 1 &&
                                    sinBase.type === 'FunctionNode' && sinBase.name === 'sin' && sinBase.args.length === 1) {
                                    const expr = cosBase.args[0];
                                    if (expr.toString() === sinBase.args[0].toString()) {
                                        const exprStr = expr.toString();
                                        const toStr = math.parse(`cos(2 * ${exprStr})`).toString();
                                        matches.push({start: s, end: e, from: sub, to: toStr});
                                    }
                                }
                            }
                        }
                    }
                } catch(ex) { /* invalid */ }
            }
        }
    }

    // Prefer smallest ranges — remove supersets of existing matches
    matches.sort((a,b) => (a.end - a.start) - (b.end - b.start));
    const minimal = [];
    for (const m of matches) {
        const isSuperset = minimal.some(n => n.start >= m.start && n.end <= m.end && n.from === m.from);
        if (!isSuperset) minimal.push(m);
        else {
            // Still add if it's a different position
            const exact = minimal.some(n => n.start === m.start && n.end === m.end && n.from === m.from);
            if (!exact) minimal.push(m);
        }
    }
    return minimal;
}

// Find the best match near a given block index
function bestMatchNear(matches, blockIdx) {
    if (matches.length === 0) return null;
    // Prefer matches containing the hovered block, smallest first
    let containing = matches.filter(m => blockIdx >= m.start && blockIdx <= m.end);
    if (containing.length > 0) {
        containing.sort((a,b) => (a.end - a.start) - (b.end - b.start));
        return containing[0];
    }
    // Otherwise nearest match
    let best = null, bestDist = Infinity;
    for (const m of matches) {
        const center = (m.start + m.end) / 2;
        const d = Math.abs(blockIdx - center);
        if (d < bestDist) { bestDist = d; best = m; }
    }
    return best;
}

// ─── Apply Match (replace blocks and re-parse) ───────────────
function applyMatch(exprStr, blocks, match) {
    const before = blocks.slice(0, match.start);
    const after = blocks.slice(match.end + 1);
    const newParts = [...before, `(${match.to})`, ...after];
    const newStr = newParts.join(' ');
    try { return math.parse(newStr).toString(); } catch(e) { return null; }
}

// ─── Algebraic Operations ────────────────────────────────────
// Returns new expression string or null

function tryDistribute(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '*' && n.args.length === 2) {
            const [L, R] = n.args;
            // a * (b + c) or a * (b - c)
            if (R.type === 'OperatorNode' && (R.op === '+' || R.op === '-') && R.args.length === 2) {
                changed = true;
                const t1 = math.parse(`(${L}) * (${R.args[0]})`);
                const t2 = math.parse(`(${L}) * (${R.args[1]})`);
                return math.parse(`(${t1}) ${R.op} (${t2})`);
            }
            // (a + b) * c
            if (L.type === 'OperatorNode' && (L.op === '+' || L.op === '-') && L.args.length === 2) {
                changed = true;
                const t1 = math.parse(`(${L.args[0]}) * (${R})`);
                const t2 = math.parse(`(${L.args[1]}) * (${R})`);
                return math.parse(`(${t1}) ${L.op} (${t2})`);
            }
        }
        return n;
    });
    return changed ? math.parse(result.toString()).toString() : null;
}

function tryExpandSquare(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '^' && n.args.length === 2) {
            const [base, exp] = n.args;
            // Check exponent is 2
            if (exp.type === 'ConstantNode' && exp.value === 2) {
                // Check base is a sum/difference
                let inner = base;
                if (base.type === 'ParenthesisNode') inner = base.content;
                if (inner.type === 'OperatorNode' && (inner.op === '+' || inner.op === '-') && inner.args.length === 2) {
                    changed = true;
                    const a = inner.args[0].toString();
                    const b = inner.args[1].toString();
                    if (inner.op === '+') {
                        return math.parse(`(${a}) ^ 2 + 2 * (${a}) * (${b}) + (${b}) ^ 2`);
                    } else {
                        return math.parse(`(${a}) ^ 2 - 2 * (${a}) * (${b}) + (${b}) ^ 2`);
                    }
                }
            }
        }
        return n;
    });
    return changed ? math.parse(result.toString()).toString() : null;
}

function tryExpandCube(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '^' && n.args.length === 2) {
            const [base, exp] = n.args;
            if (exp.type === 'ConstantNode' && exp.value === 3) {
                let inner = base;
                if (base.type === 'ParenthesisNode') inner = base.content;
                if (inner.type === 'OperatorNode' && (inner.op === '+' || inner.op === '-') && inner.args.length === 2) {
                    changed = true;
                    const a = inner.args[0].toString();
                    const b = inner.args[1].toString();
                    if (inner.op === '+') {
                        return math.parse(`(${a}) ^ 3 + 3 * (${a}) ^ 2 * (${b}) + 3 * (${a}) * (${b}) ^ 2 + (${b}) ^ 3`);
                    } else {
                        return math.parse(`(${a}) ^ 3 - 3 * (${a}) ^ 2 * (${b}) + 3 * (${a}) * (${b}) ^ 2 - (${b}) ^ 3`);
                    }
                }
            }
        }
        return n;
    });
    return changed ? math.parse(result.toString()).toString() : null;
}

function trySimplify(exprStr) {
    try {
        const simplified = math.simplify(exprStr).toString();
        if (simplified !== exprStr) return simplified;
    } catch(e) {}
    return null;
}

// ─── Commutative Property: swap operands of + or * ───────────
function tryCommute(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && (n.op === '+' || n.op === '*') && n.args.length === 2) {
            changed = true;
            return new math.OperatorNode(n.op, n.fn, [n.args[1].cloneDeep(), n.args[0].cloneDeep()]);
        }
        return n;
    });
    if (!changed) return null;
    const r = math.parse(result.toString()).toString();
    return r !== exprStr ? r : null;
}

// ─── Associative Property: regroup (a+b)+c → a+(b+c) ────────
function tryAssociate(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && (n.op === '+' || n.op === '*') && n.args.length === 2) {
            const [L, R] = n.args;
            // (a ○ b) ○ c  →  a ○ (b ○ c)
            if (L.type === 'OperatorNode' && L.op === n.op && L.args.length === 2) {
                changed = true;
                const inner = new math.OperatorNode(n.op, n.fn, [L.args[1].cloneDeep(), R.cloneDeep()]);
                return new math.OperatorNode(n.op, n.fn, [L.args[0].cloneDeep(), inner]);
            }
            // a ○ (b ○ c)  →  (a ○ b) ○ c
            if (R.type === 'OperatorNode' && R.op === n.op && R.args.length === 2) {
                changed = true;
                const inner = new math.OperatorNode(n.op, n.fn, [L.cloneDeep(), R.args[0].cloneDeep()]);
                return new math.OperatorNode(n.op, n.fn, [inner, R.args[1].cloneDeep()]);
            }
        }
        return n;
    });
    if (!changed) return null;
    const r = math.parse(result.toString()).toString();
    return r !== exprStr ? r : null;
}

// ─── Factor Common Term: a*c + b*c → (a+b)*c ────────────────
function tryFactor(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && (n.op === '+' || n.op === '-') && n.args.length === 2) {
            const leftFactors = getMultFactors(n.args[0]);
            const rightFactors = getMultFactors(n.args[1]);
            // Find a common factor by string comparison
            for (const lf of leftFactors) {
                for (const rf of rightFactors) {
                    if (lf.str === rf.str) {
                        changed = true;
                        const leftRem = removeOneFactor(n.args[0], lf.str);
                        const rightRem = removeOneFactor(n.args[1], rf.str);
                        return math.parse(`((${leftRem}) ${n.op} (${rightRem})) * (${lf.str})`);
                    }
                }
            }
        }
        return n;
    });
    if (!changed) return null;
    try { const r = math.parse(result.toString()).toString(); return r !== exprStr ? r : null; }
    catch(e) { return null; }
}

function getMultFactors(node) {
    if (node.type === 'OperatorNode' && node.op === '*') {
        const factors = [];
        for (const a of node.args) factors.push(...getMultFactors(a));
        return factors;
    }
    return [{str: node.toString(), node}];
}

function removeOneFactor(node, factorStr) {
    if (node.toString() === factorStr) return '1';
    if (node.type === 'OperatorNode' && node.op === '*' && node.args.length === 2) {
        if (node.args[0].toString() === factorStr) return node.args[1].toString();
        if (node.args[1].toString() === factorStr) return node.args[0].toString();
        // Try deeper
        const leftTry = removeOneFactor(node.args[0], factorStr);
        if (leftTry !== node.args[0].toString()) return `(${leftTry}) * (${node.args[1]})`;
        const rightTry = removeOneFactor(node.args[1], factorStr);
        if (rightTry !== node.args[1].toString()) return `(${node.args[0]}) * (${rightTry})`;
    }
    return node.toString();
}

// ─── Combine Fractions: a/c + b/c → (a+b)/c ─────────────────
function tryCombineFractions(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && (n.op === '+' || n.op === '-') && n.args.length === 2) {
            const [L, R] = n.args;
            const lDiv = (L.type === 'OperatorNode' && L.op === '/');
            const rDiv = (R.type === 'OperatorNode' && R.op === '/');
            if (lDiv && rDiv) {
                const ld = L.args[1].toString(), rd = R.args[1].toString();
                if (ld === rd) {
                    changed = true;
                    return math.parse(`((${L.args[0]}) ${n.op} (${R.args[0]})) / (${ld})`);
                }
                // Different denominators: cross multiply
                changed = true;
                return math.parse(`((${L.args[0]}) * (${rd}) ${n.op} (${R.args[0]}) * (${ld})) / ((${ld}) * (${rd}))`);
            }
            // One is a fraction, other is not: a + b/c → (a*c + b)/c
            if (rDiv && !lDiv) {
                changed = true;
                const d = R.args[1].toString();
                return math.parse(`((${L}) * (${d}) ${n.op} (${R.args[0]})) / (${d})`);
            }
            if (lDiv && !rDiv) {
                changed = true;
                const d = L.args[1].toString();
                return math.parse(`((${L.args[0]}) ${n.op} (${R}) * (${d})) / (${d})`);
            }
        }
        return n;
    });
    if (!changed) return null;
    try { const r = math.parse(result.toString()).toString(); return r !== exprStr ? r : null; }
    catch(e) { return null; }
}

// ─── Split Fraction: (a+b)/c → a/c + b/c ────────────────────
function trySplitFraction(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '/' && n.args.length === 2) {
            let num = n.args[0];
            if (num.type === 'ParenthesisNode') num = num.content;
            if (num.type === 'OperatorNode' && (num.op === '+' || num.op === '-') && num.args.length === 2) {
                changed = true;
                const d = n.args[1].toString();
                return math.parse(`(${num.args[0]}) / (${d}) ${num.op} (${num.args[1]}) / (${d})`);
            }
        }
        return n;
    });
    if (!changed) return null;
    try { const r = math.parse(result.toString()).toString(); return r !== exprStr ? r : null; }
    catch(e) { return null; }
}

// ─── Additive Identity: remove +0 or 0+ terms ───────────────
function tryAdditiveIdentity(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '+' && n.args.length === 2) {
            if (n.args[1].type === 'ConstantNode' && n.args[1].value === 0) { changed = true; return n.args[0]; }
            if (n.args[0].type === 'ConstantNode' && n.args[0].value === 0) { changed = true; return n.args[1]; }
        }
        return n;
    });
    if (!changed) return null;
    const r = math.parse(result.toString()).toString();
    return r !== exprStr ? r : null;
}

// ─── Multiplicative Identity: remove *1 or 1* terms ─────────
function tryMultiplicativeIdentity(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '*' && n.args.length === 2) {
            if (n.args[1].type === 'ConstantNode' && n.args[1].value === 1) { changed = true; return n.args[0]; }
            if (n.args[0].type === 'ConstantNode' && n.args[0].value === 1) { changed = true; return n.args[1]; }
        }
        // Also handle x / 1 → x
        if (n.type === 'OperatorNode' && n.op === '/' && n.args.length === 2) {
            if (n.args[1].type === 'ConstantNode' && n.args[1].value === 1) { changed = true; return n.args[0]; }
        }
        return n;
    });
    if (!changed) return null;
    const r = math.parse(result.toString()).toString();
    return r !== exprStr ? r : null;
}

// ─── Cancel Common Factors in fraction: (a*b)/(a*c) → b/c ──
function tryCancelFraction(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '/' && n.args.length === 2) {
            const numFactors = getMultFactors(n.args[0]);
            const denFactors = getMultFactors(n.args[1]);
            for (const nf of numFactors) {
                for (const df of denFactors) {
                    if (nf.str === df.str) {
                        changed = true;
                        const newNum = removeOneFactor(n.args[0], nf.str);
                        const newDen = removeOneFactor(n.args[1], df.str);
                        return math.parse(`(${newNum}) / (${newDen})`);
                    }
                }
            }
        }
        return n;
    });
    if (!changed) return null;
    try { const r = math.parse(result.toString()).toString(); return r !== exprStr ? r : null; }
    catch(e) { return null; }
}

// ─── Multiply Fractions: (a/b) * (c/d) → (a*c)/(b*d) ───────
function tryMultiplyFractions(exprStr) {
    const node = math.parse(exprStr);
    let changed = false;
    const result = node.transform(function(n) {
        if (changed) return n;
        if (n.type === 'OperatorNode' && n.op === '*' && n.args.length === 2) {
            const [L, R] = n.args;
            const lDiv = (L.type === 'OperatorNode' && L.op === '/');
            const rDiv = (R.type === 'OperatorNode' && R.op === '/');
            if (lDiv && rDiv) {
                changed = true;
                return math.parse(`((${L.args[0]}) * (${R.args[0]})) / ((${L.args[1]}) * (${R.args[1]}))`);
            }
        }
        return n;
    });
    if (!changed) return null;
    try { const r = math.parse(result.toString()).toString(); return r !== exprStr ? r : null; }
    catch(e) { return null; }
}

const algebraOps = [
    { name: "Distribute",      desc: "a·(b+c) → a·b + a·c",       fn: tryDistribute,           color: "#f59e0b" },
    { name: "Expand (…)²",     desc: "(a+b)² → a²+2ab+b²",        fn: tryExpandSquare,          color: "#f59e0b" },
    { name: "Expand (…)³",     desc: "(a+b)³ → a³+3a²b+…",        fn: tryExpandCube,            color: "#f59e0b" },
    { name: "Commute",         desc: "a + b → b + a  or  a·b → b·a", fn: tryCommute,            color: "#06b6d4" },
    { name: "Associate",       desc: "(a+b)+c ↔ a+(b+c)",          fn: tryAssociate,             color: "#06b6d4" },
    { name: "Factor",          desc: "a·c + b·c → (a+b)·c",        fn: tryFactor,               color: "#10b981" },
    { name: "Combine Frac",    desc: "a/c + b/c → (a+b)/c",        fn: tryCombineFractions,     color: "#10b981" },
    { name: "Split Frac",      desc: "(a+b)/c → a/c + b/c",        fn: trySplitFraction,        color: "#10b981" },
    { name: "Mult. Fracs",     desc: "(a/b)·(c/d) → ac/bd",        fn: tryMultiplyFractions,    color: "#10b981" },
    { name: "Cancel",          desc: "(a·b)/(a·c) → b/c",          fn: tryCancelFraction,       color: "#ec4899" },
    { name: "×1 Identity",     desc: "a·1 → a  or  a/1 → a",      fn: tryMultiplicativeIdentity,color: "#8b5cf6" },
    { name: "+0 Identity",     desc: "a + 0 → a",                  fn: tryAdditiveIdentity,     color: "#8b5cf6" },
    { name: "Simplify",        desc: "Auto-simplify expression",    fn: trySimplify,             color: "#8b5cf6" }
];

// ─── Validation: kπ/6 for [-2π, 2π] ─────────────────────────
function checkPointValid(codeA, codeB, theta) {
    try {
        let a = codeA.evaluate({x: theta});
        let b = codeB.evaluate({x: theta});
        let aInf = !Number.isFinite(a) || Math.abs(a) > 1e5;
        let bInf = !Number.isFinite(b) || Math.abs(b) > 1e5;
        if (aInf && bInf) return true;
        if (aInf !== bInf) return false;
        return Math.abs(a - b) < 1e-4;
    } catch(e) { return false; }
}

function validateEquivalence(oldExpr, newExpr) {
    try {
        const codeOld = math.compile(oldExpr);
        const codeNew = math.compile(newExpr);
        // Test points with a slight irrational offset (0.12345) to avoid 
        // hitting exact singularities like pi/2 (where cos=0) or 3pi/2.
        for (let k = -12; k <= 12; k++) {
            const theta = k * Math.PI / 6 + 0.12345;
            if (!checkPointValid(codeOld, codeNew, theta)) return false;
        }
        return true;
    } catch(e) { return false; }
}

function getNeighbors(exprStr, rules) {
    let results = [];
    let blocks = [];
    try { blocks = exprToBlocks(exprStr); } catch(e) { return results; }

    for (let r of rules) {
        if (r.isAlgebra) {
            try {
                let res = r.fn(exprStr);
                if (res && res !== exprStr) {
                    results.push({ expr: res, desc: r.name, cat: 'Algebra' });
                }
            } catch(e) {}
        } else {
            const matches = findAllMatches(blocks, r);
            for (let m of matches) {
                const res = applyMatch(exprStr, blocks, m);
                if (res && res !== exprStr) {
                    results.push({ expr: res, desc: `Apply ${r.name}: ${m.from} \u2192 ${m.to}`, cat: r.name });
                }
            }
        }
    }
    try {
        let simp = math.simplify(exprStr).toString();
        if (simp && simp !== exprStr && simp.replace(/\s/g, '') !== exprStr.replace(/\s/g, '')) {
            results.push({ expr: simp, desc: 'Simplify terms', cat: 'Algebra' });
        }
    } catch(e) {}
    return results;
}

async function searchSteps(oldExpr, newExpr) {
    // 1. Check direct equivalence via Nerdamer (fast logical check)
    let isEq = false;
    try { 
        if (nerdamer('simplify((' + oldExpr + ')-(' + newExpr + '))').toString() === '0') isEq = true;
    } catch(e) {}
    if (!isEq) isEq = validateEquivalence(oldExpr, newExpr);

    if (!isEq) return { steps: -1, path: [], cat: null }; // Not mathematically equal

    const targetStr = math.parse(newExpr).toString();
    if (math.parse(oldExpr).toString() === targetStr) {
        return { steps: 0, path: [], cat: 'Algebra' }; // Pure formatting/whitespace change
    }

    const rules = [];
    identityCategories.forEach(cat => {
        cat.ids.forEach(pair => {
            const r = { name: cat.name, from: math.parse(pair[0]).toString(), to: math.parse(pair[1]).toString() };
            if (cat.name === 'Double Angle') r.type = 'double_angle';
            rules.push(r);
            const rRev = { name: cat.name, from: math.parse(pair[1]).toString(), to: math.parse(pair[0]).toString() };
            if (cat.name === 'Double Angle') rRev.type = 'double_angle';
            rules.push(rRev);
        });
    });
    algebraOps.forEach(op => rules.push({ name: op.name, isAlgebra: true, fn: op.fn }));

    // Depth 1
    const step1 = getNeighbors(oldExpr, rules);
    for (let n1 of step1) {
        try { if (math.parse(n1.expr).toString() === targetStr) return { steps: 1, path: [n1.desc], cat: n1.cat }; } catch(e){}
    }

    // Depth 1 using Nerdamer equivalence (handles commutativity that strict AST misses)
    for (let n1 of step1) {
        try { 
            if (nerdamer('simplify((' + n1.expr + ')-(' + targetStr + '))').toString() === '0') {
               return { steps: 1, path: [n1.desc], cat: n1.cat };
            }
        } catch(e) {}
    }

    // Depth 2
    let count = 0;
    for (let n1 of step1) {
        const step2 = getNeighbors(n1.expr, rules);
        for (let n2 of step2) {
            count++;
            if (count % 40 === 0) await new Promise(r => setTimeout(r, 0)); // Yield event loop to prevent freezing
            try { 
                if (math.parse(n2.expr).toString() === targetStr) {
                    return { steps: 2, path: [n1.desc, n2.desc], cat: null };
                }
            } catch(e){}
        }
    }

    return { steps: Infinity, path: [], cat: null }; // Equivalent, but >2 steps
}

// ─── Delete Block Logic ──────────────────────────────────────
function tryDeleteBlock(exprStr, blocks, blockIdx) {
    // Try removing just this block
    let attempt = [...blocks];
    attempt.splice(blockIdx, 1);

    // Also try removing adjacent operator
    const tryParses = [attempt];

    // If previous block is an operator, try removing it too
    if (blockIdx > 0 && '+-*/^'.includes(blocks[blockIdx - 1])) {
        let a2 = [...blocks];
        a2.splice(blockIdx - 1, 2);
        tryParses.push(a2);
    }
    // If next block is operator, try removing it too
    if (blockIdx < blocks.length - 1 && '+-*/^'.includes(blocks[blockIdx + 1])) {
        let a3 = [...blocks];
        a3.splice(blockIdx, 2);
        tryParses.push(a3);
    }

    for (const arr of tryParses) {
        if (arr.length === 0) continue;
        const s = arr.join(' ');
        try {
            const parsed = math.parse(s).toString();
            return parsed;
        } catch(e) {}
    }
    return null;
}
