import React, { useState, useEffect } from "react";
import { PredictionsApi } from "../../api/PredictionsApi";
import "./PredictionsPreview.css";

export default function PredictionsPreview({ selectedFile, selectedSheet }) {
    const [previewData, setPreviewData] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchActive, setSearchActive] = useState(false);

    // Fetch all predictions
    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const data = await PredictionsApi.getPredictions(selectedFile, selectedSheet);

            const preview = data.preview || [];
            const columns =
                data.columns || (preview.length > 0 ? Object.keys(preview[0]) : []);

            setPreviewData(preview);
            setPreviewColumns(columns);
        } catch (err) {
            console.error("Error fetching predictions:", err);
            setPreviewData([]);
            setPreviewColumns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        setSearchActive(true);
        fetchPredictions();
    };

    useEffect(() => {
        if (!selectedFile || !selectedSheet) return;
        setSearchActive(false);
        setSearchTerm("");
        fetchPredictions();
    }, [selectedFile, selectedSheet]);

    useEffect(() => {
        if (!searchTerm && searchActive) {
            // search bar cleared
            setSearchActive(false);
            fetchPredictions();
        }
    }, [searchTerm]);

    if (!selectedFile || !selectedSheet) return null;

    return (
        <div className="predictions-preview-container">
            <h2>Predictions Preview</h2>

            <div className="predictions-preview-header">
                <p>
                    Showing predictions for <strong>{selectedFile}</strong>, sheet{" "}
                    <strong>{selectedSheet}</strong>.
                </p>

                <div className="preview-search-wrapper">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="preview-search-bar"
                    />
                    <button
                        className="preview-search-button"
                        onClick={handleSearch}
                        disabled={!searchTerm.trim()}
                    >
                        Search
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Loading predictions...</p>
            ) : previewData.length === 0 ? (
                <p>No predictions found</p>
            ) : (
                <div className="preview-table-container">
                    <table className="preview-table">
                        <thead>
                            <tr>
                                {previewColumns.map((col, idx) => (
                                    <th key={idx}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {previewData.map((row, idx) => (
                                <tr key={idx}>
                                    {previewColumns.map((col, i) => (
                                        <td key={i}>{row[col]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
