import React, { useState } from 'react';
import { ShieldAlert, LogOut, ArrowRight, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/api/admin.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function ImpersonationBanner() {
  const { user, originalUser, originalToken, leaveImpersonation } = useAuthStore();
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  // If not in an active impersonation session, render nothing
  if (!originalUser || !originalToken) {
    return null;
  }

  const handleExit = async () => {
    setIsExiting(true);
    try {
      // Notify backend to end log
      await adminApi.exitImpersonation();
    } catch {
      // Continue even if backend call fails
    } finally {
      leaveImpersonation();
      setIsExiting(false);
      toast.success(`Exited impersonation. Returned to Administrator ${originalUser.name}.`);
      navigate('/admin/users');
    }
  };

  const targetRole = user?.roles?.[0] || 'Sales User';

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-3 sticky top-0 z-50 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-100" />
        </div>
        <div className="truncate">
          <span>You are viewing CRM as </span>
          <strong className="font-black underline decoration-amber-300">
            {user?.name}
          </strong>{' '}
          <span className="opacity-90 capitalize">({targetRole.replace('_', ' ')})</span>
          <span className="hidden sm:inline opacity-75 ml-2">
            • Logged in as Super Admin: {originalUser.name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          type="button"
          disabled={isExiting}
          onClick={handleExit}
          className="h-7 text-xs bg-white hover:bg-amber-50 text-amber-950 font-black rounded-lg shadow-sm gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-700" />
          <span>{isExiting ? 'Exiting...' : 'Exit Impersonation'}</span>
        </Button>
      </div>
    </div>
  );
}
