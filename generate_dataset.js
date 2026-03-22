const fs = require('fs');
const vm = require('vm');
const math = require('mathjs');

// Mock global variables for trig-engine.js if needed
global.math = math;

// Load trig_engine functions to global scope
const engineCode = fs.readFileSync('c:\\Users\\ciara\\Trig Game\\trig-engine.js', 'utf8');
vm.runInThisContext(engineCode);

function generatePuzzle(rng, difficulty) {
    // Build a flat list of all identity pairs (normalized)
    const allIds = [];
    identityCategories.forEach(cat => {
        cat.ids.forEach(pair => {
            const a = math.parse(pair[0]).toString();
            const b = math.parse(pair[1]).toString();
            allIds.push({ a, b });
        });
    });

    const bases = [
        'sin(x)', 'cos(x)', 'tan(x)', 'sec(x)', 'csc(x)', 'cot(x)',
        'sin(x)^2', 'cos(x)^2', 'tan(x)^2',
        'sin(x) * cos(x)', 'sin(x) + cos(x)',
        'tan(x) * cos(x)', 'sec(x) * sin(x)',
        'csc(x) * cos(x)', 'cot(x) * sin(x)'
    ];

    let expr = bases[Math.floor(rng() * bases.length)];
    expr = math.parse(expr).toString();

    function tryApplyIdentity(exprStr, id) {
        const blocks = exprToBlocks(exprStr);
        const results = [];
        
        // Use simplified exact matching for generation performance
        const matchesAB = [];
        for (let s = 0; s < blocks.length; s++) {
            for (let e = s; e < blocks.length; e++) {
                const sub = blocks.slice(s, e + 1).join(' ');
                try {
                    if (math.parse(sub).toString() === id.a) matchesAB.push({start: s, end: e, from: id.a, to: id.b});
                } catch(ex) {}
            }
        }
        matchesAB.forEach(m => {
            const r = applyMatch(exprStr, blocks, m);
            if (r && r !== exprStr) results.push(r);
        });

        const matchesBA = [];
        for (let s = 0; s < blocks.length; s++) {
            for (let e = s; e < blocks.length; e++) {
                const sub = blocks.slice(s, e + 1).join(' ');
                try {
                    if (math.parse(sub).toString() === id.b) matchesBA.push({start: s, end: e, from: id.b, to: id.a});
                } catch(ex) {}
            }
        }
        matchesBA.forEach(m => {
            const r = applyMatch(exprStr, blocks, m);
            if (r && r !== exprStr) results.push(r);
        });
        return results;
    }

    function exprLen(e) { return e.length; }

    for (let step = 0; step < difficulty; step++) {
        const simp = trySimplify(expr);
        if (simp) expr = simp;

        const expanding = [];
        for (const id of allIds) {
            const results = tryApplyIdentity(expr, id);
            results.forEach(r => {
                if (exprLen(r) > exprLen(expr)) expanding.push(r);
            });
        }
        const dist = tryDistribute(expr);
        if (dist && exprLen(dist) > exprLen(expr)) expanding.push(dist);
        const sq = tryExpandSquare(expr);
        if (sq && exprLen(sq) > exprLen(expr)) expanding.push(sq);

        if (expanding.length === 0) break;
        expr = expanding[Math.floor(rng() * expanding.length)];
    }

    let midSimp = trySimplify(expr);
    if (midSimp) expr = midSimp;

    const expandedSide = expr;

    for (let step = 0; step < difficulty; step++) {
        const simp = trySimplify(expr);
        if (simp) expr = simp;

        const shortening = [];
        for (const id of allIds) {
            const results = tryApplyIdentity(expr, id);
            results.forEach(r => {
                if (exprLen(r) < exprLen(expr)) shortening.push(r);
            });
        }
        const fact = tryFactor(expr);
        if (fact && exprLen(fact) < exprLen(expr)) shortening.push(fact);
        const cancel = tryCancelFraction(expr);
        if (cancel && exprLen(cancel) < exprLen(expr)) shortening.push(cancel);
        const comb = tryCombineFractions(expr);
        if (comb && exprLen(comb) < exprLen(expr)) shortening.push(comb);

        if (shortening.length === 0) break;
        expr = shortening[Math.floor(rng() * shortening.length)];
    }

    let finalSimp = trySimplify(expr);
    if (finalSimp) expr = finalSimp;

    const shortenedSide = expr;

    if (rng() < 0.5) {
        return { left: expandedSide, right: shortenedSide, diff: difficulty };
    } else {
        return { left: shortenedSide, right: expandedSide, diff: difficulty };
    }
}

const db = [];
const seen = new Set();
let h = 12345;
let rng = () => { var t = h += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

console.log("Generating identities...");
const difficulties = [1, 2, 3, 4, 5, 6, 7];
for (let i = 0; i < 2000; i++) {
    const diff = difficulties[Math.floor(rng() * difficulties.length)];
    const id = generatePuzzle(rng, diff);
    // Ensure equations actually are equations and differ between sides
    if (id.left === id.right) continue;
    if (id.left.length > 150 || id.right.length > 150) continue; // Skip huge ones
    
    // Check if same to remove simple reversals
    const canon = [id.left, id.right].sort().join("====");
    if (!seen.has(canon)) {
        seen.add(canon);
        db.push(id);
    }
}

// Add a few hardcoded known identities to ensure some canonical proofs exist
const levelDB = [
    {left:"tan(x) * cos(x)",right:"sin(x)", diff: 1},
    {left:"sec(x) * cot(x)",right:"csc(x)", diff: 1},
    {left:"csc(x) / sec(x)",right:"cot(x)", diff: 1},
    {left:"(sin(x) + cos(x))^2 - 1",right:"2 * sin(x) * cos(x)", diff: 2},
    {left:"sec(x)^2 - 1",right:"tan(x)^2", diff: 2},
    {left:"cos(x) * (tan(x) + cot(x))",right:"csc(x)", diff: 2}
];
db.push(...levelDB);

const out = `const hugeLevelDB = ${JSON.stringify(db, null, 2)};\n`;
fs.writeFileSync('c:\\Users\\ciara\\Trig Game\\levels.js', out);
console.log(`Generated ${db.length} identities and saved to levels.js`);
