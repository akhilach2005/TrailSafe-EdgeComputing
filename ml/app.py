
from pathlib import Path
import joblib
import pandas as pd
import math
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_PATH = Path(__file__).parent / "decision_tree.joblib"
model_data = joblib.load(MODEL_PATH)

model = model_data["model"]
model_features = model_data["features"]

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "JSON request body is required"}), 400

    required = [
        "Temperature",
        "Humidity",
        "Wind Speed",
        "UV Index",
        "Visibility (km)",
        "Weather Type"
    ]

    missing = [key for key in required if key not in data]

    if missing:
        return jsonify({
            "error": "Missing required fields",
            "missing": missing
        }), 400

    try:
        row = pd.DataFrame([{
            "Temperature": float(data["Temperature"]),
            "Humidity": float(data["Humidity"]),
            "Wind Speed": float(data["Wind Speed"]),
            "UV Index": float(data["UV Index"]),
            "Visibility (km)": float(data["Visibility (km)"]),
            "Weather Type": str(data["Weather Type"]).strip().title()
        }])

        numeric_columns = required[:-1]

        if not all(math.isfinite(row[col].iloc[0]) for col in numeric_columns):
            return jsonify({"error": "Numeric fields must be finite numbers"}), 400

        if not 0 <= row["Humidity"].iloc[0] <= 100:
            return jsonify({"error": "Humidity must be between 0 and 100"}), 400

        if row["Wind Speed"].iloc[0] < 0 or row["UV Index"].iloc[0] < 0 or row["Visibility (km)"].iloc[0] < 0:
            return jsonify({"error": "Wind speed, UV index and visibility cannot be negative"}), 400

        if row["Weather Type"].iloc[0] not in ["Sunny", "Cloudy", "Rainy", "Snowy"]:
            return jsonify({"error": "Invalid weather type"}), 400

        encoded = pd.get_dummies(row, columns=["Weather Type"])
        encoded = encoded.reindex(columns=model_features, fill_value=0)

        prediction = float(model.predict(encoded)[0])
        risk_score = round(max(0, min(100, prediction)), 2)

        if risk_score < 25:
            risk_label = "Low"
        elif risk_score < 50:
            risk_label = "Moderate"
        elif risk_score < 75:
            risk_label = "High"
        else:
            risk_label = "Very High"

        return jsonify({
            "risk_score": risk_score,
            "risk_label": risk_label
        })

    except (ValueError, TypeError):
        return jsonify({"error": "Invalid input values"}), 400

import os

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)