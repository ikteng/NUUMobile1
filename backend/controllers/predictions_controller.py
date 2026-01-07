import os
from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from sklearn.metrics import confusion_matrix
from river import metrics
import joblib

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
predictions_bp = Blueprint("predictions", __name__)

# ------------------------------
# Target column
# ------------------------------
target = "Churn"

# ------------------------------
# Preprocess sheet function
# ------------------------------
def preprocess_sheet(df):
    df = df.copy()

    churn_cols = ["Chrn Flag", "Churn", "Churn Flag"]
    for col in churn_cols:
        if col in df.columns:
            df[target] = df[col]
            break

    for col in churn_cols:
        if col in df.columns and col != target:
            df.drop(columns=col, inplace=True)

    for date_col in ["active_date", "last_boot_date", "interval_date"]:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors="coerce")

    df["last boot - active"] = (
        (df["last_boot_date"] - df["active_date"]).dt.total_seconds() / (3600 * 24)
        if "last_boot_date" in df.columns and "active_date" in df.columns
        else 0
    )
    df["last boot - interval"] = (
        (df["last_boot_date"] - df["interval_date"]).dt.total_seconds() / (3600 * 24)
        if "interval_date" in df.columns and "last_boot_date" in df.columns
        else 0
    )

    if "sim_info" in df.columns:
        df["sim_info"] = df["sim_info"].apply(lambda x: "inserted" if x != "uninserted" else "uninserted")
    else:
        df["sim_info"] = "uninserted"
    df["sim_info"] = df["sim_info"].astype(str)

    for col in df.select_dtypes(include=np.number).columns:
        df[col] = df[col].fillna(0)

    if target not in df.columns:
        df[target] = 0 

    df[target] = df[target].fillna(0).astype(int)

    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str)

    return df

# ------------------------------
# Load model & preprocessors
# ------------------------------
model_dir = os.path.join(os.getcwd(), "backend", "models")
model = joblib.load(os.path.join(model_dir, "churn_model_river.joblib"))
numeric_pipeline = joblib.load(os.path.join(model_dir, "numeric_pipeline_river.joblib"))
categorical_pipeline = joblib.load(os.path.join(model_dir, "categorical_pipeline_river.joblib"))

# ------------------------------
# API route to predict a single sheet
# ------------------------------
@predictions_bp.route("/predict_churn/<file>/<sheet>", methods=["GET"])
def get_predictions(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    print("Looking for file at:", filepath)
    if not os.path.exists(filepath):
        return jsonify({"error": f"File not found at {filepath}"}), 404

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)
        df = preprocess_sheet(df)

        # Determine numeric & categorical features
        numeric_features = df.select_dtypes(include=np.number).columns.tolist()
        categorical_features = df.select_dtypes(include="object").columns.tolist()
        if target in numeric_features:
            numeric_features.remove(target)
        if target in categorical_features:
            categorical_features.remove(target)

        # ------------------------------
        # Preprocess row
        # ------------------------------
        def preprocess_row(row):
            row_dict = row.to_dict()
            x_num = {k: row_dict[k] for k in numeric_features if k in row_dict}
            x_cat = {k: row_dict[k] for k in categorical_features if k in row_dict}
            x_num = numeric_pipeline.transform_one(x_num)
            x_cat = categorical_pipeline.transform_one(x_cat)
            return {**x_num, **x_cat}

        # ------------------------------
        # Predict
        # ------------------------------
        y_proba = []
        y_pred = []
        for _, row in df.iterrows():
            row_dict = preprocess_row(row)
            prob = model.predict_proba_one(row_dict)
            p1 = prob.get(1, 0)
            label = 1 if p1 >= 0.5 else 0
            y_proba.append(p1)
            y_pred.append(label)

        df["Churn Prediction Probability"] = y_proba
        df["Churn Prediction"] = y_pred

        # Optional: evaluate
        acc_metric = metrics.Accuracy()
        for true, pred in zip(df[target], y_pred):
            acc_metric.update(true, pred)

        return jsonify({
            "columns": list(df.columns),
            "preview": df.astype(str).to_dict(orient="records"),
            "accuracy": acc_metric.get()
        })
    except Exception as e:
        import traceback
        print("Error in prediction:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
