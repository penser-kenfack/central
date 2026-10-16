import requests
from urllib.parse import urlparse

CHECKS={
 'Content-Security-Policy':('Medium','Helps restrict script, object, frame and resource sources.'),
 'X-Frame-Options':('Low','Helps prevent clickjacking when CSP frame-ancestors is not used.'),
 'X-Content-Type-Options':('Low','Prevents MIME-type sniffing when set to nosniff.'),
 'Referrer-Policy':('Low','Controls how much referrer information browsers send.'),
 'Permissions-Policy':('Low','Restricts access to browser capabilities such as camera or microphone.'),
 'Strict-Transport-Security':('Low','For HTTPS sites, tells browsers to prefer HTTPS.'),
}

def scan_browser_security(target):
    out=[]
    try:
        r=requests.get(target,timeout=10,allow_redirects=True,headers={'User-Agent':'WebVulnerabilityScanner/2.0'})
        headers={k.lower():v for k,v in r.headers.items()}
        for name,(sev,why) in CHECKS.items():
            if name.lower() not in headers:
                # HSTS only makes sense on HTTPS.
                if name=='Strict-Transport-Security' and urlparse(r.url).scheme!='https': continue
                out.append({'title':f'Missing browser security policy: {name}','severity':sev,'source':'Browser Security','url':r.url,
                'description':why,'evidence':f'HTTP {r.status_code}; {name} header absent.','recommendation':f'Configure {name} appropriately for the application.'})
        csp=headers.get('content-security-policy','')
        if csp and ('unsafe-inline' in csp or 'unsafe-eval' in csp):
            out.append({'title':'Weak Content-Security-Policy directive','severity':'Medium','source':'Browser Security','url':r.url,
            'description':'The CSP contains unsafe-inline or unsafe-eval, which can weaken script protections.','evidence':csp[:500],
            'recommendation':'Remove unsafe-inline/unsafe-eval where practical and use nonces or hashes.'})
        server=r.headers.get('Server')
        if server:
            out.append({'title':'Server technology disclosure','severity':'Informational','source':'Browser Security','url':r.url,
            'description':'The response exposes a Server header that may assist fingerprinting.','evidence':server,
            'recommendation':'Minimize unnecessary version and product disclosure.'})
        for c in r.cookies:
            if not c.secure:
                out.append({'title':'Cookie missing Secure attribute','severity':'Low','source':'Cookie Security','url':r.url,
                'description':f'Cookie {c.name} is not marked Secure.','evidence':c.name,'recommendation':'Set Secure on cookies that should only travel over HTTPS.'})
            if not c.has_nonstandard_attr('HttpOnly'):
                out.append({'title':'Cookie missing HttpOnly attribute','severity':'Low','source':'Cookie Security','url':r.url,
                'description':f'Cookie {c.name} is not marked HttpOnly.','evidence':c.name,'recommendation':'Set HttpOnly on session cookies that do not need JavaScript access.'})
        return out
    except Exception as e:
        return [{'title':'Browser security analysis error','severity':'Informational','source':'Browser Security','url':target,
        'description':'The browser-policy check could not complete.','evidence':str(e),'recommendation':'Verify that the target is reachable and try the scan again.'}]
