import os,subprocess,re
from urllib.parse import urlparse
def run_nmap(target):
    exe=os.environ.get("NMAP_PATH")
    if not exe:return []
    host=urlparse(target).hostname
    try:
        p=subprocess.run([exe,"-sV","--top-ports","20",host],timeout=120,capture_output=True,text=True)
        out=[]
        for line in p.stdout.splitlines():
            if re.match(r"^\d+/(tcp|udp)\s+open",line):
                out.append({"title":"Open service discovered","severity":"Informational","source":"Nmap","url":target,
                "description":"Nmap identified an open service on the authorized lab host.","evidence":line.strip(),
                "recommendation":"Review whether the service is required and securely configured."})
        return out
    except Exception:return []
