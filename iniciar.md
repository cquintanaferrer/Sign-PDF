# Arranque de SignPDF con Docker

```bash
docker compose up -d --build
docker compose exec ca-service alembic upgrade head
docker compose exec ca-service python -m scripts.initialize_users
docker compose ps
```

Interfaces:

- CA: `http://localhost`
- Cliente: `http://localhost/client/`

> El reset de la CA es solo para desarrollo y elimina raíces, fragmentos, CSR y certificados. Ejecútalo únicamente si realmente quieres reinicializar la CA:
>
> ```bash
> curl -X POST http://localhost/api/dev/reset-bootstrap
> ```
