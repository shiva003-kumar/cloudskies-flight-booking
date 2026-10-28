
import { useEffect, useState } from "react";
import "./App.css";

const FLIGHT_API = "/flight-api";
const BOOKING_API = "/booking-api";

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that the required services are running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : "The request failed. Please try again.";

    throw new Error(message);
  }

  return data;
}

function formatPrice(price, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function App() {
  const [origin, setOrigin] = useState("HYD");
  const [destination, setDestination] = useState("DEL");
  const [departureDate, setDepartureDate] = useState("2026-11-15");

  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [seats, setSeats] = useState(1);

  const [loadingFlights, setLoadingFlights] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function searchFlights(event) {
    event?.preventDefault();

    setError("");
    setNotice("");
    setSelectedFlight(null);

    const from = origin.trim().toUpperCase();
    const to = destination.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      setError("Enter valid three-letter airport codes, such as HYD or DEL.");
      return;
    }

    if (from === to) {
      setError("Origin and destination must be different.");
      return;
    }

    setLoadingFlights(true);

    try {
      const params = new URLSearchParams({
        origin: from,
        destination: to,
      });

      if (departureDate) {
        params.set("departure_date", departureDate);
      }

      const results = await requestJson(
        `${FLIGHT_API}/flights?${params.toString()}`
      );

      setFlights(results);
    } catch (err) {
      setFlights([]);
      setError(err.message);
    } finally {
      setLoadingFlights(false);
    }
  }

  async function loadBookings() {
    setLoadingBookings(true);

    try {
      const results = await requestJson(`${BOOKING_API}/bookings`);
      setBookings(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    searchFlights();
    loadBookings();
  }, []);

  async function createBooking(event) {
    event.preventDefault();

    if (!selectedFlight) {
      setError("Select a flight before booking.");
      return;
    }

    if (Number(seats) > selectedFlight.available_seats) {
      setError("The requested seats exceed the available seats.");
      return;
    }

    setError("");
    setNotice("");
    setSubmittingBooking(true);

    try {
      const booking = await requestJson(`${BOOKING_API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flight_id: selectedFlight.id,
          passenger_name: passengerName.trim(),
          passenger_email: passengerEmail.trim(),
          seats: Number(seats),
        }),
      });

      setNotice(`Booking confirmed! Your booking ID is ${booking.booking_id}.`);
      setPassengerName("");
      setPassengerEmail("");
      setSeats(1);
      setSelectedFlight(null);

      await loadBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function cancelBooking(bookingId) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel booking ${bookingId}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await requestJson(
        `${BOOKING_API}/bookings/${encodeURIComponent(bookingId)}/cancel`,
        { method: "POST" }
      );

      setNotice(`Booking ${bookingId} has been cancelled.`);
      await loadBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CloudSkies home">
          <span className="brand-icon">✈</span>
          <span>CloudSkies</span>
        </a>
        <span className="topbar-label">Flight booking demo</span>
      </header>

      <main className="main-content">
        <section className="hero">
          <p className="eyebrow">YOUR NEXT JOURNEY STARTS HERE</p>
          <h1>Find your next flight.</h1>
          <p className="hero-copy">
            Search flights, book your seats and manage your bookings in one place.
          </p>
        </section>

        {error && (
          <div className="alert error-alert" role="alert">
            <strong>Something went wrong</strong>
            <p>{error}</p>
            <button className="text-button" onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}

        {notice && (
          <div className="alert success-alert" role="status">
            <p>{notice}</p>
            <button className="text-button" onClick={() => setNotice("")}>
              Dismiss
            </button>
          </div>
        )}

        <section className="panel search-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLAN YOUR TRIP</p>
              <h2>Search flights</h2>
            </div>
            <span className="section-icon">⌕</span>
          </div>

          <form onSubmit={searchFlights} className="search-form">
            <label>
              From
              <input
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                placeholder="HYD"
                maxLength={3}
                required
              />
            </label>

            <label>
              To
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="DEL"
                maxLength={3}
                required
              />
            </label>

            <label>
              Departure date
              <input
                type="date"
                value={departureDate}
                onChange={(event) => setDepartureDate(event.target.value)}
              />
            </label>

            <button className="primary-button search-button" type="submit"
              disabled={loadingFlights}>
              {loadingFlights ? "Searching..." : "Search flights"}
            </button>
          </form>
        </section>

        <section className="results-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AVAILABLE OPTIONS</p>
              <h2>Flight results</h2>
            </div>
            <span className="result-count">
              {flights.length} {flights.length === 1 ? "flight" : "flights"}
            </span>
          </div>

          {loadingFlights ? (
            <div className="empty-state">Searching for flights...</div>
          ) : flights.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✈</span>
              <h3>No flights to show</h3>
              <p>Try different airport codes or another departure date.</p>
            </div>
          ) : (
            <div className="flight-list">
              {flights.map((flight) => (
                <article className="flight-card" key={flight.id}>
                  <div className="airline-block">
                    <span className="airline-icon">✈</span>
                    <div>
                      <strong>{flight.airline}</strong>
                      <span>{flight.flight_number}</span>
                    </div>
                  </div>

                  <div className="route-block">
                    <div>
                      <strong>{flight.origin}</strong>
                      <span>{flight.departure_time}</span>
                    </div>
                    <div className="route-line">
                      <span>Direct</span>
                      <div />
                    </div>
                    <div className="destination-time">
                      <strong>{flight.destination}</strong>
                      <span>{flight.arrival_time}</span>
                    </div>
                  </div>

                  <div className="price-block">
                    <strong>{formatPrice(flight.price, flight.currency)}</strong>
                    <span>{flight.available_seats} seats available</span>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => {
                        setSelectedFlight(flight);
                        setSeats(1);
                        setError("");
                        setNotice("");
                      }}
                    >
                      Select flight
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedFlight && (
          <section className="panel booking-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ALMOST THERE</p>
                <h2>Complete your booking</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelectedFlight(null)}
              >
                Close
              </button>
            </div>

            <div className="selected-flight">
              <div>
                <span>Selected flight</span>
                <strong>
                  {selectedFlight.airline} · {selectedFlight.id}
                </strong>
                <p>
                  {selectedFlight.origin} → {selectedFlight.destination}
                </p>
              </div>
              <div className="selected-price">
                <span>Price per seat</span>
                <strong>
                  {formatPrice(selectedFlight.price, selectedFlight.currency)}
                </strong>
              </div>
            </div>

            <form className="booking-form" onSubmit={createBooking}>
              <label>
                Passenger name
                <input
                  value={passengerName}
                  onChange={(event) => setPassengerName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  placeholder="Enter full name"
                  required
                />
              </label>

              <label>
                Passenger email
                <input
                  type="email"
                  value={passengerEmail}
                  onChange={(event) => setPassengerEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Number of seats
                <input
                  type="number"
                  min="1"
                  max={Math.min(6, selectedFlight.available_seats)}
                  value={seats}
                  onChange={(event) => setSeats(Number(event.target.value))}
                  required
                />
              </label>

              <div className="booking-total">
                <span>Total price</span>
                <strong>
                  {formatPrice(
                    selectedFlight.price * Number(seats || 0),
                    selectedFlight.currency
                  )}
                </strong>
              </div>

              <button
                className="primary-button submit-button"
                type="submit"
                disabled={submittingBooking}
              >
                {submittingBooking ? "Processing..." : "Confirm booking"}
              </button>
            </form>
          </section>
        )}

        <section className="results-section bookings-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TRAVEL ACTIVITY</p>
              <h2>My bookings</h2>
            </div>
            <button
              className="secondary-button"
              onClick={loadBookings}
              disabled={loadingBookings}
            >
              {loadingBookings ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="empty-state">
              <h3>No bookings yet</h3>
              <p>Your confirmed bookings will appear here.</p>
            </div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
                <article className="booking-card" key={booking.booking_id}>
                  <div className="booking-card-main">
                    <span className="booking-id">{booking.booking_id}</span>
                    <strong>{booking.passenger_name}</strong>
                    <span>{booking.passenger_email}</span>
                  </div>

                  <div className="booking-card-detail">
                    <span>Flight</span>
                    <strong>{booking.flight_id}</strong>
                    <span>{booking.seats} seat(s)</span>
                  </div>

                  <div className="booking-card-actions">
                    <span
                      className={`status-pill ${
                        booking.status === "CONFIRMED"
                          ? "status-confirmed"
                          : "status-cancelled"
                      }`}
                    >
                      {booking.status}
                    </span>

                    {booking.status === "CONFIRMED" && (
                      <button
                        className="cancel-button"
                        onClick={() => cancelBooking(booking.booking_id)}
                      >
                        Cancel booking
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>CloudSkies · Learning project</span>
        <span>Sample flights · No real airline reservations</span>
      </footer>
    </div>
  );
}

export default App;
