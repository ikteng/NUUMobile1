import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { DashboardApi } from "../../api/DashboardApi";
import "./DistributionVsChurn.css";

export default function DistributionVsChurn({ selectedFile, selectedSheet }) {
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all columns for dropdown
  useEffect(() => {
    if (!selectedFile || !selectedSheet) return;

    DashboardApi.getAllColumns(selectedFile, selectedSheet)
      .then(setColumns)
      .catch(() => setColumns([]));

    setSelectedColumn("");
    setPlotData(null);
    setError("");
  }, [selectedFile, selectedSheet]);

  // Fetch plot for selected column
  useEffect(() => {
    if (!selectedColumn) return;

    const fetchDistribution = async () => {
      setLoading(true);
      setError("");
      setPlotData(null);

      try {
        const data = await DashboardApi.getDistributionVsChurn(
          selectedFile,
          selectedSheet,
          selectedColumn
        );

        if (data.error || data.message) {
          setError(data.error || data.message);
          return;
        }

        setPlotData(data.plotly_json);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch distribution vs Churn.");
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [selectedColumn, selectedFile, selectedSheet]);

  return (
    <div className="distribution-container">
      <h3>Distribution vs Churn</h3>

      <div className="chart-header">
        <select
          className="dropdown"
          value={selectedColumn}
          onChange={(e) => setSelectedColumn(e.target.value)}
        >
          <option value="">-- Select a Column --</option>
          {columns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      {loading && <p>Loading chart...</p>}
      {error && <p className="error-message">{error}</p>}

      {plotData && (
        <Plot
          data={plotData.data}
          layout={plotData.layout}
          config={{ responsive: true }}
          style={{ width: "100%", height: "500px" }}
        />
      )}
    </div>
  );
}
