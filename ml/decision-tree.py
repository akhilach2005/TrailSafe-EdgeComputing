
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

features = ["Temperature(°C)", "Humidity(%)"]
target = "Risk Score"

df = df.dropna(subset=features + [target]).copy()

X = df[features].copy()
y = pd.to_numeric(df[target], errors="coerce")

valid = y.between(0, 100)
X = X.loc[valid]
y = y.loc[valid]

X = X.rename(columns={
    "Temperature(°C)": "Temperature",
    "Humidity(%)": "Humidity"
})

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

predictions = np.clip(model.predict(X_test), 0, 100)

print("Training completed!")
print("Total records:", len(df))
print("Training records:", len(X_train))
print("Testing records:", len(X_test))
print("MAE:", round(mean_absolute_error(y_test, predictions), 2))
print("RMSE:", round(np.sqrt(mean_squared_error(y_test, predictions)), 2))
print("R2:", round(r2_score(y_test, predictions), 4))

model_data = {
    "model": model,
    "features": ["Temperature", "Humidity"],
    "input_features": ["Temperature", "Humidity"],
    "risk_score_range": [0, 100]
}

joblib.dump(model_data, MODEL_PATH)

print("Saved replacement model to:", MODEL_PATH)
