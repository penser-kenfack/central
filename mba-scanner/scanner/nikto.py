import os,subprocess
def run_nikto(target):
    nikto=os.environ.get("NIKTO_PATH")
    if not nikto:return []
    try:
        p=subprocess.run(["perl",nikto,"-h",target,"-nointeractive"],timeout=300,capture_output=True,text=True)
        return [{"title":"Nikto observation","severity":"Informational","source":"Nikto","url":target,
        "description":line.lstrip("+ ").strip(),"evidence":line.strip(),
        "recommendation":"Validate the observation manually before treating it as a vulnerability."}
        for line in p.stdout.splitlines() if line.startswith("+")][:50]
    except Exception:return []
