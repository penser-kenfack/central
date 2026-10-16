import json, os, subprocess, tempfile

def _parse_report(data, target):
    out=[]
    sites=data.get('site',[]) if isinstance(data,dict) else []
    if isinstance(sites,dict): sites=[sites]
    alerts=[]
    for site in sites:
        alerts.extend(site.get('alerts',[]) or [])
    alerts.extend(data.get('alerts',[]) if isinstance(data,dict) else [])
    for a in alerts:
        risk=str(a.get('riskdesc',a.get('risk','Informational'))).split()[0].title()
        if risk not in {'High','Medium','Low','Informational'}: risk='Informational'
        url=a.get('url') or target
        out.append({'title':a.get('alert','ZAP alert'),'severity':risk,'source':'OWASP ZAP','url':url,
        'description':a.get('desc',''),'evidence':a.get('evidence') or a.get('solution',''),'recommendation':a.get('solution','Review and remediate the ZAP alert, then retest.')})
    return out

def run_zap(target):
    zap=os.environ.get('ZAP_PATH')
    if not zap:
        return [{'title':'OWASP ZAP not configured','severity':'Informational','source':'OWASP ZAP','url':target,
        'description':'ZAP_PATH is not set, so the ZAP stage was skipped.','evidence':'ZAP_PATH environment variable missing.','recommendation':'Configure ZAP_PATH to the ZAP startup script (for Windows, normally zap.bat).'}]
    fd,path=tempfile.mkstemp(prefix='zap_',suffix='.json'); os.close(fd)
    try:
        p=subprocess.run([zap,'-cmd','-quickurl',target,'-quickout',path,'-quickprogress'],timeout=900,capture_output=True,text=True)
        if not os.path.exists(path):
            return [{'title':'OWASP ZAP produced no report','severity':'Informational','source':'OWASP ZAP','url':target,
            'description':'The ZAP process ran but no report file was produced.','evidence':(p.stderr or p.stdout)[-1000:],'recommendation':'Check the ZAP installation and console output.'}]
        with open(path,encoding='utf-8') as f: data=json.load(f)
        findings=_parse_report(data,target)
        if not findings:
            findings.append({'title':'OWASP ZAP scan completed with no parsed alerts','severity':'Informational','source':'OWASP ZAP','url':target,
            'description':'ZAP completed its automated scan, but this integration found no alerts in the JSON report.','evidence':f'Process return code: {p.returncode}','recommendation':'Review the ZAP report directly and confirm the scan policy and scope.'})
        return findings
    except subprocess.TimeoutExpired:
        return [{'title':'OWASP ZAP scan timed out','severity':'Medium','source':'OWASP ZAP','url':target,'description':'The ZAP scan exceeded the configured 15-minute limit.','evidence':'Timeout after 900 seconds.','recommendation':'Review target size and scan policy, or increase the timeout for large authorized applications.'}]
    except Exception as e:
        return [{'title':'OWASP ZAP integration error','severity':'Informational','source':'OWASP ZAP','url':target,'description':'The ZAP stage could not complete.','evidence':str(e),'recommendation':'Check ZAP_PATH and the ZAP installation.'}]
    finally:
        try: os.remove(path)
        except OSError: pass
