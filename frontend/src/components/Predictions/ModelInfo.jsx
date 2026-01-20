import React, { useEffect, useState } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import "./ModelInfo.css";

export default function ModelInfo() {
    const [featureImportance, setFeatureImportance] = useState([]);
    const [trainingMetrics, setTrainingMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchModelInfo();
    }, []);

    const fetchModelInfo = async () => {
        setLoading(true);
        setError("");

        try {
            const [fiResponse, metricsResponse] = await Promise.all([
                PredictionsApi.getFeatureImportance(),
                PredictionsApi.getTrainingMetrics()
            ]);

            // Feature importance always exists
            setFeatureImportance(fiResponse.features || []);

            // Training metrics may return { error: "..."} if missing
            if (metricsResponse.error) {
                setTrainingMetrics({ error: metricsResponse.error });
            } else {
                setTrainingMetrics(metricsResponse);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load model information");
            setFeatureImportance([]);
            setTrainingMetrics(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Loading model info...</p>;
    if (error) return <p className="model-error">{error}</p>;

    return (
        <div className="model-info-container">
            <h2>Model Information</h2>

            {/* ---------------- Feature Importance ---------------- */}
            <div className="model-section">
                <h3>Feature Importance</h3>

                {featureImportance.length === 0 ? (
                    <p>No feature importance data available.</p>
                ) : (
                    featureImportance.map((item) => (
                        <div key={item.feature} className="feature-row">
                            <span className="feature-name">{item.feature}</span>

                            <div className="feature-bar-wrapper">
                                <div
                                    className="feature-bar"
                                    style={{ width: `${item.importance || 0}%` }}
                                />
                            </div>

                            <span className="feature-percent">
                                {typeof item.importance === "number" 
                                    ? item.importance.toFixed(1) 
                                    : "N/A"}%
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* ---------------- Training Metrics ---------------- */}
            <div className="model-section">
                <h3>Training Performance</h3>

                {trainingMetrics?.error ? (
                    <p className="model-error">{trainingMetrics.error}</p>
                ) : trainingMetrics ? (
                    <>
                    {/* ROC AUC */}
                    <p><strong>ROC-AUC Score:</strong> {trainingMetrics.roc_auc.toFixed(3)}</p>

                    {/* Confusion Matrix */}
                    <h4>Confusion Matrix</h4>
                    <div className="table-scroll">
                        <table className="confusion-matrix">
                            <thead>
                            <tr>
                                <th></th>
                                <th>Predicted 0</th>
                                <th>Predicted 1</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <th>Actual 0</th>
                                <td>{trainingMetrics.confusion_matrix[0][0]}</td>
                                <td>{trainingMetrics.confusion_matrix[0][1]}</td>
                            </tr>
                            <tr>
                                <th>Actual 1</th>
                                <td>{trainingMetrics.confusion_matrix[1][0]}</td>
                                <td>{trainingMetrics.confusion_matrix[1][1]}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Classification Report */}
                    <h4>Classification Report</h4>
                        <div className="table-scroll">
                            <table className="classification-report">

                                <thead>
                                <tr>
                                    <th>Class</th>
                                    <th>Precision</th>
                                    <th>Recall</th>
                                    <th>F1-Score</th>
                                    <th>Support</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.keys(trainingMetrics.classification_report)
                                    .filter(k => !["accuracy","macro avg","weighted avg"].includes(k))
                                    .map(k => (
                                    <tr key={k}>
                                        <td>{k}</td>
                                        <td>{trainingMetrics.classification_report[k].precision.toFixed(3)}</td>
                                        <td>{trainingMetrics.classification_report[k].recall.toFixed(3)}</td>
                                        <td>{trainingMetrics.classification_report[k]["f1-score"].toFixed(3)}</td>
                                        <td>{trainingMetrics.classification_report[k].support}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <p>No training metrics available.</p>
                )}
            </div>
            
        </div>
    );
}
