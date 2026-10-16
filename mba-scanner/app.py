from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify
from scanner.target import validate_target
from scanner.headers import scan_headers
from scanner.browser_security import scan_browser_security
from scanner.tls import scan_tls
from scanner.redirects import scan_redirects
from scanner.crawler import crawl
from scanner.zap import run_zap
from scanner.nmap_scan import run_nmap
from scanner.nikto import run_nikto
from scanner.phishing import scan_phishing
from scanner.analyzer import normalize_findings, summarize
from database.db import init_db, create_scan, save_findings, get_scans, get_scan, get_findings
from reports.report import build_pdf
from threading import Thread, Lock
import time, traceback

app=Flask(__name__); app.secret_key='change-this-secret-key'; init_db()
JOBS={}; JOB_LOCK=Lock()
STAGES=[
 ('initializing','Initializing authorized scan',5),('validating','Validating target',10),('discovering','Discovering website pages and forms',25),
 ('browser','Analyzing browser/security restrictions',35),('tls','Analyzing TLS and redirects',45),('zap','Running OWASP ZAP deep web scan',65),
 ('nikto','Running Nikto web server checks',75),('nmap','Running Nmap service checks',85),('risk','Correlating findings and risk',93),('report','Saving findings and preparing report',98),('complete','Scan complete',100)]

def _update(job_id,stage,progress,**extra):
    with JOB_LOCK:
        JOBS[job_id].update(stage=stage,progress=progress,**extra)

def perform_scan(scan_id,target):
    _update(scan_id,'initializing',5,message='Initializing authorized scan')
    all_findings=[]; stats={'pages':0,'forms':0,'urls':0}
    try:
        _update(scan_id,'validating',10,message='Validating target')
        ok,msg,normalized=validate_target(target)
        if not ok: raise ValueError(msg)
        _update(scan_id,'discovering',15,message='Crawling in-scope pages and forms')
        crawl_data=crawl(normalized,max_pages=40)
        stats={'pages':len(crawl_data['pages']),'forms':len(crawl_data['forms']),'urls':crawl_data['discovered_urls']}
        _update(scan_id,'discovering',25,message=f"Discovered {stats['pages']} pages and {stats['forms']} forms",**stats)
        _update(scan_id,'browser',30,message='Analyzing security headers, cookies and browser policies')
        all_findings += scan_headers(normalized)
        all_findings += scan_browser_security(normalized)
        _update(scan_id,'browser',35,message='Browser/security policy analysis complete',**stats)
        _update(scan_id,'tls',40,message='Checking TLS and redirect behavior')
        all_findings += scan_tls(normalized); all_findings += scan_redirects(normalized)
        all_findings += scan_phishing(normalized)
        _update(scan_id,'tls',45,message='TLS, redirects and URL-risk checks complete',**stats)
        _update(scan_id,'zap',50,message='OWASP ZAP: spidering and active scanning authorized target')
        all_findings += run_zap(normalized)
        _update(scan_id,'zap',65,message='OWASP ZAP stage complete',**stats)
        _update(scan_id,'nikto',68,message='Nikto: web server checks')
        all_findings += run_nikto(normalized)
        _update(scan_id,'nikto',75,message='Nikto stage complete',**stats)
        _update(scan_id,'nmap',78,message='Nmap: service discovery on target host')
        all_findings += run_nmap(normalized)
        _update(scan_id,'nmap',85,message='Nmap stage complete',**stats)
        _update(scan_id,'risk',90,message='Correlating and de-duplicating findings')
        findings=normalize_findings(all_findings)
        _update(scan_id,'risk',93,message=f'Risk analysis complete: {len(findings)} findings',findings=len(findings),**stats)
        save_findings(scan_id,findings)
        _update(scan_id,'report',98,message='Findings saved; report is ready',findings=len(findings),**stats)
        _update(scan_id,'complete',100,message='Scan complete',findings=len(findings),**stats,summary=summarize(findings))
    except Exception as e:
        save_findings(scan_id,normalize_findings(all_findings))
        _update(scan_id,'error',100,message='Scan stopped because of an error',error=str(e),trace=traceback.format_exc(),**stats)

@app.route('/',methods=['GET','POST'])
def index():
    if request.method=='POST':
        target=request.form.get('target','').strip(); authorized=request.form.get('authorized')
        if authorized!='yes':
            flash('You must confirm that you are authorized to test this website.','danger'); return redirect(url_for('index'))
        ok,message,normalized=validate_target(target)
        if not ok: flash(message,'danger'); return redirect(url_for('index'))
        scan_id=create_scan(normalized)
        with JOB_LOCK: JOBS[scan_id]={'stage':'queued','progress':0,'message':'Scan queued','target':normalized}
        Thread(target=perform_scan,args=(scan_id,normalized),daemon=True).start()
        return redirect(url_for('scan_progress',scan_id=scan_id))
    return render_template('index.html')

@app.route('/scan/<int:scan_id>')
def scan_progress(scan_id):
    record=get_scan(scan_id)
    if not record:return 'Scan not found',404
    with JOB_LOCK: job=dict(JOBS.get(scan_id,{'stage':'unknown','progress':0,'message':'Scan status unavailable after server restart','target':record['target']}))
    if job.get('stage')=='complete':
        findings=get_findings(scan_id); return render_template('results.html',scan=record,findings=findings,summary=summarize(findings),stats=job)
    return render_template('progress.html',scan=record,job=job)

@app.route('/scan/<int:scan_id>/status')
def scan_status(scan_id):
    record=get_scan(scan_id)
    if not record:return jsonify({'error':'Scan not found'}),404
    with JOB_LOCK: job=dict(JOBS.get(scan_id,{'stage':'unknown','progress':0,'message':'Scan status unavailable after server restart'}))
    job['scan_id']=scan_id; job['target']=record['target']; return jsonify(job)

@app.route('/history')
def history():return render_template('history.html',scans=get_scans())
@app.route('/scan/<int:scan_id>/report')
def report(scan_id):
    scan=get_scan(scan_id); findings=get_findings(scan_id)
    if not scan:return 'Scan not found',404
    path=build_pdf(scan,findings); return send_file(path,as_attachment=True,download_name=f'security_report_{scan_id}.pdf')
if __name__=='__main__':app.run(host='127.0.0.1',port=5000,debug=True)
