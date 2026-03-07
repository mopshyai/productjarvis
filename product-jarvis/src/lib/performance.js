/**
 * Performance monitoring utilities
 */

// Report Web Vitals to analytics
export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}

// Prefetch route chunks on hover for faster navigation
export function prefetchRoute(routePath) {
  const routes = {
    '/workspace': () => import('../components/Dashboard'),
    '/workspace/prds': () => import('../components/PRDGenerator'),
    '/workspace/decisions': () => import('../components/DecisionMemory'),
    '/workspace/digest': () => import('../components/DailyDigest'),
    '/workspace/opportunities': () => import('../components/EvidenceOpportunities'),
    '/workspace/command': () => import('../components/CommandBar'),
  };

  if (routes[routePath]) {
    routes[routePath]();
  }
}

export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
