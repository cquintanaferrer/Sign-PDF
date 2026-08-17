docker compose up -d --build
docker compose exec ca-service alembic upgrade head
docker compose exec ca-service python -m scripts.initialize_users