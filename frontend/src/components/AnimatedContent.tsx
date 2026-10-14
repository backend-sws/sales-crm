import React from 'react';

interface AnimatedContentProps {
  isLoading: boolean;
  children: React.ReactNode;
}

/**
 * Wraps children with a fade‑light animation that re‑triggers when `isLoading`
 * changes. Useful for showing a smooth entrance after data has loaded.
 */
export const AnimatedContent: React.FC<AnimatedContentProps> = ({ isLoading, children }) => {
  return (
    <div key={String(isLoading)} data-enter className="animate-in fade-light page-enter">
      {children}
    </div>
  );
};
