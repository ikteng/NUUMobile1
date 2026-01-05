import React, { useState, useEffect, useRef } from "react";
import { DashboardApi } from "../../api/DashboardApi";
import "./DataPreview.css";

export default function DataPreview({ selectedFile, selectedSheet }) {
    const [previewData, setPreviewData] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchActive, setSearchActive] = useState(false);

    const loaderRef = useRef(null);

    // Fetch a page of normal data
    const fetchPage = async (pageNumber) => {
        pageNumber === 1 ? setInitialLoading(true) : setLoading(true);
        try {
            const data = await DashboardApi.getSheetData(selectedFile, selectedSheet, pageNumber, pageSize);
            setPreviewColumns(data.columns);
            setPreviewData((prev) => (pageNumber === 1 ? data.preview : [...prev, ...data.preview]));
            setTotalPages(data.total_pages);
        } catch (err) {
            console.error("Error fetching preview:", err);
        } finally {
            pageNumber === 1 ? setInitialLoading(false) : setLoading(false);
        }
    };

    // Fetch a page of search results
    const fetchSearchPage = async (pageNumber) => {
        pageNumber === 1 ? setInitialLoading(true) : setLoading(true);
        try {
            const data = await DashboardApi.getSheetDataBySearch(
                selectedFile,
                selectedSheet,
                searchTerm,
                pageNumber,
                pageSize
            );
            setPreviewColumns(data.columns);
            setPreviewData((prev) => (pageNumber === 1 ? data.preview : [...prev, ...data.preview]));
            setTotalPages(data.total_pages);
        } catch (err) {
            console.error("Error fetching search results:", err);
            if (pageNumber === 1) setPreviewData([]);
        } finally {
            pageNumber === 1 ? setInitialLoading(false) : setLoading(false);
        }
    };

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        setSearchActive(true);
        setPreviewData([]);
        setPage(1);
        fetchSearchPage(1);
    };

    const clearSearch = () => {
        setSearchTerm("");
        setSearchActive(false);
        setPreviewData([]);
        setPage(1);
    };

    // If searchTerm becomes empty, switch back to normal data
    useEffect(() => {
        if (!searchTerm && searchActive) {
            // search bar cleared
            setSearchActive(false);
            setPreviewData([]);
            setPage(1);
        }
    }, [searchTerm, searchActive]);

    // Initial load when file/sheet changes
    useEffect(() => {
        if (!selectedFile || !selectedSheet) return;
        setPreviewData([]);
        setPage(1);
        searchActive ? fetchSearchPage(1) : fetchPage(1);
    }, [selectedFile, selectedSheet, searchActive]);

    // Infinite scroll observer
    useEffect(() => {
        if (!loaderRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && page < totalPages && !loading) {
                    setPage((prev) => prev + 1);
                }
            },
            { root: null, rootMargin: "100px", threshold: 0.1 }
        );

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [loaderRef, page, totalPages, loading]);

    // Fetch next page whenever `page` changes
    useEffect(() => {
        if (page === 1) return; // already fetched in initial load
        searchActive ? fetchSearchPage(page) : fetchPage(page);
    }, [page]);

    if (!selectedFile || !selectedSheet) return null;

    return (
        <div className="data-preview-container">
            <h2>Data Preview</h2>

            <div className="data-preview-header">
                <p>
                    Showing preview for <strong>{selectedFile}</strong>, sheet <strong>{selectedSheet}</strong>.
                </p>

                <div className="preview-search-wrapper">
                    <div className="search-input-container">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="preview-search-bar"
                        />
                    </div>
                    <button
                        className="preview-search-button"
                        onClick={handleSearch}
                        disabled={!searchTerm.trim()}
                    >
                        Search
                    </button>
                </div>
            </div>

            {initialLoading ? (
                <p>Loading data...</p>
            ) : previewData.length === 0 ? (
                <p>No data found</p>
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

                    <div ref={loaderRef} style={{ height: "1px" }}></div>
                    {loading && <p>Loading more rows...</p>}
                </div>
            )}
        </div>
    );
}
