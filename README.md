
# CloudSkies Flight Booking

CloudSkies is a learning project for building and operating a flight-booking application using React, FastAPI, PostgreSQL, Docker, Terraform, GitHub Actions, and Google Cloud.

## Project goals

- Build a React flight search and booking interface.
- Develop separate Flight and Booking FastAPI services.
- Communicate between services over HTTP.
- Persist bookings in PostgreSQL.
- Learn Git and GitHub workflows.
- Containerize the application with Docker.
- Provision infrastructure on Google Cloud using Terraform.
- Build CI/CD pipelines with GitHub Actions and Workload Identity Federation.
- Deploy and operate the application on GKE.
- Add monitoring, logging, security, backups, and operational runbooks.

## Architecture

- **Frontend:** React with Vite
- **Flight Service:** FastAPI, sample in-memory flight data
- **Booking Service:** FastAPI, SQLAlchemy, PostgreSQL
- **Local development:** Vite proxy and separate service processes

## Project structure

```text
cloudskies-flight-booking/
├── frontend/
├── services/
│   ├── flight-service/
│   └── booking-service/
├── .gitignore
└── README.md
```

The repository structure will expand as Docker, Terraform, CI/CD, and Kubernetes are added.

## Prerequisites

- Python 3
- Node.js and npm
- Docker
- Git

Additional tools such as Terraform and the Google Cloud CLI will be needed for later phases.

## Local development

### 1. Start PostgreSQL

The local database uses a Docker container named `cloudskies-postgres` and a persistent Docker volume.

If the container already exists:

```bash
docker start cloudskies-postgres
```

If it has not been created, follow the PostgreSQL setup instructions in the project setup notes.

### 2. Start Flight Service

```bash
cd services/flight-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: http://127.0.0.1:8000/docs

### 3. Start Booking Service

In another terminal:

```bash
cd services/booking-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

export DATABASE_URL='postgresql+psycopg://cloudskies:cloudskies_dev_password@127.0.0.1:5432/bookings_db'
export FLIGHT_SERVICE_URL='http://127.0.0.1:8000'

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

API documentation: http://127.0.0.1:8001/docs

### 4. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173

## API endpoints

### Flight Service

- `GET /health`
- `GET /flights?origin=HYD&destination=DEL`
- `GET /flights/{flight_id}`

### Booking Service

- `GET /health`
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/{booking_id}`
- `POST /bookings/{booking_id}/cancel`

## Current limitations

- Flights use sample data stored in memory.
- Booking records are stored in PostgreSQL.
- Seat availability is checked, but booking does not yet atomically reserve seats.
- This application does not connect to a real airline, payment provider, or reservation system.
- Local development configuration is not production configuration.

## Roadmap

1. Build and test the application.
2. Git and GitHub.
3. Docker and Docker Compose.
4. Terraform on Google Cloud.
5. CI/CD with GitHub Actions.
6. Kubernetes and GKE.
7. Production-style operations.

## Security

Never commit real credentials, `.env` files, service-account keys, Terraform state, or other sensitive configuration.
