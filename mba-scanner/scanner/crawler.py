from collections import deque
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, urldefrag
import requests

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
        self.forms=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in {'a','link'} and a.get('href'): self.links.append(a['href'])
        if tag in {'script','img','iframe','source','video','audio','form'} and a.get('src'): self.links.append(a['src'])
        if tag=='form':
            self.forms.append({'action':a.get('action',''),'method':a.get('method','GET').upper()})

def _same_scope(url, base_host):
    p=urlparse(url)
    return p.scheme in ('http','https') and p.hostname and p.hostname.lower()==base_host.lower()

def crawl(target, max_pages=40, timeout=8):
    """Conservative same-host crawler for authorized web assessments."""
    session=requests.Session(); session.headers['User-Agent']='WebVulnerabilityScanner/2.0 (authorized security assessment)'
    base=urlparse(target); host=base.hostname
    queue=deque([target]); seen=set(); pages=[]; forms=[]; errors=[]
    while queue and len(pages)<max_pages:
        url=urldefrag(queue.popleft())[0]
        if url in seen or not _same_scope(url,host): continue
        seen.add(url)
        try:
            r=session.get(url, timeout=timeout, allow_redirects=True)
            final=urldefrag(r.url)[0]
            ctype=r.headers.get('Content-Type','')
            page={'url':final,'status':r.status_code,'content_type':ctype,'length':len(r.content)}
            pages.append(page)
            if 'html' in ctype.lower():
                parser=LinkParser(); parser.feed(r.text[:1000000])
                for f in parser.forms:
                    action=urljoin(final,f['action'] or final)
                    if _same_scope(action,host): forms.append({'page':final,'action':action,'method':f['method']})
                for href in parser.links:
                    nxt=urldefrag(urljoin(final,href))[0]
                    if _same_scope(nxt,host) and nxt not in seen and len(seen)+len(queue)<max_pages*3:
                        queue.append(nxt)
        except requests.RequestException as e:
            errors.append({'url':url,'error':str(e)})
    unique_forms=[]; form_seen=set()
    for f in forms:
        key=(f['page'],f['action'],f['method'])
        if key not in form_seen: form_seen.add(key); unique_forms.append(f)
    return {'pages':pages,'forms':unique_forms,'errors':errors,'discovered_urls':len(seen)}
