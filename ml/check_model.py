
import joblib

data = joblib.load("decision_tree.joblib")

print("Stored keys:")
print(data.keys())

print("\nEncoded model features:")
print(data.get("features", "Not found"))

print("\nInput features:")
print(data.get("input_features", "Not saved in this model"))

print("\nModel classes:")
print(data["model"].classes_)
