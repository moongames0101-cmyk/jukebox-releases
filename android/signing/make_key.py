"""
The VYBE Control signing key, worked out from a secret phrase.

Android only installs a new version of an app over the old one when both are
signed with the same key. Instead of storing a key anywhere, the build works the
same key out from the VYBE_SIGNING_SEED repository secret every time: the same
phrase always gives the same RSA key and the same certificate.

Usage (the phrase comes from the environment, never the command line):
    VYBE_SEED='…' python3 make_key.py out.p12 KEYSTORE_PASSWORD
"""
import datetime
import hashlib
import hmac
import os
import sys

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID


class Stream:
    """Endless pseudo-random bytes from the phrase (HMAC-SHA256 in counter mode)."""

    def __init__(self, seed: bytes):
        self.key = hashlib.sha256(b"vybe-control-signing-v1|" + seed).digest()
        self.counter = 0

    def read(self, n: int) -> bytes:
        out = b""
        while len(out) < n:
            self.counter += 1
            out += hmac.new(self.key, self.counter.to_bytes(8, "big"), hashlib.sha256).digest()
        return out[:n]

    def number(self, bits: int) -> int:
        return int.from_bytes(self.read(bits // 8), "big")


SMALL_PRIMES = [p for p in range(3, 2000) if all(p % q for q in range(2, int(p ** 0.5) + 1))]


def is_prime(n: int, stream: Stream) -> bool:
    for p in SMALL_PRIMES:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for _ in range(48):
        a = 2 + stream.number(1024) % (n - 4)
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True


def prime(stream: Stream, bits: int, e: int) -> int:
    while True:
        c = stream.number(bits) | (1 << (bits - 1)) | (1 << (bits - 2)) | 1
        if c % e != 1 and is_prime(c, stream):
            return c


def main():
    seed = os.environ.get("VYBE_SEED", "").encode()
    if len(seed) < 12:
        sys.exit("VYBE_SEED is missing or too short (use at least 12 characters).")
    out, password = sys.argv[1], sys.argv[2].encode()

    e = 65537
    stream = Stream(seed)
    p = prime(stream, 1536, e)
    q = prime(stream, 1536, e)
    while q == p:
        q = prime(stream, 1536, e)
    if p < q:
        p, q = q, p
    n = p * q
    d = pow(e, -1, (p - 1) * (q - 1))
    key = rsa.RSAPrivateNumbers(p, q, d, d % (p - 1), d % (q - 1), pow(q, -1, p), rsa.RSAPublicNumbers(e, n)).private_key()

    name = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "VYBE Control"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "VYBE"),
        x509.NameAttribute(NameOID.COUNTRY_NAME, "GB"),
    ])
    serial = int.from_bytes(hashlib.sha256(b"vybe-serial|" + seed).digest()[:8], "big") | 1
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(serial)
        .not_valid_before(datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
        .not_valid_after(datetime.datetime(2056, 1, 1, tzinfo=datetime.timezone.utc))
        .sign(key, hashes.SHA256())  # RSA PKCS#1 v1.5: the same certificate every time
    )
    with open(out, "wb") as f:
        f.write(pkcs12.serialize_key_and_certificates(b"vybe", key, cert, None, serialization.BestAvailableEncryption(password)))
    # Only the public fingerprint is printed: the same phrase always gives the same one
    print("Signing certificate SHA-256:", cert.fingerprint(hashes.SHA256()).hex())


if __name__ == "__main__":
    main()
