"""Local laboratory website used as an AUTHORIZED target for the scanner.

Two variants of the same small site are served on localhost:
  - weak     (port 8081): no security headers, cookie without Secure/HttpOnly, long redirect chain
  - hardened (port 8082): the same pages with the recommended headers and cookie flags
Usage: python lab/lab_site.py [weak|hardened|both]
"""
import os, sys, time
from threading import Thread
from flask import Flask, redirect, make_response

PAGES = {
    '/': ('Lab Microfinance', '<p>Welcome to the laboratory site of a fictitious microfinance institution.</p>'),
    '/about': ('About us', '<p>Fictitious company used only to test the scanner.</p>'),
    '/products': ('Products', '<ul><li><a href="/products/savings">Savings account</a></li><li><a href="/products/loans">Micro-loans</a></li></ul>'),
    '/products/savings': ('Savings account', '<p>Open a savings account in minutes.</p>'),
    '/products/loans': ('Micro-loans', '<form method="post" action="/loan-request"><input name="amount"><button>Request</button></form>'),
    '/contact': ('Contact', '<form method="post" action="/contact"><input name="email"><textarea name="msg"></textarea><button>Send</button></form>'),
    '/login': ('Customer login', '<form method="post" action="/login"><input name="user"><input name="password" type="password"><button>Log in</button></form>'),
    '/news': ('News', '<p>See our <a href="/old-offers">previous offers</a>.</p>'),
}
NAV = ''.join(f'<a href="{p}">{t}</a> ' for p, (t, _) in PAGES.items() if p.count('/') == 1)


def make_app(hardened):
    app = Flask(f"lab_{'hardened' if hardened else 'weak'}")

    delay = float(os.environ.get('LAB_DELAY', '0'))  # optional: slow responses, to observe the progress page

    def page(path):
        time.sleep(delay)
        title, body = PAGES[path]
        resp = make_response(f'<!doctype html><html><head><title>{title}</title><script src="/static/app.js"></script></head>'
                             f'<body><nav>{NAV}</nav><h1>{title}</h1>{body}<img src="/static/logo.png"></body></html>')
        resp.set_cookie('lab_session', 'demo', secure=hardened, httponly=hardened, samesite='Lax')
        return resp

    for path in PAGES:
        app.add_url_rule(path, path, lambda path=path: page(path), methods=['GET', 'POST'])
    # redirect chain: 4 hops on the weak site, 1 on the hardened one
    hops = ['/old-offers', '/offers-2024', '/offers-2025', '/offers-archive'] if not hardened else ['/old-offers']
    for i, h in enumerate(hops):
        nxt = hops[i + 1] if i + 1 < len(hops) else '/products'
        app.add_url_rule(h, h, lambda nxt=nxt: redirect(nxt, 302))

    @app.after_request
    def headers(resp):
        resp.headers['Server'] = 'LabServer/1.0' if not hardened else 'lab'
        if hardened:
            resp.headers['Content-Security-Policy'] = "default-src 'self'; frame-ancestors 'none'"
            resp.headers['X-Frame-Options'] = 'DENY'
            resp.headers['X-Content-Type-Options'] = 'nosniff'
            resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            resp.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return resp
    return app


def serve(hardened, port):
    make_app(hardened).run(host='127.0.0.1', port=port, use_reloader=False)


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'both'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else None
    if which in ('weak', 'both'): Thread(target=serve, args=(False, port or 8081), daemon=which == 'both').start()
    if which in ('hardened', 'both'): serve(True, port or 8082)
