import os
import pandas as pd
import numpy as np
from sklearn.metrics import confusion_matrix
from river import metrics
import joblib

# ------------------------------
# Target column
# ------------------------------
target = 'Churn'

# ------------------------------
# Preprocess sheet function
# ------------------------------
def preprocess_sheet(df):
    df = df.copy()

    churn_cols = ['Chrn Flag', 'Churn', 'Churn Flag']
    for col in churn_cols:
        if col in df.columns:
            df[target] = df[col]
            break
    for col in churn_cols:
        if col in df.columns and col != target:
            df.drop(columns=col, inplace=True)

    for date_col in ['active_date', 'last_boot_date', 'interval_date']:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

    df['last boot - active'] = ((df['last_boot_date'] - df['active_date']).dt.total_seconds() / (3600*24)
                                if 'last_boot_date' in df.columns and 'active_date' in df.columns else 0)
    df['last boot - interval'] = ((df['last_boot_date'] - df['interval_date']).dt.total_seconds() / (3600*24)
                                  if 'interval_date' in df.columns and 'last_boot_date' in df.columns else 0)

    if 'sim_info' in df.columns:
        df['sim_info'] = df['sim_info'].apply(lambda x: 'inserted' if x != 'uninserted' else 'uninserted')
    else:
        df['sim_info'] = 'uninserted'
    df['sim_info'] = df['sim_info'].astype(str)

    for col in df.select_dtypes(include=np.number).columns:
        df[col] = df[col].fillna(0)

    df[target] = df[target].fillna(0).astype(int)

    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].astype(str)

    return df

# ------------------------------
# Load model and preprocessors
# ------------------------------
model_dir = os.path.join(os.getcwd(), "backend", "models")
model = joblib.load(os.path.join(model_dir, "churn_model_river.joblib"))
numeric_pipeline = joblib.load(os.path.join(model_dir, "numeric_pipeline_river.joblib"))
categorical_pipeline = joblib.load(os.path.join(model_dir, "categorical_pipeline_river.joblib"))

# ------------------------------
# Load sheets to predict
# ------------------------------
uw_path = "backend/userfiles/UW_Churn_Pred_Data.xls"
sheets_with_churn = ["N10", "B30 Pro", "Data Before Feb 13"]  # Include all sheets you want
dfs = {s: preprocess_sheet(pd.read_excel(uw_path, sheet_name=s)) for s in sheets_with_churn}

# ------------------------------
# Identify numeric and categorical features
# ------------------------------
sample_df = pd.concat(dfs.values(), ignore_index=True)
numeric_features = sample_df.select_dtypes(include=np.number).columns.tolist()
categorical_features = sample_df.select_dtypes(include='object').columns.tolist()
if target in numeric_features: numeric_features.remove(target)
if target in categorical_features: categorical_features.remove(target)

# ------------------------------
# Preprocess a row for prediction
# ------------------------------
def preprocess_row(row):
    row_dict = row.to_dict()
    x_num = {k: row_dict[k] for k in numeric_features if k in row_dict}
    x_cat = {k: row_dict[k] for k in categorical_features if k in row_dict}
    x_num = numeric_pipeline.transform_one(x_num)
    x_cat = categorical_pipeline.transform_one(x_cat)
    return {**x_num, **x_cat}

# ------------------------------
# Predict function for a dataframe
# ------------------------------
def predict_df(df, model):
    y_proba = []
    y_pred = []

    for _, row in df.iterrows():
        row_dict = preprocess_row(row)
        prob = model.predict_proba_one(row_dict)  # returns {0: p0, 1: p1}
        p1 = prob.get(1, 0)
        label = 1 if p1 >= 0.5 else 0

        y_proba.append(p1)
        y_pred.append(label)

    return y_proba, y_pred

# ------------------------------
# Predict all sheets
# ------------------------------
for sheet_name, df in dfs.items():
    y_proba, y_pred = predict_df(df, model)
    df['Churn Prediction Probability'] = y_proba
    df['Churn Prediction'] = y_pred

    # Evaluate
    cm = confusion_matrix(df[target], y_pred)
    acc = metrics.Accuracy()
    for true, pred in zip(df[target], y_pred):
        acc.update(true, pred)

    print(f"\nSheet: {sheet_name}")
    print(f"Confusion Matrix:\n{cm}")
    print(f"Accuracy: {acc.get():.4f}")