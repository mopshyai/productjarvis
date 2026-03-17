import React from 'react';
import { Link } from 'react-router-dom';
import { getDomainHref, isSameSurfaceNavigation } from '../lib/domainRoutes';

const DomainLink = ({ surface, path = '/', children, ...props }) => {
  const href = getDomainHref(surface, path);

  if (isSameSurfaceNavigation(surface)) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
};

export default DomainLink;
