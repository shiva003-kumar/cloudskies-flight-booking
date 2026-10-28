
import os
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import BookingRecord


FLIGHT_SERVICE_URL = os.getenv(
    "FLIGHT_SERVICE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")


# Create database tables if they do not exist.
# Useful for this learning project; migrations are better for production.
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="CloudSkies Booking Service",
    description="Create and manage sample flight bookings.",
    version="2.0.0",
)


class BookingStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class BookingRequest(BaseModel):
    flight_id: str = Field(min_length=1, max_length=30)
    passenger_name: str = Field(min_length=2, max_length=100)
    passenger_email: EmailStr
    seats: int = Field(default=1, ge=1, le=6)


class Booking(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: str
    flight_id: str
    passenger_name: str
    passenger_email: EmailStr
    seats: int
    status: BookingStatus
    created_at: datetime


async def get_flight(flight_id: str) -> dict:
    url = f"{FLIGHT_SERVICE_URL}/flights/{flight_id}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Flight Service timed out.",
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Flight Service is currently unavailable.",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested flight does not exist.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Flight Service returned an unexpected response.",
        )

    return response.json()


@app.get("/")
def root():
    return {
        "service": "booking-service",
        "message": "Welcome to CloudSkies Booking Service",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "booking-service",
    }


@app.post(
    "/bookings",
    response_model=Booking,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    request: BookingRequest,
    db: Session = Depends(get_db),
):
    # Ask Flight Service whether the requested flight exists.
    flight = await get_flight(request.flight_id)

    # Validate the requested number of seats.
    if flight["available_seats"] < request.seats:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough seats are available for this flight.",
        )

    booking = BookingRecord(
        booking_id=f"CS-{uuid4().hex[:10].upper()}",
        flight_id=request.flight_id,
        passenger_name=request.passenger_name,
        passenger_email=str(request.passenger_email),
        seats=request.seats,
        status=BookingStatus.CONFIRMED.value,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the booking.",
        )

    return booking


@app.get("/bookings", response_model=list[Booking])
def list_bookings(db: Session = Depends(get_db)):
    return db.query(BookingRecord).order_by(
        BookingRecord.created_at.desc()
    ).all()


@app.get("/bookings/{booking_id}", response_model=Booking)
def get_booking_by_id(
    booking_id: str,
    db: Session = Depends(get_db),
):
    booking = db.get(BookingRecord, booking_id)

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    return booking


@app.post("/bookings/{booking_id}/cancel", response_model=Booking)
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
):
    booking = db.get(BookingRecord, booking_id)

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    if booking.status == BookingStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking is already cancelled.",
        )

    booking.status = BookingStatus.CANCELLED.value

    try:
        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not cancel the booking.",
        )

    return booking