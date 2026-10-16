# Kept for compatibility with the first version: the header checks now live in browser_security.py
from .browser_security import scan_browser_security

def scan_headers(target):
    return scan_browser_security(target)
