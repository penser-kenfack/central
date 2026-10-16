# Web Application Vulnerability Scanner — Deep Scan Upgrade

> Internship project of **MBA SIMON ASI** (IWOMI Technologies, 2026).

## Version 2.1 (end of internship)

- Scan status, counters and score are stored in SQLite: results survive a server restart.
- Fixed: the History page crashed (`url_for('scan')` → `scan_progress`).
- Fixed: `ftp://` and other non-HTTP schemes were accepted by the target validator.
- Security score (100 − penalties) and grade A–F; findings grouped by OWASP Top 10 (2021) category.
- New page **URL risk check** (phishing heuristics on the text of a link, no request sent).
- The URL heuristic no longer labels a site as “REAL WEBSITE” (it says “LOW RISK”).
- New interface and PDF report; fonts served locally.
- `lab/lab_site.py`: local laboratory site (weak and hardened variants) used as authorized target.
- `tests/`: 21 automated tests (`python -m pytest -q tests`).


This version upgrades the original Flask scanner instead of replacing the project concept.

## What was improved

- Real background scan with a live progress page and status polling.
- Same-host website crawling with page, URL and form discovery.
- Browser/security restriction checks: CSP, X-Frame-Options, MIME sniffing protection, Referrer-Policy, Permissions-Policy and HSTS.
- Cookie checks for Secure and HttpOnly attributes.
- TLS and redirect analysis.
- URL-risk / fake-site heuristic analysis.
- OWASP ZAP integration now parses JSON alerts instead of discarding the report.
- Existing Nikto and Nmap stages are retained.
- Findings are correlated, normalized and deduplicated before being saved.
- Results now show pages, URLs, forms and findings in addition to severity counts.
- Authorization confirmation remains mandatory.

## Important safety note

Only scan websites you own or have explicit permission to test. The OWASP ZAP active-scanning stage sends attack requests. It must only be used against authorized targets.

## Windows setup

1. Open Command Prompt in this project folder.
2. Create/activate your virtual environment if needed:

```bat
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:

```bat
python -m pip install -r requirements.txt
```

4. Configure the external tools with environment variables if you want those stages enabled:

```bat
set ZAP_PATH=C:\Program Files (x86)\ZAP\Zed Attack Proxy\zap.bat
set NIKTO_PATH=C:\path\to\nikto.pl
set NMAP_PATH=C:\Program Files (x86)\Nmap\nmap.exe
```

Use paths matching your own installation. If an external tool is not configured, the scanner reports that the stage was skipped instead of silently pretending it ran.

5. Start the scanner:

```bat
python app.py
```

Then open `http://127.0.0.1:5000/`.

## Scan flow

Target → Authorization → Validation → Crawl/Discovery → Browser Security → TLS/Redirects → URL Risk → OWASP ZAP → Nikto → Nmap → Risk Correlation → Results/Report

The live progress page represents actual backend stages; it does not use a fake timed animation.
