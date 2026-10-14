import React, { useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  containerClassName?: string;
}

export function Image({ src, alt, className, fallbackText = 'Image not available', containerClassName = '', ...props }: ImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setHasError(false);
    if (src) setIsLoading(true);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 ${containerClassName} ${className}`}>
        <ImageOff className="w-6 h-6 mb-1 opacity-50" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500 opacity-50" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        {...props}
      />
    </div>
  );
}
