import requests

def scan_redirects(target):
    out=[]
    try:
        r=requests.get(target,timeout=10,allow_redirects=False,headers={'User-Agent':'WebVulnerabilityScanner/2.0'})
        chain=[]; current=target; session=requests.Session()
        for _ in range(8):
            x=session.get(current,timeout=8,allow_redirects=False,headers={'User-Agent':'WebVulnerabilityScanner/2.0'})
            chain.append((current,x.status_code,x.headers.get('Location','')))
            loc=x.headers.get('Location')
            if not loc: break
            from urllib.parse import urljoin
            current=urljoin(current,loc)
        if len(chain)>3:
            out.append({'title':'Long redirect chain','severity':'Low','source':'Redirect Scanner','url':target,
            'description':f'The target required {len(chain)-1} redirect hop(s) before completion.','evidence':' -> '.join(f'{s} {loc}' for _,s,loc in chain),
            'recommendation':'Review unnecessary redirect hops and ensure redirects remain within the intended security boundary.'})
        return out
    except Exception as e:
        return [{'title':'Redirect analysis error','severity':'Informational','source':'Redirect Scanner','url':target,
        'description':'Redirect analysis could not complete.','evidence':str(e),'recommendation':'Verify target connectivity.'}]
