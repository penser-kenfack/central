"""Automated tests of the scanner, run against the local laboratory site (authorized target)."""
import os, sys, time, threading, tempfile
import pytest
from werkzeug.serving import make_server

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, 'lab'))
os.environ['WVS_DB'] = os.path.join(tempfile.mkdtemp(), 'test.db')
for k in ('ZAP_PATH', 'NIKTO_PATH', 'NMAP_PATH'): os.environ.pop(k, None)

from lab_site import make_app
from scanner.target import validate_target
from scanner.crawler import crawl
from scanner.browser_security import scan_browser_security
from scanner.redirects import scan_redirects
from scanner.tls import scan_tls
from scanner.phishing import analyze_url
from scanner.zap import run_zap
from scanner.analyzer import normalize_findings, risk_score, summarize


@pytest.fixture(scope='session')
def sites():
    servers = {}
    for name, hardened in (('weak', False), ('hardened', True)):
        srv = make_server('127.0.0.1', 0, make_app(hardened), threaded=True)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        servers[name] = f'http://127.0.0.1:{srv.server_port}/'
    yield servers


# ---- target validation ----
def test_target_adds_https_and_accepts_http():
    assert validate_target('example.com') == (True, 'Target accepted.', 'https://example.com')
    assert validate_target('http://127.0.0.1:8081/')[0] is True

@pytest.mark.parametrize('bad', ['', 'ftp://example.com', 'http://', 'http://exa mple.com', 'http://bad_host!.com'])
def test_target_rejects_invalid_input(bad):
    assert validate_target(bad)[0] is False

# ---- crawler ----
def test_crawler_finds_same_host_pages_and_forms(sites):
    data = crawl(sites['weak'], max_pages=40)
    urls = {p['url'] for p in data['pages']}
    assert sites['weak'] + 'products/loans' in urls
    assert {f['method'] for f in data['forms']} == {'POST'}
    assert len(data['forms']) == 3          # contact, login, loan request
    assert all(u.startswith(sites['weak']) for u in urls), 'the crawler must stay on the target host'

def test_crawler_respects_page_limit(sites):
    assert len(crawl(sites['weak'], max_pages=3)['pages']) == 3

# ---- headers and cookies ----
def test_weak_site_has_missing_headers_and_cookie_flags(sites):
    titles = {f['title'] for f in scan_browser_security(sites['weak'])}
    for h in ('Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'):
        assert f'Missing browser security policy: {h}' in titles
    assert 'Cookie missing Secure attribute' in titles and 'Cookie missing HttpOnly attribute' in titles
    assert 'Missing browser security policy: Strict-Transport-Security' not in titles, 'HSTS only applies to HTTPS'

def test_hardened_site_has_no_missing_header(sites):
    titles = {f['title'] for f in scan_browser_security(sites['hardened'])}
    assert not [t for t in titles if t.startswith('Missing browser security policy')]
    assert 'Cookie missing HttpOnly attribute' not in titles

def test_server_header_is_reported_as_information(sites):
    f = [x for x in scan_browser_security(sites['weak']) if x['title'] == 'Server technology disclosure'][0]
    assert f['severity'] == 'Informational' and 'LabServer/1.0' in f['evidence']

# ---- redirects and TLS ----
def test_long_redirect_chain_is_detected(sites):
    out = scan_redirects(sites['weak'] + 'old-offers')
    assert out and out[0]['title'] == 'Long redirect chain'
    assert scan_redirects(sites['hardened'] + 'old-offers') == []

def test_http_target_is_flagged(sites):
    assert scan_tls(sites['weak'])[0]['title'] == 'HTTPS not enabled on target URL'

# ---- URL risk heuristic ----
def test_url_risk_heuristic():
    assert analyze_url('https://www.iwomitechnologies.com')['score'] < 30
    r = analyze_url('http://secure-login-update-account.verify.example.top/@paypal')
    assert 30 <= r['score'] < 60 and r['label'].startswith('SUSPICIOUS')
    long_ip = 'http://203.0.113.7/secure-login@paypal.com/verify%20account/' + 'session/' * 6
    r = analyze_url(long_ip)
    assert r['score'] >= 60 and r['severity'] == 'High'
    assert analyze_url('http://192.168.1.20/login')['score'] >= 25

def test_low_risk_label_never_claims_a_site_is_real():
    assert 'REAL' not in analyze_url('https://example.com')['label']

# ---- external tools ----
def test_zap_stage_is_reported_as_skipped_when_not_configured(sites):
    out = run_zap(sites['weak'])
    assert out[0]['title'] == 'OWASP ZAP not configured'

# ---- correlation and score ----
def test_findings_are_deduplicated_and_sorted(sites):
    raw = scan_browser_security(sites['weak']) * 2 + scan_tls(sites['weak'])
    out = normalize_findings(raw)
    assert len(out) == len({(f['title'], f['url'], f['severity']) for f in raw})
    order = [f['severity'] for f in out]
    assert order.index('Medium') < order.index('Low') < order.index('Informational')
    assert all(f['category'] for f in out)

def test_score_and_grade():
    assert risk_score([]) == (100, 'A')
    assert risk_score([{'severity': 'High'}] * 2 + [{'severity': 'Medium'}]) == (62, 'C')
    assert risk_score([{'severity': 'Low'}] * 50)[0] == 88, 'penalties are capped per severity'

# ---- web application ----
@pytest.fixture()
def client():
    import app as wvs
    wvs.app.config['TESTING'] = True
    return wvs.app.test_client(), wvs

def test_scan_requires_authorization(client):
    c, _ = client
    r = c.post('/', data={'target': 'http://127.0.0.1:1/'}, follow_redirects=True)
    assert b'authorized to test' in r.data

def test_full_scan_flow_and_persistence(client, sites):
    c, wvs = client
    r = c.post('/', data={'target': sites['weak'], 'authorized': 'yes'})
    scan_id = int(r.headers['Location'].rstrip('/').split('/')[-1])
    for _ in range(100):
        if c.get(f'/scan/{scan_id}/status').json['stage'] in ('complete', 'error'): break
        time.sleep(.1)
    status = c.get(f'/scan/{scan_id}/status').json
    assert status['stage'] == 'complete' and status['pages'] >= 8 and status['forms'] == 3
    with wvs.JOB_LOCK: wvs.JOBS.clear()      # simulate a server restart
    page = c.get(f'/scan/{scan_id}')
    assert b'Scan results' in page.data and b'A05:2021' in page.data
    pdf = c.get(f'/scan/{scan_id}/report')
    assert pdf.status_code == 200 and pdf.data[:4] == b'%PDF'

def test_history_and_url_check_pages(client):
    c, _ = client
    assert c.get('/history').status_code == 200
    r = c.post('/url-check', data={'url': 'http://login-verify.example.tk'})
    assert r.status_code == 200 and b'risk score' in r.data
