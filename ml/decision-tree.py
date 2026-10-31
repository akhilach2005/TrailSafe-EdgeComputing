
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).parent
DATASET_PATH = BASE_DIR / "dataset_with_risk_score.xlsx"
MODEL_PATH = BASE_DIR / "decision_tree.joblib"

df = pd.read_excel(DATASET_PATH)

features = [
    "Temperature",
    "Humidity",
    "Wind Speed",
    "UV Index",
    "Visibility (km)",
    "Weather Type"
]

target = "Risk Score"

df = df.dropna(subset=features + [target]).copy()

X = df[features].copy()
y = pd.to_numeric(df[target], errors="coerce")

valid = y.between(0, 100)
X = X.loc[valid].copy()
y = y.loc[valid].copy()

X["Weather Type"] = X["Weather Type"].astype(str).str.strip().str.title()

X = pd.get_dummies(
    X,
    columns=["Weather Type"],
    dtype=int
)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

model = DecisionTreeRegressor(
    max_depth=8,
    min_samples_leaf=10,
    random_state=42
)

model.fit(X_train, y_train)

y_pred = model.predict(X_test)
y_pred = np.clip(y_pred, 0, 100)

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print("Decision Tree Regression training completed!")
print("Total records:", len(df))
print("Training records:", len(X_train))
print("Testing records:", len(X_test))

print(f"\nMean Absolute Error (MAE): {mae:.2f}")
print(f"Root Mean Squared Error (RMSE): {rmse:.2f}")
print(f"R2 Score: {r2:.4f}")

model_data = {
    "model": model,
    "features": list(X.columns),
    "input_features": features,
    "risk_score_range": [0, 100],
    "risk_score_mapping": {
        "Low": [0, 24],
        "Moderate": [25, 49],
        "High": [50, 74],
        "Very High": [75, 100]
    }
}

joblib.dump(model_data, MODEL_PATH)

print("\nSaved regression model to:", MODEL_PATH)
