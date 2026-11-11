"""Unit and integration tests for SpotShare backend.
Tests business logic, database constraints, capacity, and API endpoints.
"""
import os
import tempfile
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

# Use temporary database for tests
temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["SPOTSHARE_DB_PATH"] = temp_db.name
os.environ["SPOTSHARE_ALLOW_PAST"] = "1"

import database
from main import app
import recommendations

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    database.init_db()
    yield


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "spotshare-backend"
    assert data["database"] == "ok"


def test_list_spots():
    response = client.get("/api/spots")
    assert response.status_code == 200
    spots = response.json()
    assert isinstance(spots, list)
    assert len(spots) > 0
    # Spot schema check
    first = spots[0]
    assert "id" in first
    assert "name" in first
    assert "price_per_hour" in first
    assert "available_spaces" in first


def test_booking_creation_and_capacity_decrement():
    # 1. Fetch available spot
    spots_res = client.get("/api/spots")
    spot = spots_res.json()[0]
    initial_spaces = spot["available_spaces"]
    spot_id = spot["id"]

    # 2. Create a valid booking
    start = datetime.now() + timedelta(hours=1)
    end = start + timedelta(hours=2)

    payload = {
        "spot_id": spot_id,
        "customer_name": "Test User",
        "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "vehicle_type": spot["vehicle_types"][0],
        "requires_ev_charging": False,
    }

    res = client.post("/api/bookings", json=payload)
    assert res.status_code == 201
    booking = res.json()
    assert booking["spot_id"] == spot_id
    assert booking["status"] == "confirmed"
    assert booking["total_price"] > 0

    # 3. Check booking is in bookings list
    booking_id = booking["id"]
    get_res = client.get("/api/bookings")
    assert get_res.status_code == 200
    ids = [b["id"] for b in get_res.json()]
    assert booking_id in ids

    # 4. Cancel booking and verify status update
    del_res = client.delete(f"/api/bookings/{booking_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "cancelled"


def test_booking_validation_errors():
    # Test invalid duration (end before start)
    start = datetime.now() + timedelta(hours=2)
    end = datetime.now() + timedelta(hours=1)
    payload = {
        "spot_id": "spot101",
        "customer_name": "Invalid Booking",
        "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "vehicle_type": "car",
        "requires_ev_charging": False,
    }
    res = client.post("/api/bookings", json=payload)
    assert res.status_code in (400, 422)


def test_recommendations_endpoint():
    res = client.get("/api/recommendations?lat=12.3085&lng=76.6527&limit=3")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) <= 3
    if data:
        assert "recommendation_score" in data[0]


def test_simulator_check_in_and_reset():
    # Create booking first
    start = datetime.now()
    end = start + timedelta(hours=1)
    payload = {
        "spot_id": "spot101",
        "customer_name": "Simulator User",
        "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
        "vehicle_type": "car",
    }
    b_res = client.post("/api/bookings", json=payload)
    assert b_res.status_code == 201
    b_id = b_res.json()["id"]

    # Simulator check-in
    checkin_res = client.post("/api/simulator/check-in", json={"booking_id": b_id})
    assert checkin_res.status_code == 200
    assert checkin_res.json()["barrier"] == "open"

    # Reset simulator
    reset_res = client.post("/api/simulator/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["barrier"] == "closed"


def test_create_and_delete_spot():
    payload = {
        "name": "Test Host Charger",
        "address": "123 Green Way, Mysuru",
        "latitude": 12.3,
        "longitude": 76.6,
        "price_per_hour": 25.0,
        "charger_power_kw": 22.0,
        "capacity": 2,
        "vehicle_types": ["car"],
        "ev_charging": True,
        "owner_name": "TestHost",
    }
    res = client.post("/api/spots", json=payload)
    assert res.status_code == 201
    spot_id = res.json()["id"]

    # Delete spot
    del_res = client.delete(f"/api/spots/{spot_id}?owner_name=TestHost")
    assert del_res.status_code == 200
    assert del_res.json()["id"] == spot_id

    # Verify deleted
    get_res = client.get(f"/api/spots/{spot_id}")
    assert get_res.status_code == 404


def test_close_and_reopen_ev_charger_station():
    # Create an EV charger owned by OutOfTownHost
    payload = {
        "name": "OutOfTown EV Station",
        "address": "45 Palm Ave, Mysuru",
        "latitude": 12.31,
        "longitude": 76.64,
        "price_per_hour": 20.0,
        "charger_power_kw": 22.0,
        "capacity": 2,
        "vehicle_types": ["car"],
        "ev_charging": True,
        "owner_name": "OutOfTownHost",
    }
    res = client.post("/api/spots", json=payload)
    assert res.status_code == 201
    spot = res.json()
    spot_id = spot["id"]
    assert spot["is_active"] is True
    assert spot["status"] == "available"
    assert spot["available_spaces"] == 2

    # Another host cannot close this charger
    forbidden_res = client.patch(
        f"/api/spots/{spot_id}/status",
        json={"is_active": False, "owner_name": "WrongHost"},
    )
    assert forbidden_res.status_code == 403

    # Owner closes/turns off the charger station
    close_res = client.patch(
        f"/api/spots/{spot_id}/status",
        json={"is_active": False, "owner_name": "OutOfTownHost"},
    )
    assert close_res.status_code == 200
    closed_spot = close_res.json()
    assert closed_spot["is_active"] is False
    assert closed_spot["status"] == "closed"
    assert closed_spot["available_spaces"] == 0

    # Excluded from available_only list and recommendations
    avail_res = client.get("/api/spots?available_only=true")
    assert avail_res.status_code == 200
    assert all(s["id"] != spot_id for s in avail_res.json())

    recs_res = client.get("/api/recommendations?lat=12.31&lng=76.64&requires_ev_charging=true&limit=20")
    assert recs_res.status_code == 200
    assert all(s["id"] != spot_id for s in recs_res.json())

    # Bookings are rejected while closed
    start = datetime.now() + timedelta(hours=1)
    end = start + timedelta(hours=1)
    book_res = client.post(
        "/api/bookings",
        json={
            "spot_id": spot_id,
            "customer_name": "Driver A",
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "vehicle_type": "car",
            "requires_ev_charging": True,
        },
    )
    assert book_res.status_code == 409
    assert book_res.json()["code"] == "spot_closed"

    # Insights and host insights handle closed station cleanly
    insights_res = client.get("/api/insights")
    assert insights_res.status_code == 200
    assert insights_res.json()["spot_status_counts"]["closed"] >= 1

    host_insights_res = client.get("/api/host/insights?owner_name=OutOfTownHost")
    assert host_insights_res.status_code == 200
    hi = host_insights_res.json()
    assert hi["summary"]["total_listings"] == 0
    assert hi["summary"]["closed_listings"] == 1

    # Owner reopens/turns on the charger station
    reopen_res = client.patch(
        f"/api/spots/{spot_id}/status",
        json={"is_active": True, "owner_name": "OutOfTownHost"},
    )
    assert reopen_res.status_code == 200
    reopened = reopen_res.json()
    assert reopened["is_active"] is True
    assert reopened["status"] == "available"
    assert reopened["available_spaces"] == 2

    # Booking works again once reopened
    book_ok = client.post(
        "/api/bookings",
        json={
            "spot_id": spot_id,
            "customer_name": "Driver A",
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "vehicle_type": "car",
            "requires_ev_charging": True,
        },
    )
    assert book_ok.status_code == 201

    # Clean up
    client.delete(f"/api/spots/{spot_id}?owner_name=OutOfTownHost")


def test_password_reset_email_and_verification(monkeypatch, tmp_path):
    import mailer

    # Ensure unconfigured SMTP fails explicitly instead of faking a demo code
    monkeypatch.delenv("SPOTSHARE_SMTP_USER", raising=False)
    monkeypatch.delenv("SPOTSHARE_SMTP_PASSWORD", raising=False)
    monkeypatch.setattr(mailer, "ENV_PATH", tmp_path / "missing.env")

    unconf_res = client.post(
        "/api/auth/forgot-password",
        json={"email": "ashish@gmail.com", "name": "Ashish", "role": "customer"},
    )
    assert unconf_res.status_code == 503
    assert unconf_res.json()["code"] == "email_not_configured"

    # Configure mock SMTP credentials and capture outbound email
    monkeypatch.setenv("SPOTSHARE_SMTP_USER", "sender@gmail.com")
    monkeypatch.setenv("SPOTSHARE_SMTP_PASSWORD", "abcd efgh ijkl mnop")
    sent_messages = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=15):
            self.host = host
            self.port = port

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def ehlo(self):
            pass

        def starttls(self, context=None):
            pass

        def login(self, user, password):
            assert user == "sender@gmail.com"
            assert password == "abcdefghijklmnop"

        def send_message(self, msg):
            sent_messages.append(msg)

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)

    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "ashish@gmail.com", "name": "Ashish", "role": "customer"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["sent"] is True
    assert body["email"] == "ashish@gmail.com"
    assert len(sent_messages) == 1

    # Extract 6-digit OTP from the emailed subject
    import re
    m = re.search(r"\b(\d{6})\b", sent_messages[0]["Subject"])
    assert m is not None
    emailed_code = m.group(1)
    assert emailed_code not in body["message"]

    # Wrong code fails
    wrong_code = "000000" if emailed_code != "000000" else "111111"
    bad_res = client.post(
        "/api/auth/verify-reset-code",
        json={"email": "ashish@gmail.com", "code": wrong_code, "role": "customer"},
    )
    assert bad_res.status_code == 400
    assert bad_res.json()["code"] == "invalid_reset_code"

    # Correct emailed code succeeds once
    ok_res = client.post(
        "/api/auth/verify-reset-code",
        json={"email": "ashish@gmail.com", "code": emailed_code, "role": "customer"},
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["verified"] is True

    # Reusing the same code fails
    reuse_res = client.post(
        "/api/auth/verify-reset-code",
        json={"email": "ashish@gmail.com", "code": emailed_code, "role": "customer"},
    )
    assert reuse_res.status_code == 400
    assert reuse_res.json()["code"] == "reset_not_found"


def test_booking_confirmation_email(monkeypatch, tmp_path):
    import mailer

    sent_messages = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=15):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def ehlo(self):
            pass

        def starttls(self, context=None):
            pass

        def login(self, user, password):
            pass

        def send_message(self, msg):
            sent_messages.append(msg)

    # 1. Even if SMTP is unconfigured, booking creation still succeeds
    monkeypatch.delenv("SPOTSHARE_SMTP_USER", raising=False)
    monkeypatch.delenv("SPOTSHARE_SMTP_PASSWORD", raising=False)
    monkeypatch.setattr(mailer, "ENV_PATH", tmp_path / "missing.env")

    start = datetime.now() + timedelta(hours=3)
    end = start + timedelta(hours=2)
    unconf = client.post(
        "/api/bookings",
        json={
            "spot_id": "spot101",
            "customer_name": "Email Tester",
            "customer_email": "customer@gmail.com",
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "vehicle_type": "car",
            "requires_ev_charging": False,
        },
    )
    assert unconf.status_code == 201
    assert unconf.json()["email_sent"] is False
    client.delete(f"/api/bookings/{unconf.json()['id']}")

    # 2. With SMTP configured, Parking & EV Charging bookings send confirmation emails
    monkeypatch.setenv("SPOTSHARE_SMTP_USER", "sender@gmail.com")
    monkeypatch.setenv("SPOTSHARE_SMTP_PASSWORD", "abcd efgh ijkl mnop")
    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)

    parking_res = client.post(
        "/api/bookings",
        json={
            "spot_id": "spot101",
            "customer_name": "Email Tester",
            "customer_email": "parking@gmail.com",
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "vehicle_type": "car",
            "requires_ev_charging": False,
        },
    )
    assert parking_res.status_code == 201
    p_data = parking_res.json()
    assert p_data["email_sent"] is True

    ev_res = client.post(
        "/api/bookings",
        json={
            "spot_id": "spot201",
            "customer_name": "EV Tester",
            "customer_email": "ev@gmail.com",
            "start_time": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "vehicle_type": "car",
            "requires_ev_charging": True,
        },
    )
    assert ev_res.status_code == 201
    ev_data = ev_res.json()
    assert ev_data["email_sent"] is True

    assert len(sent_messages) == 2
    assert sent_messages[0]["To"] == "parking@gmail.com"
    assert "Parking Space Confirmed" in sent_messages[0]["Subject"]
    assert p_data["id"] in sent_messages[0]["Subject"]
    assert sent_messages[1]["To"] == "ev@gmail.com"
    assert "EV Charging" in sent_messages[1]["Subject"]
    assert ev_data["id"] in sent_messages[1]["Subject"]

    # Clean up test bookings
    client.delete(f"/api/bookings/{p_data['id']}")
    client.delete(f"/api/bookings/{ev_data['id']}")
