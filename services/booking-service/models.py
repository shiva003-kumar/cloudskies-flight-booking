
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class BookingRecord(Base):
    __tablename__ = "bookings"

    booking_id: Mapped[str] = mapped_column(
        String(20),
        primary_key=True,
    )

    flight_id: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    passenger_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    passenger_email: Mapped[str] = mapped_column(
        String(254),
        nullable=False,
    )

    seats: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )