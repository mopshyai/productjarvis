const ROOT_DOMAIN = 'productjarvis.com';

export const SURFACES = {
  WWW: 'www',
  APP: 'app',
  AUTH: 'auth',
  ADMIN: 'admin',
  DOCS: 'docs',
  BLOG: 'blog',
  API: 'api',
  LOCAL: 'local',
};

const SURFACE_HOSTS = {
  [SURFACES.WWW]: `www.${ROOT_DOMAIN}`,
  [SURFACES.APP]: `app.${ROOT_DOMAIN}`,
  [SURFACES.AUTH]: `auth.${ROOT_DOMAIN}`,
  [SURFACES.ADMIN]: `admin.${ROOT_DOMAIN}`,
  [SURFACES.DOCS]: `docs.${ROOT_DOMAIN}`,
  [SURFACES.BLOG]: `blog.${ROOT_DOMAIN}`,
  [SURFACES.API]: `api.${ROOT_DOMAIN}`,
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function getWindowLocation() {
  if (typeof window === 'undefined') {
    return {
      hostname: 'localhost',
      origin: 'http://localhost:5173',
      protocol: 'http:',
    };
  }

  return window.location;
}

function normalizePath(path = '/') {
  const url = new URL(path, 'https://productjarvis.local');
  let pathname = url.pathname || '/';

  pathname = pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return `${pathname}${url.search}${url.hash}`;
}

function mapCanonicalPath(surface, path) {
  const normalized = normalizePath(path);
  const url = new URL(normalized, 'https://productjarvis.local');
  const pathname = url.pathname;

  switch (surface) {
    case SURFACES.APP:
      if (pathname === '/workspace') {
        url.pathname = '/';
      } else if (pathname.startsWith('/workspace/')) {
        url.pathname = pathname.slice('/workspace'.length);
      }
      return `${url.pathname}${url.search}${url.hash}`;

    case SURFACES.AUTH:
      if (pathname === '/auth') {
        url.pathname = '/';
      } else if (pathname.startsWith('/auth/')) {
        url.pathname = pathname.slice('/auth'.length);
      }
      return `${url.pathname}${url.search}${url.hash}`;

    case SURFACES.ADMIN:
      if (pathname === '/workspace/settings') {
        url.pathname = '/';
      } else if (pathname.startsWith('/workspace/settings/')) {
        url.pathname = pathname.slice('/workspace/settings'.length) || '/';
      }
      return `${url.pathname}${url.search}${url.hash}`;

    case SURFACES.DOCS:
      if (pathname === '/docs') {
        url.pathname = '/';
      } else if (pathname.startsWith('/docs/')) {
        url.pathname = pathname.slice('/docs'.length);
      }
      return `${url.pathname}${url.search}${url.hash}`;

    case SURFACES.BLOG:
      if (pathname === '/blog') {
        url.pathname = '/';
      } else if (pathname.startsWith('/blog/')) {
        url.pathname = pathname.slice('/blog'.length);
      }
      return `${url.pathname}${url.search}${url.hash}`;

    default:
      return normalized;
  }
}

function mapLocalPath(surface, path) {
  const normalized = mapCanonicalPath(surface, path);
  const url = new URL(normalized, 'https://productjarvis.local');
  const pathname = url.pathname;

  switch (surface) {
    case SURFACES.WWW:
      return `${pathname}${url.search}${url.hash}`;

    case SURFACES.APP:
      if (pathname === '/welcome') {
        return `${pathname}${url.search}${url.hash}`;
      }
      if (pathname === '/') {
        return `/workspace${url.search}${url.hash}`;
      }
      return `/workspace${pathname}${url.search}${url.hash}`;

    case SURFACES.AUTH:
      if (pathname === '/') {
        return `/auth${url.search}${url.hash}`;
      }
      return `/auth${pathname}${url.search}${url.hash}`;

    case SURFACES.ADMIN:
      if (pathname === '/') {
        return `/workspace/settings${url.search}${url.hash}`;
      }
      return `/workspace/settings${pathname}${url.search}${url.hash}`;

    case SURFACES.DOCS:
      if (pathname === '/api-docs' || pathname.startsWith('/api-docs/')) {
        return `${pathname}${url.search}${url.hash}`;
      }
      if (pathname === '/changelog') {
        return `${pathname}${url.search}${url.hash}`;
      }
      if (pathname === '/') {
        return `/docs${url.search}${url.hash}`;
      }
      return `/docs${pathname}${url.search}${url.hash}`;

    case SURFACES.BLOG:
      if (pathname === '/') {
        return `/blog${url.search}${url.hash}`;
      }
      return `/blog${pathname}${url.search}${url.hash}`;

    case SURFACES.API:
      return `${pathname}${url.search}${url.hash}`;

    default:
      return normalized;
  }
}

export function isLocalHost(hostname = getWindowLocation().hostname) {
  return LOCAL_HOSTNAMES.has(hostname);
}

export function getCurrentSurface(hostname = getWindowLocation().hostname) {
  if (isLocalHost(hostname)) {
    return SURFACES.LOCAL;
  }

  if (hostname === ROOT_DOMAIN || hostname === SURFACE_HOSTS[SURFACES.WWW]) {
    return SURFACES.WWW;
  }

  const matched = Object.entries(SURFACE_HOSTS).find(([, host]) => host === hostname);
  return matched?.[0] || SURFACES.WWW;
}

export function getSurfacePath(surface, path = '/', hostname = getWindowLocation().hostname) {
  if (isLocalHost(hostname)) {
    return mapLocalPath(surface, path);
  }

  return mapCanonicalPath(surface, path);
}

export function isSameSurfaceNavigation(surface, hostname = getWindowLocation().hostname) {
  return isLocalHost(hostname) || getCurrentSurface(hostname) === surface;
}

export function getSurfaceOrigin(surface, protocol = getWindowLocation().protocol) {
  if (surface === SURFACES.LOCAL) {
    return getWindowLocation().origin;
  }

  return `${protocol}//${SURFACE_HOSTS[surface]}`;
}

export function getDomainHref(surface, path = '/', hostname = getWindowLocation().hostname) {
  const routePath = getSurfacePath(surface, path, hostname);
  if (isSameSurfaceNavigation(surface, hostname)) {
    return routePath;
  }

  return `${getSurfaceOrigin(surface)}${routePath}`;
}

export function navigateToSurface(navigate, surface, path = '/', options = {}) {
  const href = getDomainHref(surface, path);

  if (isSameSurfaceNavigation(surface)) {
    navigate(href, options);
    return;
  }

  if (options.replace) {
    window.location.replace(href);
    return;
  }

  window.location.assign(href);
}

export function getApiBaseUrl() {
  const hostname = getWindowLocation().hostname;
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

  if (configuredBaseUrl) {
    const onProductJarvisHost = hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
    const pointsAtRawSupabase = configuredBaseUrl.includes('.supabase.co/functions/v1');
    const pointsAtCanonicalApiHost = configuredBaseUrl.includes(`api.${ROOT_DOMAIN}`);

    if (!isLocalHost(hostname) && onProductJarvisHost && (pointsAtRawSupabase || !pointsAtCanonicalApiHost)) {
      return hostname === SURFACE_HOSTS[SURFACES.API] ? '' : getSurfaceOrigin(SURFACES.API);
    }

    return configuredBaseUrl;
  }

  if (isLocalHost(hostname) || hostname === SURFACE_HOSTS[SURFACES.API]) {
    return '';
  }

  if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return getSurfaceOrigin(SURFACES.API);
  }

  return '';
}
