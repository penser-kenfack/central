WEIGHTS = {'Critical': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Informational': 1}

# OWASP Top 10 (2021) category of each kind of finding produced by the scanner
CATEGORIES = [
    (('Browser Security', 'Cookie Security'), 'A05:2021 – Security Misconfiguration'),
    (('TLS Scanner',), 'A02:2021 – Cryptographic Failures'),
    (('Redirect Scanner',), 'A01:2021 – Broken Access Control'),
    (('URL Risk Analyzer',), 'Phishing / impersonation (outside OWASP Top 10)'),
]


def categorize(f):
    if f.get('category'):
        return f['category']
    for sources, cat in CATEGORIES:
        if f.get('source') in sources:
            return cat
    return 'Other / tool output'


def normalize_findings(items):
    out = []; seen = set()
    for f in items:
        s = f.get('severity', 'Informational').title()
        if s not in WEIGHTS: s = 'Informational'
        f = dict(f); f['severity'] = s; f['category'] = categorize(f)
        key = (f.get('title'), f.get('url'), s)
        if key in seen: continue
        seen.add(key); out.append(f)
    return sorted(out, key=lambda x: WEIGHTS[x['severity']], reverse=True)


def summarize(items):
    r = {x: 0 for x in WEIGHTS}
    for f in items: r[f['severity']] += 1
    return r


PENALTY = {'Critical': 25, 'High': 15, 'Medium': 8, 'Low': 3, 'Informational': 0}


def risk_score(items):
    """Simple, explainable security score: 100 minus a penalty per finding (capped per severity)."""
    counts = summarize(items)
    loss = sum(min(PENALTY[s] * n, PENALTY[s] * 4) for s, n in counts.items())
    score = max(0, 100 - loss)
    grade = 'A' if score >= 90 else 'B' if score >= 75 else 'C' if score >= 60 else 'D' if score >= 40 else 'F'
    return score, grade
