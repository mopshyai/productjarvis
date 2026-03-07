import React from 'react';
import './SourceCitation.css';

const SourceCitation = ({ citations = [] }) => {
  if (!citations.length) {
    return (
      <div className="citation-block">
        <div className="citation-header">Sources</div>
        <div className="citation-item low-confidence">No source found</div>
      </div>
    );
  }

  return (
    <div className="citation-block">
      <div className="citation-header">Sources</div>
      {citations.map((citation, idx) => (
        <div key={`${citation.id || 'source'}_${idx}`} className={`citation-item ${citation.confidence < 0.5 ? 'low-confidence' : ''}`}>
          <span className="citation-type">{citation.source_type || 'system'}</span>
          <span className="citation-text">{citation.excerpt || 'No source found'}</span>
          {citation.source_url ? (
            <a href={citation.source_url} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : (
            <span className="missing-source">No source found</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default SourceCitation;
