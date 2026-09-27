# Dev Containers Test

This directory contains test configurations and scripts for Docker containers used in development for testing.
## MinIO (S3-compatible file storage)

`docker-compose.minio.yml` starts MinIO on `localhost:9000` (console on `:9001`) and creates two buckets: `taskview` for local development and `taskview-test` for the files integration tests (`src/tv-modules/files/__tests__/*.integration.spec.ts`). Those tests expect it to be up:

```bash
docker compose -f docker-compose.minio.yml up -d
```

To point a dev API at it: `FILE_STORAGE_PROVIDER=s3`, `FILE_STORAGE_S3_BUCKET=taskview`, `FILE_STORAGE_S3_ENDPOINT=http://localhost:9000`, `FILE_STORAGE_S3_REGION=us-east-1`, `FILE_STORAGE_S3_ACCESS_KEY=minioadmin`, `FILE_STORAGE_S3_SECRET_KEY=minioadmin`, `FILE_STORAGE_S3_FORCE_PATH_STYLE=true`.
