import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import './PRDStreamingView.css';

const STAGES = [
  { id: 'context', label: 'Loading product context' },
  { id: 'signals', label: 'Scanning user signals' },
  { id: 'structure', label: 'Structuring PRD outline' },
  { id: 'writing', label: 'Writing sections' },
  { id: 'review', label: 'Running quality check' },
];

const PRDStreamingView = ({ featureRequest, simulateDuration = 4000 }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [streamedText, setStreamedText] = useState('');
  const [done] = useState(false);
  const textRef = useRef(null);

  // Stage progression
  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev < STAGES.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, simulateDuration / STAGES.length);
    return () => clearInterval(interval);
  }, [done, simulateDuration]);

  // Simulate streaming text
  useEffect(() => {
    if (done) return;
    const chunks = [
      `## PRD: ${featureRequest}\n\n`,
      `**Problem Statement**\n`,
      `Analyzing user needs and market signals...\n\n`,
      `**User Stories**\n`,
      `Mapping job-to-be-done patterns...\n\n`,
      `**Acceptance Criteria**\n`,
      `Applying methodology constraints...\n\n`,
      `**Dependencies**\n`,
      `Cross-referencing sprint context...\n`,
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < chunks.length) {
        setStreamedText((prev) => prev + chunks[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, simulateDuration / (chunks.length + 1));
    return () => clearInterval(interval);
  }, [featureRequest, done, simulateDuration]);

  // Auto-scroll streamed text
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamedText]);

  return (
    <div className="streaming-view">
      <div className="streaming-header">
        <Sparkles size={18} className="streaming-sparkle" />
        <span>Jarvis is thinking</span>
        <span className="streaming-dots">
          <span /><span /><span />
        </span>
      </div>

      <div className="streaming-stages">
        {STAGES.map((stage, i) => (
          <div
            key={stage.id}
            className={`stage-pill ${i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending'}`}
          >
            {i < stageIndex ? '✓ ' : ''}{stage.label}
          </div>
        ))}
      </div>

      <div className="streaming-text-wrap" ref={textRef}>
        <pre className="streaming-text">
          {streamedText}
          {!done && <span className="streaming-cursor" />}
        </pre>
      </div>
    </div>
  );
};

export default PRDStreamingView;
