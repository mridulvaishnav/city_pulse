import { useState, useCallback } from 'react';
import './App.css';
import { uploadFile, getAllIncidents, getIncidentStats } from './api';

function App() {
  const [view, setView] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    setProgressText('Starting upload...');
    setResult(null);
    setError(null);

    try {
      const response = await uploadFile(file, (percent, text) => {
        setProgress(percent);
        setProgressText(text);
      });
      
      setProgress(100);
      setProgressText('Processing complete');
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const loadIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const [incidentsData, statsData] = await Promise.all([
        getAllIncidents(),
        getIncidentStats()
      ]);
      setIncidents(incidentsData.incidents || []);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setError(null);
    if (newView === 'incidents') {
      loadIncidents();
    }
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">City<span>Pulse</span></div>
          <nav className="nav">
            <button 
              className={`nav-btn ${view === 'upload' ? 'active' : ''}`}
              onClick={() => handleViewChange('upload')}
            >
              Upload
            </button>
            <button 
              className={`nav-btn ${view === 'incidents' ? 'active' : ''}`}
              onClick={() => handleViewChange('incidents')}
            >
              Incidents
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {view === 'upload' && (
          <>
            <div className="upload-section">
              <div 
                className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'disabled' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && document.getElementById('file-input').click()}
              >
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="upload-title">
                  {uploading ? 'Processing...' : 'Drop file here or click to upload'}
                </p>
                <p className="upload-subtitle">Supports images and videos</p>
                <input 
                  id="file-input"
                  type="file" 
                  className="upload-input"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>

              {uploading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="progress-text">{progressText}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}

            {result && (
              <div className="results-section">
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-title">Analysis Result</span>
                    <span className={`status-badge ${result.incident?.status === 'auto_approved' ? 'approved' : 'review'}`}>
                      {result.incident?.status === 'auto_approved' ? 'Auto Approved' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="result-body">
                    <div className="result-grid">
                      <div className="result-item">
                        <div className="result-label">Incident Type</div>
                        <div className="result-value" style={{ textTransform: 'capitalize' }}>
                          {result.incident?.ai_decision?.incident_type || 'Unknown'}
                        </div>
                      </div>
                      <div className="result-item">
                        <div className="result-label">Severity</div>
                        <div className="result-value">
                          {((result.incident?.ai_decision?.severity || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="result-item">
                        <div className="result-label">Confidence</div>
                        <div className="result-value">
                          {((result.incident?.ai_decision?.confidence || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="result-item">
                        <div className="result-label">Location Hint</div>
                        <div className="result-value">
                          {result.incident?.ai_decision?.location_hint || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="result-item" style={{ marginTop: 16 }}>
                      <div className="result-label">Recommended Action</div>
                      <div className="result-value">
                        {result.incident?.ai_decision?.recommended_action || 'No action specified'}
                      </div>
                    </div>
                    {result.incident?.evidence?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div className="result-label" style={{ marginBottom: 8 }}>Evidence ({result.incident.evidence.length})</div>
                        <div className="evidence-list">
                          {result.incident.evidence.map((e, i) => (
                            <div key={i} className="evidence-item">
                              <span className="evidence-type">{e.type}</span>
                              <span className="evidence-confidence">{(e.confidence * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'incidents' && (
          <div className="incidents-section">
            <div className="section-header">
              <h2 className="section-title">Incidents</h2>
              <button className="refresh-btn" onClick={loadIncidents} disabled={loadingIncidents}>
                {loadingIncidents ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {stats && (
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.auto_approved}</div>
                  <div className="stat-label">Approved</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.needs_human_review}</div>
                  <div className="stat-label">Needs Review</div>
                </div>
              </div>
            )}

            {loadingIncidents ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">No incidents yet</p>
                <p className="empty-subtitle">Upload media to detect incidents</p>
              </div>
            ) : (
              <div className="incidents-list">
                {incidents.map((incident) => (
                  <div 
                    key={incident.incident_id} 
                    className="incident-card"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="incident-row">
                      <div className="incident-info">
                        <span className="incident-type">{incident.ai_decision?.incident_type || 'Unknown'}</span>
                        <span className="incident-meta">{formatDate(incident.timestamp)}</span>
                      </div>
                      <div className="incident-right">
                        <div className="confidence-bar">
                          <div 
                            className={`confidence-fill ${getConfidenceLevel(incident.ai_decision?.confidence || 0)}`}
                            style={{ width: `${(incident.ai_decision?.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className={`status-badge ${incident.status === 'auto_approved' ? 'approved' : 'review'}`}>
                          {incident.status === 'auto_approved' ? 'Approved' : 'Review'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Incident Details</span>
              <button className="modal-close" onClick={() => setSelectedIncident(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-title">AI Decision</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Type</div>
                    <div className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {selectedIncident.ai_decision?.incident_type}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Severity</div>
                    <div className="detail-value">
                      {((selectedIncident.ai_decision?.severity || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Confidence</div>
                    <div className="detail-value">
                      {((selectedIncident.ai_decision?.confidence || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Status</div>
                    <div className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {selectedIncident.status?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-title">Location & Action</div>
                <div className="detail-item">
                  <div className="detail-label">Location Hint</div>
                  <div className="detail-value">{selectedIncident.ai_decision?.location_hint || 'Unknown'}</div>
                </div>
                <div className="detail-item" style={{ marginTop: 12 }}>
                  <div className="detail-label">Recommended Action</div>
                  <div className="detail-value">{selectedIncident.ai_decision?.recommended_action}</div>
                </div>
              </div>

              {selectedIncident.evidence?.length > 0 && (
                <div className="detail-section">
                  <div className="detail-title">Evidence ({selectedIncident.evidence.length})</div>
                  <div className="evidence-list">
                    {selectedIncident.evidence.map((e, i) => (
                      <div key={i} className="evidence-item">
                        <div>
                          <span className="evidence-type">{e.type}</span>
                          {e.text && <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 13 }}>{e.text}</span>}
                        </div>
                        <span className="evidence-confidence">{(e.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <div className="detail-title">Metadata</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Incident ID</div>
                    <div className="detail-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                      {selectedIncident.incident_id}
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Timestamp</div>
                    <div className="detail-value">{formatDate(selectedIncident.timestamp)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
