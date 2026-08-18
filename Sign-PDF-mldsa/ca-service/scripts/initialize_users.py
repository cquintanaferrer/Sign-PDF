from app.core.config import settings
from app.core.database import SessionLocal
from app.services.user_service import create_user


def main():
    db = SessionLocal()

    try:
        users = [
            {
                "username": "admin",
                "email": "admin@signpdf.com",
                "password": settings.ca_admin_password,
                "role": "CA_ADMIN",
                "fragment_id": None,
            },
            {
                "username": "autority1",
                "email": "autority1@signpdf.com",
                "password": settings.authority1_password,
                "role": "CA_CUSTODIAN",
                "fragment_id": 1,
            },
            {
                "username": "autority2",
                "email": "autority2@signpdf.com",
                "password": settings.authority2_password,
                "role": "CA_CUSTODIAN",
                "fragment_id": 2,
            },
            {
                "username": "autority3",
                "email": "autority3@signpdf.com",
                "password": settings.authority3_password,
                "role": "CA_CUSTODIAN",
                "fragment_id": 3,
            },
            {
                "username": "autority4",
                "email": "autority4@signpdf.com",
                "password": settings.authority4_password,
                "role": "CA_CUSTODIAN",
                "fragment_id": 4,
            },
        ]

        for data in users:
            try:
                user = create_user(
                    db=db,
                    username=data["username"],
                    email=data["email"],
                    password=data["password"],
                    role=data["role"],
                    fragment_id=data["fragment_id"],
                )

                print(
                    f"Creado: {user.username}"
                )

            except ValueError:
                print(
                    f"Ya existe: {data['username']}"
                )

    finally:
        db.close()


if __name__ == "__main__":
    main()