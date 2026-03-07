import React from 'react';
import './Skeleton.css';

export function Skeleton({ width, height, variant = 'rectangular', className = '', style = {} }) {
  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width: width || '100%', height: height || '1rem', ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
          className="skeleton-text__line"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton height="1.25rem" width="40%" style={{ marginBottom: '0.75rem' }} />
      <SkeletonText lines={2} />
    </div>
  );
}
