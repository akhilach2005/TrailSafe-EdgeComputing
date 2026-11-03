from pathlib import Path
import joblib
import math
import os
import pandas as pd
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

    required = ["Temperature", "Humidity"]
    missing = [key for key in required if key not in data]

    if missing:
        return jsonify({
            "error": "Missing required fields",
            "missing": missing
        }), 400

    try:
        temperature = float(data["Temperature"])
        humidity = float(data["Humidity"])

        if not math.isfinite(temperature) or not math.isfinite(humidity):
            return jsonify({"error": "Numeric fields must be finite numbers"}), 400

        if not 0 <= humidity <= 100:
            return jsonify({"error": "Humidity must be between 0 and 100"}), 400

        row = pd.DataFrame([{
            "Temperature": temperature,
            "Humidity": humidity
        }]).reindex(columns=model_features)

        prediction = float(model.predict(row)[0])
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

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5001)),
        debug=False
    )