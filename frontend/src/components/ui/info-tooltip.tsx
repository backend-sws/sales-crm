import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isTopHalf, setIsTopHalf] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const showBelow = rect.top < 60;
      setIsTopHalf(!showBelow);
      setPosition({
        top: showBelow ? rect.bottom + 8 : rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setVisible(true);
  };

  return (
    <div 
      className="relative flex items-center group ml-1" 
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500 transition-colors cursor-help" />
      
      {visible && createPortal(
        <div 
          className="fixed z-[9999] w-max max-w-[220px] px-3 py-2 bg-primary-500 text-white text-[11px] rounded-lg shadow-xl text-center leading-relaxed whitespace-normal font-medium tracking-wide animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: isTopHalf ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {text}
          {isTopHalf ? (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary-500" />
          ) : (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-primary-500" />
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
