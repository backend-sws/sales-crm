import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageWrapperProps {
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * PageWrapper
 * -----------
 * Wraps page content so a smooth fade‑in plays:
 *  - Every time the route changes (via useLocation key).
 *  - Every time `isLoading` flips from true → false (skeleton → real content).
 *
 * Usage:
 *   <PageWrapper isLoading={isLoading}>
 *     {/* real content here *\/}
 *   </PageWrapper>
 */
export function PageWrapper({ isLoading = false, children, className = '' }: PageWrapperProps) {
  // Track how many times loading has finished so the key changes on every load‑complete.
  const loadCountRef = useRef(0);
  const prevLoadingRef = useRef(isLoading);

  if (prevLoadingRef.current === true && isLoading === false) {
    loadCountRef.current += 1;
  }
  prevLoadingRef.current = isLoading;

  const location = useLocation();
  // Key changes both on route change AND on each load completion.
  const key = `${location.pathname}__${loadCountRef.current}`;

  return (
    <div key={key} className={`page-enter ${className}`}>
      {children}
    </div>
  );
}
