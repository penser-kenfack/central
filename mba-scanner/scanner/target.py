from urllib.parse import urlparse
import re


def validate_target(target):
    """
    Validate a target URL.

    Any HTTP/HTTPS host is accepted here; the web form additionally
    requires the user to confirm that they are authorized to test it.
    """

    if not target:
        return False, "Enter a target URL.", None

    target = target.strip()

    if "://" in target and not target.lower().startswith(("http://", "https://")):
        return False, "Only HTTP and HTTPS URLs are supported.", None

    if not target.startswith(("http://", "https://")):
        target = "https://" + target

    parsed = urlparse(target)

    if parsed.scheme not in ("http", "https"):
        return False, "Only HTTP and HTTPS URLs are supported.", None

    if not parsed.hostname:
        return False, "Invalid target URL.", None

    hostname = parsed.hostname.lower()

    # Basic hostname validation
    if not re.match(
        r"^[a-zA-Z0-9.-]+$",
        hostname
    ):
        return False, "Invalid hostname.", None

    return True, "Target accepted.", target