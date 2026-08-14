from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    certificates = relationship("Certificate", back_populates="owner")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    request_id = Column(String, unique=True, index=True, nullable=True)
    csr = Column(Text, nullable=False)
    signed_certificate = Column(Text, nullable=True)
    status = Column(String, default="PENDING")
    
    owner = relationship("User", back_populates="certificates")
