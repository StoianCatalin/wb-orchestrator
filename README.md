# WB Orchestrator for Document Scrapper


Create Orchestrator API Image:
```
docker build -t orchestrator/api --build-arg project=orchestrator .
```

Create Crawler Suit Image:
```
docker build -t orchestrator/api --build-arg project=crawler-suit .
```

Env variables for API:
```
API_URL=http://localhost:8080
API_KEY=secret
STORAGE_PATH=/storage
OCR_URL=http://localhost:8085
SELF_URL=http://localhost:8081
PORT=8081
TRUSTED_SOURCE_TOKEN=secret
```

Env variables for Crawler Suit:
```
SCRAPPER_NAME=camera_deputatilor
DELAY_BETWEEN_RUNS=10000
API_URL=http://localhost:8080
API_KEY=secret
STORAGE_PATH=/storage
TRUSTED_SOURCE_TOKEN=secret
```