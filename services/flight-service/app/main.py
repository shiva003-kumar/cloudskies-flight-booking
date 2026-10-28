from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel


app = FastAPI(
    title="CloudSkies Flight Service",
    description="API for searching flights in the CloudSkies booking platform.",
    version="1.0.0",
)


class Flight(BaseModel):
    id: str
    airline: str
    flight_number: str
    origin: str
    destination: str
    departure_date: date
    departure_time: str
    arrival_time: str
    price: float
    currency: str
    available_seats: int


# Temporary in-memory data.
# We will replace this with PostgreSQL later.
FLIGHTS = [
    Flight(
        id="FL001",
        airline="CloudSkies Air",
        flight_number="CS101",
        origin="HYD",
        destination="DEL",
        departure_date=date(2026, 11, 15),
        departure_time="08:00",
        arrival_time="10:15",
        price=4500.00,
        currency="INR",
        available_seats=25,
    ),
    Flight(
        id="FL002",
        airline="CloudSkies Air",
        flight_number="CS102",
        origin="HYD",
        destination="DEL",
        departure_date=date(2026, 11, 15),
        departure_time="15:30",
        arrival_time="17:45",
        price=5200.00,
        currency="INR",
        available_seats=12,
    ),
    Flight(
        id="FL003",
        airline="Deccan Connect",
        flight_number="DC205",
        origin="HYD",
        destination="BLR",
        departure_date=date(2026, 11, 15),
        departure_time="09:15",
        arrival_time="10:30",
        price=3200.00,
        currency="INR",
        available_seats=18,
    ),
    Flight(
        id="FL004",
        airline="CloudSkies Air",
        flight_number="CS210",
        origin="DEL",
        destination="HYD",
        departure_date=date(2026, 11, 16),
        departure_time="12:00",
        arrival_time="14:15",
        price=4800.00,
        currency="INR",
        available_seats=20,
    ),
]


@app.get("/")
def root():
    return {
        "service": "flight-service",
        "message": "Welcome to CloudSkies Flight Service",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "flight-service",
    }


@app.get("/flights", response_model=list[Flight])
def search_flights(
    origin: str = Query(..., min_length=3, max_length=3),
    destination: str = Query(..., min_length=3, max_length=3),
    departure_date: Optional[date] = None,
):
    origin_code = origin.upper()
    destination_code = destination.upper()

    if origin_code == destination_code:
        raise HTTPException(
            status_code=400,
            detail="Origin and destination must be different.",
        )

    matching_flights = [
        flight
        for flight in FLIGHTS
        if flight.origin == origin_code
        and flight.destination == destination_code
        and flight.available_seats > 0
        and (
            departure_date is None
            or flight.departure_date == departure_date
        )
    ]

    return matching_flights


@app.get("/flights/{flight_id}", response_model=Flight)
def get_flight(flight_id: str):
    for flight in FLIGHTS:
        if flight.id == flight_id:
            return flight

    raise HTTPException(
        status_code=404,
        detail=f"Flight '{flight_id}' was not found.",
    )