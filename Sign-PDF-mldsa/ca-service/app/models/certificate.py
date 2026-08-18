from pydantic import BaseModel


class IssuedCertificateResponse(BaseModel):
    certificate: str
    serial_number: str
    subject: str
    issuer: str
    algorithm: str
    not_valid_before: str
    not_valid_after: str