# Dev Containers Test

This directory contains test configurations and scripts for Docker containers used in development for testing.
## SeaweedFS (S3-compatible file storage)

`docker-compose.seaweedfs.yml` starts SeaweedFS with its S3 API on `localhost:8333` and creates two buckets: `taskview` for local development and `taskview-test` for the files integration tests (`src/tv-modules/files/__tests__/*.integration.spec.ts`). Those tests expect it to be up:

```bash
docker compose -f docker-compose.seaweedfs.yml up -d --wait
```

To point a dev API at it: `FILE_STORAGE_PROVIDER=s3`, `FILE_STORAGE_S3_BUCKET=taskview`, `FILE_STORAGE_S3_ENDPOINT=http://localhost:8333`, `FILE_STORAGE_S3_REGION=us-east-1`, `FILE_STORAGE_S3_ACCESS_KEY=taskview`, `FILE_STORAGE_S3_SECRET_KEY=taskview-secret`, `FILE_STORAGE_S3_FORCE_PATH_STYLE=true`.
