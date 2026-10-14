import React, { useRef } from 'react';

export const ModernOtpInput = ({ value, onChange, error }: { value: string, onChange: (val: string) => void, error?: string }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return;

    const newVal = value.split('');
    newVal[index] = val.substring(val.length - 1);
    const result = newVal.join('').slice(0, 6);
    onChange(result);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      } else {
        const newVal = value.split('');
        newVal[index] = '';
        onChange(newVal.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      inputs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex gap-2 sm:gap-3 justify-center md:justify-between w-full">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            ref={(el) => { inputs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:border-primary-500 focus:ring-primary-500/20'} bg-white dark:bg-[#151726] text-slate-900 dark:text-white focus:ring-2 transition-all shadow-sm outline-none placeholder-slate-300 dark:placeholder-slate-700`}
            placeholder="-"
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500 font-semibold text-center">{error}</p>}
    </div>
  );
};
