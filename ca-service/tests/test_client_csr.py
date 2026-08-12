import unittest
from pathlib import Path

from app.crypto.csr import validate_csr


class ClientCsrTests(unittest.TestCase):
    def test_browser_generated_csr(self) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        fixture = repo_root / "examples" / "fixtures" / "sample_browser_csr.pem"

        result = validate_csr(fixture.read_bytes())
        self.assertTrue(result.signature_valid)
        self.assertEqual(result.algorithm, "ECDSA_P256")
        self.assertEqual(result.curve, "P-256")


if __name__ == "__main__":
    unittest.main()
