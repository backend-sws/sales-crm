import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileCheck,
  PenTool,
  Type,
  ShieldCheck,
  X,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import type { ClientDocumentItem } from '@/api/clients.api';
import { clientsApi } from '@/api/clients.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ESignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ClientDocumentItem | null;
  onSuccess: (doc: ClientDocumentItem) => void;
}

export const ESignDocumentModal: React.FC<ESignDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'draw' | 'type'>('type');
  const [signerName, setSignerName] = useState('');
  const [signing, setSigning] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (document) {
      setSignerName(document.signer_name || '');
      setHasDrawn(false);
      setConsentGiven(false);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Canvas pointer handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1E3A8A'; // Blue signature ink
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      toast.error('Please enter your full legal name.');
      return;
    }
    if (!consentGiven) {
      toast.error('Please check the legal consent box to proceed.');
      return;
    }

    try {
      setSigning(true);
      let signatureDataUrl: string | undefined = undefined;

      if (mode === 'draw' && canvasRef.current && hasDrawn) {
        signatureDataUrl = canvasRef.current.toDataURL('image/png');
      } else {
        // Generate typed signature data URL
        const tempCanvas = window.document.createElement('canvas');
        tempCanvas.width = 400;
        tempCanvas.height = 100;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.font = 'italic 34px "Brush Script MT", cursive, sans-serif';
          ctx.fillStyle = '#1E3A8A';
          ctx.fillText(signerName, 30, 60);
          signatureDataUrl = tempCanvas.toDataURL('image/png');
        }
      }

      const res = await clientsApi.signDocument(document.id, {
        signer_name: signerName.trim(),
        signature_data_url: signatureDataUrl,
      });

      toast.success(`Document '${document.title}' signed and legally sealed!`);
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to sign document.');
    } finally {
      setSigning(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Legal Electronic Signature (E-Sign)
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{document.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Signer Legal Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Signer Legal Full Name *
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g., Rajesh Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                mode === 'type'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Type Calligraphic Signature</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                mode === 'draw'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw Signature</span>
            </button>
          </div>

          {/* Signature Preview / Canvas */}
          {mode === 'type' ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center min-h-[120px]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Digital Signature Preview:
              </span>
              <p
                className="text-3xl text-primary-900 dark:text-primary-300 italic select-none"
                style={{ fontFamily: '"Brush Script MT", cursive, sans-serif' }}
              >
                {signerName || 'Your Name'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-800 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={450}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[130px] cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-medium">
                    Draw signature with your mouse or stylus here
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Pad
                </button>
              </div>
            </div>
          )}

          {/* Legal Consent Checkbox */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="legal-consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="legal-consent" className="cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 leading-tight space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Binding Legal Agreement (IT Act 2000 &amp; ESIGN Act)
              </span>
              <span>
                I agree that this electronic signature is the legally binding equivalent to my handwritten signature on this contract. Timestamp and IP address will be recorded.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={signing}
              disabled={!consentGiven || !signerName.trim()}
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Sign &amp; Seal Document</span>
            </Button>
          </div>
        </form>
      </div>
    </div>,
    window.document.body
  );
};
