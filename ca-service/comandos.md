// Levantar servicio
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

//Reset de la CA solo se ejecuta con el servicio levantado
curl -X POST http://127.0.0.1:8000/api/dev/reset-bootstrap

// Ver las tablas 
docker exec -it signpdf-postgres psql -U signpdf -d signpdf