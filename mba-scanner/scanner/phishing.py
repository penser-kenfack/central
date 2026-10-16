import ipaddress,re
from urllib.parse import urlparse

SUSPICIOUS_TLDS={'zip','top','click','gq','tk','ml','ga','cf','work','country','download'}

def analyze_url(target):
    p=urlparse(target); host=(p.hostname or '').lower(); reasons=[]; score=0
    try: ipaddress.ip_address(host); reasons.append('Host is an IP address instead of a normal domain.'); score+=25
    except ValueError: pass
    if len(target)>100: score+=10; reasons.append('URL is unusually long.')
    if host.count('.')>=4: score+=10; reasons.append('Host contains many subdomains.')
    if host.count('-')>=3: score+=10; reasons.append('Host contains multiple hyphens.')
    if '@' in target: score+=25; reasons.append('URL contains @, which can obscure the real destination.')
    if '%' in target: score+=5; reasons.append('URL contains percent-encoded characters.')
    if host.startswith('xn--') or '.xn--' in host: score+=20; reasons.append('Punycode/IDN hostname detected; verify the domain carefully.')
    tld=host.rsplit('.',1)[-1] if '.' in host else ''
    if tld in SUSPICIOUS_TLDS: score+=10; reasons.append(f'.{tld} is treated as a higher-risk TLD by this heuristic.')
    if re.search(r'(login|verify|secure|account|update|wallet|support|password)',host): score+=5; reasons.append('Host contains terms commonly used in impersonation URLs.')
    score=min(100,score)
    if score>=60: label='HIGH RISK — LIKELY FAKE'; severity='High'
    elif score>=30: label='SUSPICIOUS / UNVERIFIED'; severity='Medium'
    else: label='REAL WEBSITE (HEURISTIC CHECK)'; severity='Informational'
    return {'label':label,'score':score,'reasons':reasons,'severity':severity}

def scan_phishing(target):
    r=analyze_url(target)
    if r['score']<30: return [{'title':'URL reputation heuristic: low risk','severity':'Informational','source':'URL Risk Analyzer','url':target,
    'description':r['label'],'evidence':f"Heuristic score {r['score']}/100.",'recommendation':'This is not proof that a website is legitimate; verify ownership and reputation separately.'}]
    return [{'title':f"URL risk: {r['label']}",'severity':r['severity'],'source':'URL Risk Analyzer','url':target,
    'description':'; '.join(r['reasons']) or r['label'],'evidence':f"Heuristic score {r['score']}/100.",'recommendation':'Verify the domain through a trusted source before entering credentials or sensitive data.'}]
