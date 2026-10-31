
from pathlib import Path
import numpy as np
import pandas as pd

INPUT_FILE = Path(__file__).parent / "dataset.csv"
OUTPUT_FILE = Path(__file__).parent / "dataset_with_risk_score.xlsx"

if not INPUT_FILE.exists():
    raise FileNotFoundError(f"Dataset not found: {INPUT_FILE}")

df = pd.read_csv(INPUT_FILE)

required_columns = [
    "Temperature",
    "Humidity",
    "Wind Speed",
    "UV Index",
    "Visibility (km)",
    "Weather Type"
]

missing_columns = [
    col for col in required_columns
    if col not in df.columns
]

if missing_columns:
    raise ValueError(f"Missing columns: {missing_columns}")

numeric_columns = [
    "Temperature",
    "Humidity",
    "Wind Speed",
    "UV Index",
    "Visibility (km)"
]

for col in numeric_columns:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df["Weather Type"] = (
    df["Weather Type"]
    .astype("string")
    .str.strip()
    .str.title()
)

df = df.dropna(subset=required_columns).copy()

df = df[
    df["Humidity"].between(0, 100)
    & df["Wind Speed"].ge(0)
    & df["UV Index"].ge(0)
    & df["Visibility (km)"].ge(0)
]

valid_weather_types = ["Sunny", "Cloudy", "Rainy", "Snowy"]

df = df[df["Weather Type"].isin(valid_weather_types)].copy()

if df.empty:
    raise ValueError("No valid dataset rows remain after cleaning.")

temperature = df["Temperature"].to_numpy()
wind = df["Wind Speed"].to_numpy()
humidity = df["Humidity"].to_numpy()
uv = df["UV Index"].to_numpy()
visibility = df["Visibility (km)"].to_numpy()

temperature_score = np.interp(
    temperature,
    [-10, 0, 5, 10, 20, 28, 32, 35, 40, 45],
    [25, 20, 15, 8, 0, 3, 8, 15, 20, 25]
)

wind_score = np.interp(
    wind,
    [0, 10, 20, 30, 40, 50, 60, 80],
    [0, 1, 5, 10, 15, 20, 23, 25]
)

humidity_score = np.interp(
    humidity,
    [0, 50, 60, 70, 80, 90, 100],
    [0, 0, 1, 3, 6, 8, 10]
)

uv_score = np.interp(
    uv,
    [0, 2, 3, 5, 7, 9, 11],
    [0, 0, 2, 5, 9, 12, 15]
)

visibility_score = np.interp(
    visibility,
    [0, 1, 2, 3, 5, 8, 10, 20],
    [15, 14, 12, 10, 6, 2, 0, 0]
)

weather_score = df["Weather Type"].map({
    "Sunny": 0,
    "Cloudy": 2,
    "Rainy": 10,
    "Snowy": 15
}).to_numpy()

total_score = (
    temperature_score
    + wind_score
    + humidity_score
    + uv_score
    + visibility_score
    + weather_score
)

df["Risk Score"] = np.round(
    np.clip(total_score, 0, 100), 2
)

df["Risk Label"] = pd.cut(
    df["Risk Score"],
    bins=[-0.01, 24, 49, 74, 100],
    labels=["Low", "Moderate", "High", "Very High"]
).astype(str)

df.to_excel(OUTPUT_FILE, index=False)

print("Risk scores generated successfully!")
print("Total valid records:", len(df))

print("\nRisk score statistics:")
print(df["Risk Score"].describe())

print("\nRisk category counts:")
print(df["Risk Label"].value_counts())

print("\nSaved to:", OUTPUT_FILE)
