"""SpotShare smart recommendation engine.

Scores and ranks candidate spots based on user preferences:
- Distance / Proximity to user
- Price competitiveness
- Rating and popularity
- EV charging requirement matching
- Vehicle type compatibility
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


def recommend_spots(spots: List[Dict[str, Any]], preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rank spots based on composite scoring tailored to the user's search preferences."""
    if not spots:
        return []

    vehicle_type: Optional[str] = preferences.get("vehicle_type")
    requires_ev: bool = bool(preferences.get("requires_ev_charging", False))
    max_price: Optional[float] = preferences.get("max_price")
    max_dist: Optional[float] = preferences.get("max_distance_km")
    limit: int = int(preferences.get("limit", 5))

    candidates: List[Dict[str, Any]] = []

    for spot in spots:
        # Filter out spots that don't support the requested vehicle
        if vehicle_type and vehicle_type not in spot.get("vehicle_types", []):
            continue

        # Filter out if EV is required but spot has none
        if requires_ev and not spot.get("ev_charging", False):
            continue

        price = float(spot.get("price_per_hour", 0.0))
        if max_price is not None and price > max_price:
            continue

        dist = spot.get("distance_km")
        if max_dist is not None and dist is not None and dist > max_dist:
            continue

        # Availability check: spots that are open with free spaces get priority
        available_spaces = int(spot.get("available_spaces", 0))
        status = spot.get("status", "available")
        if not spot.get("is_active", True) or status in ("occupied", "closed") or available_spaces <= 0:
            continue

        candidates.append(spot)

    if not candidates:
        return []

    # Calculate min/max for normalization
    prices = [float(s.get("price_per_hour", 0.0)) for s in candidates]
    min_price, max_price_val = min(prices), max(prices)
    price_span = (max_price_val - min_price) if max_price_val > min_price else 1.0

    distances = [float(s.get("distance_km", 0.0)) for s in candidates if s.get("distance_km") is not None]
    min_dist = min(distances) if distances else 0.0
    max_dist_val = max(distances) if distances else 1.0
    dist_span = (max_dist_val - min_dist) if max_dist_val > min_dist else 1.0

    scored_spots = []
    for s in candidates:
        # Price score: 0 (most expensive) to 1 (cheapest)
        p = float(s.get("price_per_hour", 0.0))
        price_score = 1.0 - ((p - min_price) / price_span)

        # Distance score: 0 (furthest) to 1 (closest)
        d = s.get("distance_km")
        if d is not None:
            dist_score = 1.0 - ((float(d) - min_dist) / dist_span)
        else:
            dist_score = 0.5  # neutral if distance unknown

        # Rating score: 0 to 1
        r = s.get("rating")
        rating_score = (float(r) / 5.0) if r is not None else 0.6

        # EV bonus
        ev_score = 1.0 if s.get("ev_charging") else 0.0

        # Weighted final score: 35% distance, 30% price, 20% rating, 15% EV capability
        final_score = (0.35 * dist_score) + (0.30 * price_score) + (0.20 * rating_score) + (0.15 * ev_score)

        item = dict(s)
        item["recommendation_score"] = round(final_score * 100, 1)
        scored_spots.append((final_score, item))

    # Sort descending by score
    scored_spots.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_spots[:limit]]


def generate_host_insights(spots, bookings):
    """Computes host analytics summary and actionable insights for the host dashboard."""
    total_spots = len(spots)
    open_spots = [
        s for s in spots
        if s.get("is_active", True) and s.get("status") not in ("removed", "closed")
    ]
    closed_spots = [
        s for s in spots
        if not s.get("is_active", True) or s.get("status") == "closed"
    ]
    active_spots = len(open_spots)
    total_capacity = sum(int(s.get("capacity") or 1) for s in open_spots)
    available_spaces = sum(
        int(s["available_spaces"]) if s.get("available_spaces") is not None else int(s.get("capacity") or 1)
        for s in open_spots
    )
    currently_reserved = max(0, total_capacity - available_spaces)

    confirmed_bookings = [b for b in bookings if b.get("status") in ("confirmed", "checked_in")]
    total_earnings = sum(float(b.get("total_price") or 0) for b in confirmed_bookings)

    # Compute occupancy for the next 6-hour window
    now = datetime.now()
    window_end = now + timedelta(hours=6)
    booked_hours = 0.0

    for b in confirmed_bookings:
        start_str = b.get("start_time")
        end_str = b.get("end_time")
        if start_str and end_str:
            try:
                start = datetime.fromisoformat(str(start_str))
                end = datetime.fromisoformat(str(end_str))
                overlap_start = max(start, now)
                overlap_end = min(end, window_end)
                if overlap_end > overlap_start:
                    booked_hours += (overlap_end - overlap_start).total_seconds() / 3600.0
            except Exception:
                booked_hours += float(b.get("duration_hours") or 1.0)
        else:
            booked_hours += float(b.get("duration_hours") or 1.0)

    max_window_bay_hours = max(1.0, float(total_capacity) * 6.0)
    occupancy_percent = round((booked_hours / max_window_bay_hours) * 100, 1)

    # If instantaneous bays are occupied, ensure occupancy reflects current usage
    if currently_reserved > 0 and occupancy_percent == 0 and total_capacity > 0:
        occupancy_percent = round((currently_reserved / total_capacity) * 100, 1)

    # Generate actionable insights
    insights = []
    if total_spots == 0:
        insights.append({
            "type": "opportunity",
            "title": "Publish Your First EV Charger",
            "detail": "EV demand is growing. Use the form to list your charging station and start earning."
        })
    elif active_spots == 0:
        insights.append({
            "type": "warning",
            "title": f"All Stations Closed ({len(closed_spots)})",
            "detail": "Your station(s) are temporarily turned off. Click 'Reopen Station' when you're back to accept bookings."
        })
    elif len(confirmed_bookings) == 0:
        insights.append({
            "type": "opportunity",
            "title": "Ready for Bookings",
            "detail": "Your charger is online. Keep rates competitive (₹20–₹40/hr) to attract local EV drivers."
        })
    else:
        insights.append({
            "type": "trend",
            "title": f"Active Customer Demand ({len(confirmed_bookings)} Bookings)",
            "detail": f"Generated ₹{round(total_earnings, 2)} from {len(confirmed_bookings)} driver reservation(s)."
        })

    if closed_spots and active_spots > 0:
        insights.append({
            "type": "warning",
            "title": f"{len(closed_spots)} Station(s) Temporarily Closed",
            "detail": "Closed stations stay saved in your dashboard and won't accept new bookings until reopened."
        })

    if active_spots > 0 and occupancy_percent >= 75:
        insights.append({
            "type": "warning",
            "title": "High Bay Occupancy",
            "detail": f"Station is at {occupancy_percent}% capacity. Consider expanding bays or slight peak pricing."
        })
    elif active_spots > 0:
        insights.append({
            "type": "opportunity",
            "title": "Available Bays",
            "detail": f"{available_spaces} of {total_capacity} bays currently free. Ready for new incoming drivers."
        })

    summary = {
        "total_listings": active_spots,
        "closed_listings": len(closed_spots),
        "total_bookings": len(confirmed_bookings),
        "total_revenue": round(total_earnings, 2),
        "total_available_bays": available_spaces,
        "total_capacity": total_capacity,
        "occupancy_percent": occupancy_percent,
    }

    return {
        "summary": summary,
        "insights": insights,
        "total_spots": total_spots,
        "active_spots": active_spots,
        "total_bookings": len(confirmed_bookings),
        "total_earnings": round(total_earnings, 2),
        "occupancy_rate": round(occupancy_percent / 100.0, 3),
        "insights_summary": f"You have {active_spots} active listings generating ₹{round(total_earnings, 2)} from {len(confirmed_bookings)} bookings."
    }