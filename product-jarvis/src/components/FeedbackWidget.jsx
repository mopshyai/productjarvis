import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, ThumbsUp, Bug, Lightbulb } from 'lucide-react';
import { trackEvent } from '../lib/posthog';
import './FeedbackWidget.css';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState(null);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      trackEvent('feedback_submitted', { type, page: window.location.pathname });
      // In mock mode, just log it; real mode would POST to /api/feedback
      console.info('[Feedback]', { type, message, page: window.location.pathname });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setType(null);
        setMessage('');
      }, 2000);
    } catch (err) {
      console.error('Feedback error:', err);
    } finally {
      setLoading(false);
    }
  };

  const open = () => { setIsOpen(true); trackEvent('feedback_opened'); };

  return (
    <>
      <button className="feedback-trigger" onClick={open} aria-label="Send feedback">
        <MessageSquarePlus size={20} />
      </button>

      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="feedback-close" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>

            {submitted ? (
              <div className="feedback-success">
                <ThumbsUp size={40} />
                <h3>Thanks for your feedback!</h3>
                <p>We read every submission.</p>
              </div>
            ) : (
              <>
                <h3 className="feedback-title">Send Feedback</h3>
                <p className="feedback-subtitle">Help us improve ProductJarvis</p>

                {!type ? (
                  <div className="feedback-types">
                    <button onClick={() => setType('bug')}>
                      <Bug size={22} />
                      <span>Bug Report</span>
                    </button>
                    <button onClick={() => setType('idea')}>
                      <Lightbulb size={22} />
                      <span>Feature Idea</span>
                    </button>
                    <button onClick={() => setType('feedback')}>
                      <MessageSquarePlus size={22} />
                      <span>General</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="feedback-type-badge">
                      {type === 'bug' && <><Bug size={13} /> Bug Report</>}
                      {type === 'idea' && <><Lightbulb size={13} /> Feature Idea</>}
                      {type === 'feedback' && <><MessageSquarePlus size={13} /> Feedback</>}
                      <button onClick={() => setType(null)}>Change</button>
                    </div>
                    <textarea
                      className="feedback-input"
                      placeholder={
                        type === 'bug' ? 'What happened? What did you expect?' :
                        type === 'idea' ? 'Describe your idea...' :
                        'Tell us what you think...'
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      autoFocus
                    />
                    <button
                      className="feedback-submit"
                      onClick={handleSubmit}
                      disabled={!message.trim() || loading}
                    >
                      {loading ? 'Sending...' : <><Send size={15} /> Send</>}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
