
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).parent
INPUT_FILE = BASE_DIR / "AeroSense Device 2.xlsx"
OUTPUT_FILE = BASE_DIR / "dataset_with_risk_score.xlsx"

df = pd.read_excel(INPUT_FILE)

features = ["Temperature(°C)", "Humidity(%)"]

for col in features:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna(subset=features).copy()

df = df[
    df["Humidity(%)"].between(0, 100)
].copy()

temperature = df["Temperature(°C)"].to_numpy()
humidity = df["Humidity(%)"].to_numpy()

temperature_score = np.interp(
    temperature,
    [-10, 0, 5, 10, 20, 28, 32, 35, 40, 45],
    [25, 20, 15, 8, 0, 3, 8, 15, 20, 25]
)

humidity_score = np.interp(
    humidity,
    [0, 50, 60, 70, 80, 90, 100],
    [0, 0, 1, 3, 6, 8, 10]
)

df["Risk Score"] = np.round(
    np.clip((temperature_score + humidity_score) / 35 * 100, 0, 100),
    2
)

df["Risk Label"] = pd.cut(
    df["Risk Score"],
    bins=[-0.01, 24, 49, 74, 100],
    labels=["Low", "Moderate", "High", "Very High"]
).astype(str)

df.to_excel(OUTPUT_FILE, index=False)

print("Risk scores generated successfully!")
print("Valid records:", len(df))
print("\nRisk score statistics:")
print(df["Risk Score"].describe())
print("\nRisk category counts:")
print(df["Risk Label"].value_counts())
print("\nSaved to:", OUTPUT_FILE)
