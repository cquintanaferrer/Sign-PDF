from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class CertificateBase(BaseModel):
    public_key: str

class CertificateCreate(BaseModel):
    csr: str

class CertificateResponse(BaseModel):
    id: int
    user_id: int
    request_id: str | None = None
    csr: str
    signed_certificate: str | None = None
    status: str

    class Config:
        from_attributes = True

class ScriptResponse(BaseModel):
    script_url: str
