import os, traceback
from datetime import datetime
from threading import Thread, Lock
from flask import Flask, render_template, request, redirect, url_for, flash, send_file, jsonify
from scanner.target import validate_target
from scanner.browser_security import scan_browser_security
from scanner.tls import scan_tls
from scanner.redirects import scan_redirects
from scanner.crawler import crawl
from scanner.zap import run_zap
from scanner.nmap_scan import run_nmap
from scanner.nikto import run_nikto
from scanner.phishing import scan_phishing, analyze_url
from scanner.analyzer import normalize_findings, summarize, risk_score
from database.db import init_db, create_scan, update_scan, save_findings, save_pages, get_scans, get_scan, get_findings, get_pages
from reports.report import build_pdf

app = Flask(__name__)
app.secret_key = os.environ.get('WVS_SECRET_KEY', 'change-this-secret-key')
init_db()
JOBS = {}; JOB_LOCK = Lock()

# The pipeline, in order. The progress page shows these real backend stages.
STAGES = [('validating', 'Target validation'), ('discovering', 'Crawling & discovery'), ('browser', 'Security headers & cookies'),
          ('tls', 'TLS, redirects & URL risk'), ('zap', 'OWASP ZAP'), ('nikto', 'Nikto'), ('nmap', 'Nmap'), ('risk', 'Risk correlation & score')]


def _update(job_id, stage, progress, **extra):
    with JOB_LOCK:
        JOBS[job_id].update(stage=stage, progress=progress, **extra)
    update_scan(job_id, status=stage, progress=progress, message=extra.get('message'),
                **{k: extra[k] for k in ('pages', 'forms', 'urls', 'score', 'grade', 'error') if k in extra})


def perform_scan(scan_id, target):
    all_findings = []; stats = {'pages': 0, 'forms': 0, 'urls': 0}
    try:
        _update(scan_id, 'validating', 5, message='Validating target')
        ok, msg, normalized = validate_target(target)
        if not ok: raise ValueError(msg)
        _update(scan_id, 'discovering', 12, message='Crawling in-scope pages and forms')
        crawl_data = crawl(normalized, max_pages=40)
        save_pages(scan_id, crawl_data['pages'])
        stats = {'pages': len(crawl_data['pages']), 'forms': len(crawl_data['forms']), 'urls': crawl_data['discovered_urls']}
        _update(scan_id, 'discovering', 25, message=f"Discovered {stats['pages']} pages and {stats['forms']} forms", **stats)
        _update(scan_id, 'browser', 30, message='Analyzing security headers, cookies and browser policies', **stats)
        all_findings += scan_browser_security(normalized)
        _update(scan_id, 'tls', 40, message='Checking TLS, redirects and URL risk', **stats)
        all_findings += scan_tls(normalized) + scan_redirects(normalized) + scan_phishing(normalized)
        _update(scan_id, 'zap', 50, message='OWASP ZAP stage', **stats)
        all_findings += run_zap(normalized)
        _update(scan_id, 'nikto', 68, message='Nikto stage', **stats)
        all_findings += run_nikto(normalized)
        _update(scan_id, 'nmap', 78, message='Nmap stage', **stats)
        all_findings += run_nmap(normalized)
        _update(scan_id, 'risk', 90, message='Correlating and de-duplicating findings', **stats)
        findings = normalize_findings(all_findings)
        save_findings(scan_id, findings)
        score, grade = risk_score(findings)
        _update(scan_id, 'complete', 100, message='Scan complete', findings=len(findings), score=score, grade=grade, **stats)
        update_scan(scan_id, finished_at=datetime.now().isoformat(sep=' ', timespec='seconds'))
    except Exception as e:
        save_findings(scan_id, normalize_findings(all_findings))
        _update(scan_id, 'error', 100, message='Scan stopped because of an error', error=str(e), trace=traceback.format_exc(), **stats)


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        target = request.form.get('target', '').strip(); authorized = request.form.get('authorized')
        if authorized != 'yes':
            flash('You must confirm that you are authorized to test this website.', 'danger'); return redirect(url_for('index'))
        ok, message, normalized = validate_target(target)
        if not ok: flash(message, 'danger'); return redirect(url_for('index'))
        scan_id = create_scan(normalized)
        with JOB_LOCK: JOBS[scan_id] = {'stage': 'queued', 'progress': 0, 'message': 'Scan queued', 'target': normalized}
        Thread(target=perform_scan, args=(scan_id, normalized), daemon=True).start()
        return redirect(url_for('scan_progress', scan_id=scan_id))
    return render_template('index.html', recent=get_scans()[:5], tools=_tools())


def _tools():
    return {'OWASP ZAP': bool(os.environ.get('ZAP_PATH')), 'Nikto': bool(os.environ.get('NIKTO_PATH')), 'Nmap': bool(os.environ.get('NMAP_PATH'))}


def _job(scan_id, record):
    with JOB_LOCK:
        job = JOBS.get(scan_id)
        if job: return dict(job)
    # after a restart the live job is gone: the database keeps the last known state
    return {'stage': record['status'] or 'unknown', 'progress': record['progress'] or 0, 'message': record['message'] or '',
            'pages': record['pages'], 'forms': record['forms'], 'urls': record['urls'], 'error': record['error']}


@app.route('/scan/<int:scan_id>')
def scan_progress(scan_id):
    record = get_scan(scan_id)
    if not record: return 'Scan not found', 404
    job = _job(scan_id, record)
    if job.get('stage') in ('complete', 'error'):
        findings = get_findings(scan_id)
        groups = {}
        for f in findings: groups.setdefault(f['category'] or 'Other / tool output', []).append(f)
        return render_template('results.html', scan=record, findings=findings, summary=summarize(findings), stats=job,
                               groups=groups, pages=get_pages(scan_id), tools=_tools())
    return render_template('progress.html', scan=record, job=job, stages=STAGES)


@app.route('/scan/<int:scan_id>/status')
def scan_status(scan_id):
    record = get_scan(scan_id)
    if not record: return jsonify({'error': 'Scan not found'}), 404
    job = _job(scan_id, record); job.pop('trace', None)
    job['scan_id'] = scan_id; job['target'] = record['target']; return jsonify(job)


@app.route('/history')
def history():
    return render_template('history.html', scans=get_scans())


@app.route('/url-check', methods=['GET', 'POST'])
def url_check():
    result = None; url = ''
    if request.method == 'POST':
        url = request.form.get('url', '').strip()
        if url:
            result = analyze_url(url if url.startswith(('http://', 'https://')) else 'https://' + url)
    return render_template('url_check.html', result=result, url=url)


@app.route('/scan/<int:scan_id>/report')
def report(scan_id):
    scan = get_scan(scan_id); findings = get_findings(scan_id)
    if not scan: return 'Scan not found', 404
    path = build_pdf(scan, findings); return send_file(os.path.abspath(path), as_attachment=True, download_name=f'security_report_{scan_id}.pdf')


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_DEBUG') == '1')
