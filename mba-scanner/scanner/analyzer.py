WEIGHTS={'Critical':5,'High':4,'Medium':3,'Low':2,'Informational':1}
def normalize_findings(items):
    out=[]; seen=set()
    for f in items:
        s=f.get('severity','Informational').title()
        if s not in WEIGHTS: s='Informational'
        f=dict(f); f['severity']=s
        key=(f.get('title'),f.get('url'),s)
        if key in seen: continue
        seen.add(key); out.append(f)
    return sorted(out,key=lambda x:WEIGHTS[x['severity']],reverse=True)
def summarize(items):
    r={x:0 for x in WEIGHTS}
    for f in items:r[f['severity']]+=1
    return r
