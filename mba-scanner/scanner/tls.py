import socket, ssl
from urllib.parse import urlparse

def scan_tls(target):
    p=urlparse(target); host=p.hostname; port=p.port or (443 if p.scheme=='https' else 80)
    if p.scheme!='https':
        return [{'title':'HTTPS not enabled on target URL','severity':'Medium','source':'TLS Scanner','url':target,
        'description':'The supplied target uses HTTP rather than HTTPS.','evidence':target,
        'recommendation':'Use HTTPS for sensitive traffic and redirect HTTP to HTTPS where appropriate.'}]
    try:
        ctx=ssl.create_default_context()
        with socket.create_connection((host,port),timeout=8) as raw:
            with ctx.wrap_socket(raw,server_hostname=host) as s:
                version=s.version(); cipher=s.cipher(); cert=s.getpeercert()
        out=[{'title':'TLS configuration observed','severity':'Informational','source':'TLS Scanner','url':target,
        'description':'The scanner successfully negotiated TLS with the target.','evidence':f'Protocol={version}; Cipher={cipher[0] if cipher else "unknown"}',
        'recommendation':'Keep TLS libraries and certificates current and disable obsolete protocols/ciphers.'}]
        if version in {'TLSv1','TLSv1.1','SSLv3'}:
            out.append({'title':'Obsolete TLS protocol','severity':'High','source':'TLS Scanner','url':target,
            'description':f'The connection negotiated {version}.','evidence':version,'recommendation':'Disable obsolete TLS versions and require modern TLS.'})
        return out
    except Exception as e:
        return [{'title':'TLS handshake failed','severity':'Medium','source':'TLS Scanner','url':target,
        'description':'The scanner could not complete a TLS handshake. This can indicate certificate, protocol or connectivity problems.','evidence':str(e),
        'recommendation':'Verify the certificate chain, hostname, supported TLS versions and reachability.'}]
