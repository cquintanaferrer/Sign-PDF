docker compose up -d --build
docker compose exec ca-service alembic upgrade head
docker compose exec ca-service python -m scripts.initialize_users
curl -X POST http://127.0.0.1:8000/api/dev/reset-bootstrap