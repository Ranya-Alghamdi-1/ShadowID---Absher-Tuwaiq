#!/usr/bin/env python3
"""
ML Risk Assessment Script for Shadow ID
Loads trained models and predicts risk level for a Shadow ID scan.
"""

import sys
import json
import os
from datetime import datetime
import numpy as np
import pandas as pd

# ML Libraries
import joblib
import tensorflow as tf
from tensorflow import keras

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, "../../DeepLearning_Classification/Models")

# Load models
SCALER_PATH = os.path.join(MODELS_DIR, "shadow_id_scaler.pkl")
AUTOENCODER_PATH = os.path.join(MODELS_DIR, "shadow_id_autoencoder.keras")
ENCODER_PATH = os.path.join(MODELS_DIR, "shadow_id_encoder.keras")
CLASSIFIER_PATH = os.path.join(MODELS_DIR, "shadow_id_risk_classifier_rf.pkl")
FEATURE_NAMES_PATH = os.path.join(MODELS_DIR, "shadow_id_feature_names.json.json")
LABEL_MAPPING_PATH = os.path.join(MODELS_DIR, "shadow_id_label_mapping.json.json")

# Load models (lazy loading - only load once)
_models_loaded = False
_scaler = None
_autoencoder = None
_encoder = None
_classifier = None
_feature_names = None
_label_mapping = None
_reverse_label_mapping = None


def load_models():
    """Load all ML models and metadata."""
    global _models_loaded, _scaler, _autoencoder, _encoder, _classifier
    global _feature_names, _label_mapping, _reverse_label_mapping

    if _models_loaded:
        return

    try:
        # Load scaler
        _scaler = joblib.load(SCALER_PATH)
        print("✅ Loaded scaler", file=sys.stderr)

        # Load Keras models
        _autoencoder = keras.models.load_model(AUTOENCODER_PATH)
        _encoder = keras.models.load_model(ENCODER_PATH)
        print("✅ Loaded Keras models", file=sys.stderr)

        # Load RandomForest classifier
        _classifier = joblib.load(CLASSIFIER_PATH)
        print("✅ Loaded RandomForest classifier", file=sys.stderr)

        # Load feature names
        with open(FEATURE_NAMES_PATH, "r") as f:
            _feature_names = json.load(f)
        print("✅ Loaded feature names", file=sys.stderr)

        # Load label mapping
        with open(LABEL_MAPPING_PATH, "r") as f:
            _label_mapping = json.load(f)
        _reverse_label_mapping = {v: k for k, v in _label_mapping.items()}
        print("✅ Loaded label mapping", file=sys.stderr)

        _models_loaded = True
    except Exception as e:
        print(f"❌ Error loading models: {e}", file=sys.stderr)
        sys.exit(1)


def parse_location(location_str):
    """
    Parse location string to extract latitude and longitude.
    Expected format: "lat,lon" or "21.4555,39.2497"
    Returns: (lat, lon) or (None, None) if parsing fails
    """
    if not location_str:
        return None, None

    try:
        # Try to parse as "lat,lon"
        parts = location_str.split(",")
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            return lat, lon
    except:
        pass

    # If parsing fails, return None
    return None, None


def extract_location_name(location_str):
    """
    Extract location name from location string.
    If location is coordinates, try to map to a city name.
    For now, return a default or try to extract from string.
    """
    if not location_str:
        return "Unknown"

    # If it's coordinates, we can't determine city from coords alone
    # In production, you'd use reverse geocoding
    # For now, return a default or extract from string if it contains a city name
    location_lower = location_str.lower()

    # Common Saudi cities
    cities = {
        "riyadh": "Riyadh",
        "jeddah": "Jeddah",
        "dammam": "Dammam",
        "makkah": "Makkah",
        "madinah": "Madinah",
        "taif": "Taif",
        "abha": "Abha",
        "jazan": "Jazan",
        "hail": "Hail",
        "tabuk": "Tabuk",
        "al baha": "Al Baha",
        "baha": "Al Baha",
    }

    for key, city in cities.items():
        if key in location_lower:
            return city

    return "Riyadh"  # Default


def extract_features(data):
    """
    Extract features from input data to match the model's expected features.
    Input data should contain:
    - user: {nationalId, personType, nationality}
    - shadowId: {createdAt, expiresAt, deviceFingerprint, generationLocation}
    - scan: {location, timestamp, deviceFingerprint}
    - anomalies: {deviceHopping, impossibleTravel, frequentGeneration, tokenReuse}
    """
    # Load models if not already loaded
    load_models()

    # Extract basic info
    user = data.get("user", {})
    shadow_id = data.get("shadowId", {})
    scan = data.get("scan", {})
    anomalies = data.get("anomalies", {})

    # Person Type Code (1 = Citizen, 2 = Resident)
    person_type = user.get("personType", "Citizen")
    person_type_code = 1 if person_type == "Citizen" else 2

    # Location (from scan location)
    scan_location = scan.get("location", "")
    lat, lon = parse_location(scan_location)
    if lat is None or lon is None:
        # Default to Riyadh coordinates if parsing fails
        lat, lon = 24.7136, 46.6753

    # Token duration (3 minutes = 180 seconds, but model expects minutes)
    token_duration_minutes = 3  # Fixed for Shadow ID

    # Time calculations
    try:
        created_at = datetime.fromisoformat(
            shadow_id.get("createdAt", "").replace("Z", "+00:00")
        )
        expires_at = datetime.fromisoformat(
            shadow_id.get("expiresAt", "").replace("Z", "+00:00")
        )
        scan_time = datetime.fromisoformat(
            scan.get("timestamp", "").replace("Z", "+00:00")
        )
    except:
        # Fallback to current time
        created_at = datetime.now()
        expires_at = datetime.now()
        scan_time = datetime.now()

    # Time from start (minutes)
    time_from_start_min = (scan_time - created_at).total_seconds() / 60.0

    # Used within validity (1 = yes, 0 = no)
    used_within_validity = 1 if scan_time <= expires_at else 0

    # Is expired at use
    is_expired_at_use = 1 if scan_time > expires_at else 0

    # Token start hour and usage hour
    token_start_hour = created_at.hour
    usage_hour = scan_time.hour
    usage_weekday = scan_time.weekday()  # 0 = Monday, 6 = Sunday

    # Nationality (one-hot encoding)
    nationality = user.get("nationality", "Saudi")
    nationality_map = {
        "Saudi": "Nationality_Saudi",
        "Egyptian": "Nationality_Egyptian",
        "Filipino": "Nationality_Filipino",
        "Indian": "Nationality_Indian",
        "Pakistani": "Nationality_Pakistani",
        "Sudanese": "Nationality_Sudanese",
        "Syrian": "Nationality_Syrian",
        "Yemeni": "Nationality_Yemeni",
    }

    # Location (one-hot encoding)
    location_name = extract_location_name(scan_location)
    location_map = {
        "Riyadh": "Location_Riyadh",
        "Jeddah": "Location_Jeddah",
        "Dammam": "Location_Dammam",
        "Makkah": "Location_Makkah",
        "Madinah": "Location_Madinah",
        "Jazan": "Location_Jazan",
        "Hail": "Location_Hail",
        "Tabuk": "Location_Tabuk",
        "Al Baha": "Location_Al Baha",
    }

    # Fraud type flags
    fraud_type_frequent_generation = (
        1 if anomalies.get("frequentGeneration", False) else 0
    )
    fraud_type_impossible_travel = 1 if anomalies.get("impossibleTravel", False) else 0

    # State flags
    state_expired = 1 if is_expired_at_use else 0
    state_suspicious = (
        1
        if (
            anomalies.get("deviceHopping", False)
            or anomalies.get("impossibleTravel", False)
            or anomalies.get("tokenReuse", False)
        )
        else 0
    )

    # Person type one-hot
    person_type_resident = 1 if person_type_code == 2 else 0

    # Build feature vector in the exact order expected by the model
    features = {}

    # Numeric features
    features["PersonTypeCode"] = person_type_code
    features["Latitude"] = lat
    features["Longitude"] = lon
    features["TokenDurationMinutes"] = token_duration_minutes
    features["UsedWithinValidity"] = used_within_validity
    features["TimeFromStartMin"] = time_from_start_min
    features["IsExpiredAtUse"] = is_expired_at_use
    features["TokenStartHour"] = token_start_hour
    features["UsageHour"] = usage_hour
    features["UsageWeekday"] = usage_weekday

    # One-hot: PersonType
    features["PersonType_Resident"] = person_type_resident

    # One-hot: Nationality (all zeros except one)
    for nat_key in [
        "Nationality_Egyptian",
        "Nationality_Filipino",
        "Nationality_Indian",
        "Nationality_Pakistani",
        "Nationality_Saudi",
        "Nationality_Sudanese",
        "Nationality_Syrian",
        "Nationality_Yemeni",
    ]:
        features[nat_key] = 1 if nationality_map.get(nationality, "") == nat_key else 0

    # One-hot: Location (all zeros except one)
    for loc_key in [
        "Location_Al Baha",
        "Location_Dammam",
        "Location_Hail",
        "Location_Jazan",
        "Location_Jeddah",
        "Location_Madinah",
        "Location_Makkah",
        "Location_Riyadh",
        "Location_Tabuk",
    ]:
        features[loc_key] = 1 if location_map.get(location_name, "") == loc_key else 0

    # Fraud type flags
    features["FraudType_FrequentGeneration"] = fraud_type_frequent_generation
    features["FraudType_ImpossibleTravel"] = fraud_type_impossible_travel

    # State flags
    features["State_Expired"] = state_expired
    features["State_Suspicious"] = state_suspicious

    # Convert to DataFrame with correct feature order
    feature_vector = [features.get(fname, 0) for fname in _feature_names]
    feature_array = np.array(feature_vector).reshape(1, -1)

    return feature_array


def assess_risk(data):
    """
    Main function to assess risk using ML models.
    Returns: {
        "riskScore": 0-100,
        "riskLevel": "Low" | "Medium" | "High",
        "riskProbability": { "Low": 0.0-1.0, "Medium": 0.0-1.0, "High": 0.0-1.0 }
    }
    """
    try:
        # Extract features
        feature_array = extract_features(data)

        # Scale features
        scaled_features = _scaler.transform(feature_array)

        # Get encoded features (using encoder)
        encoded_features = _encoder.predict(scaled_features, verbose=0)

        # Predict with RandomForest
        prediction = _classifier.predict(encoded_features)[0]
        probabilities = _classifier.predict_proba(encoded_features)[0]

        # Map prediction to risk level
        risk_level = _reverse_label_mapping.get(prediction, "Low")

        # Calculate risk score (0-100) based on probabilities
        # High risk = 100, Medium = 50, Low = 0
        risk_score_map = {"Low": 0, "Medium": 50, "High": 100}
        base_score = risk_score_map.get(risk_level, 0)

        # Adjust score based on probability confidence
        # If probability is high, use full score; if low, reduce it
        prob_dict = {
            "Low": probabilities[0] if len(probabilities) > 0 else 0.5,
            "Medium": probabilities[1] if len(probabilities) > 1 else 0.5,
            "High": probabilities[2] if len(probabilities) > 2 else 0.5,
        }

        # Scale score based on confidence
        confidence = prob_dict.get(risk_level, 0.5)
        risk_score = int(base_score * confidence)

        # Build probability dictionary
        risk_probability = {
            "Low": float(prob_dict["Low"]),
            "Medium": float(prob_dict["Medium"]),
            "High": float(prob_dict["High"]),
        }

        return {
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "riskProbability": risk_probability,
        }

    except Exception as e:
        print(f"❌ Error in risk assessment: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc(file=sys.stderr)
        # Return default low risk on error
        return {
            "riskScore": 0,
            "riskLevel": "Low",
            "riskProbability": {"Low": 1.0, "Medium": 0.0, "High": 0.0},
        }


def main():
    """Main entry point - reads JSON from stdin, outputs JSON to stdout."""
    if len(sys.argv) > 1:
        # Read from command line argument (JSON string)
        input_data = json.loads(sys.argv[1])
    else:
        # Read from stdin
        input_json = sys.stdin.read()
        input_data = json.loads(input_json)

    # Assess risk
    result = assess_risk(input_data)

    # Output JSON result
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
