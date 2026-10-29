import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash,
  Lock,
  Send,
  Paperclip,
  Code,
  Smile,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  AtSign,
  User as UserIcon,
  CheckSquare,
  ChevronLeft,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  MessageCircle,
  Users,
  CheckCheck,
} from 'lucide-react';
import {
  phase5Api,
  type ProjectChannelItem,
  type ProjectMessageItem,
  type ChatPresenceItem,
  type MessageReadItem,
} from '@/api/phase5.api';
import { projectsApi, type SprintItem, type ProjectMilestoneItem, type TaskItem } from '@/api/projects.api';
import { CreateTaskModal } from './CreateTaskModal';
import { adminApi } from '@/api/admin.api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface ProjectChatSlackProps {
  projectId: number;
  projectTitle: string;
  teamMembers?: { id: number; name: string; email?: string; roles?: string[]; role?: string }[];
  sprints?: SprintItem[];
  milestones?: ProjectMilestoneItem[];
  existingTasks?: TaskItem[];
  onTaskCreated?: (task?: any) => void;
  onNavigateToKanban?: () => void;
}

export function ProjectChatSlack({
  projectId,
  projectTitle,
  teamMembers,
  sprints = [],
  milestones = [],
  existingTasks = [],
  onTaskCreated,
  onNavigateToKanban,
}: ProjectChatSlackProps) {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState<ProjectChannelItem[]>([]);
  const [activeChannel, setActiveChannel] = useState<ProjectChannelItem | null>(null);
  const [messages, setMessages] = useState<ProjectMessageItem[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Mention State & Members
  const [members, setMembers] = useState<{ id: number; name: string; role?: string }[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Composer State
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{
    file_name: string;
    file_url: string;
    file_type: string;
    file_size_bytes: number;
    preview_url?: string;
  }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Code Snippet Modal
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [codeText, setCodeText] = useState('');

  // Image Lightbox Modal
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Quick Emoji Picker for Hover & Tap
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  // Mobile View Switcher (Channels list vs Chat feed)
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('chat');

  // Audio Sound & Desktop Notifications
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('chat_sound_enabled') !== 'false';
  });
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });
  const lastMaxMsgIdRef = useRef<number>(0);
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Presence & Online/Offline Tracking
  const [presenceList, setPresenceList] = useState<ChatPresenceItem[]>([]);
  const presenceMap = useMemo(() => {
    const map = new Map<number, ChatPresenceItem>();
    presenceList.forEach((p) => map.set(p.id, p));
    return map;
  }, [presenceList]);

  const loadPresence = async () => {
    try {
      const data = await phase5Api.getChatPresence(projectId);
      if (data && Array.isArray(data)) {
        setPresenceList(data);
        setMembers((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const additions: typeof prev = [];
          data.forEach((p) => {
            if (!existingIds.has(p.id)) {
              existingIds.add(p.id);
              additions.push({ id: p.id, name: p.name, role: 'Member' });
            }
          });
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      }
    } catch {
      // silent
    }
  };

  const renderDeliveryStatus = (msg: ProjectMessageItem) => {
    if (activeChannel?.name?.startsWith('dm-')) {
      const dmInfo = getDirectChannelInfo(activeChannel);
      const otherUserId = dmInfo?.otherUserId;
      const isReadByOther = Boolean(otherUserId && msg.reads?.some((r) => r.user_id === otherUserId));

      if (isReadByOther) {
        return (
          <span
            title={`Seen by ${dmInfo?.displayName || 'recipient'}`}
            className="inline-flex items-center text-sky-500 font-bold"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        );
      }

      const isOtherOnline = Boolean(otherUserId && presenceMap.get(otherUserId)?.is_online);
      if (isOtherOnline) {
        return (
          <span title="Delivered to recipient" className="inline-flex items-center text-slate-400">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        );
      }

      return (
        <span title="Sent to server" className="inline-flex items-center text-slate-400">
          <Check className="w-3 h-3" />
        </span>
      );
    }

    const channelReaders = (msg.reads || []).filter((r) => r.user_id !== msg.user_id);
    if (channelReaders.length > 0) {
      return (
        <span
          title={`Seen by ${channelReaders.map((r) => r.user?.name || 'Teammate').join(', ')}`}
          className="inline-flex items-center text-sky-500 font-bold"
        >
          <CheckCheck className="w-3.5 h-3.5" />
        </span>
      );
    }

    const hasAnyOnlineTeammate = Array.from(presenceMap.values()).some(
      (p) => p.id !== user?.id && p.is_online
    );
    if (hasAnyOnlineTeammate) {
      return (
        <span title="Delivered to channel" className="inline-flex items-center text-slate-400">
          <CheckCheck className="w-3.5 h-3.5" />
        </span>
      );
    }

    return (
      <span title="Sent" className="inline-flex items-center text-slate-400">
        <Check className="w-3 h-3" />
      </span>
    );
  };

  // Helper to get or unlock browser AudioContext on user interaction
  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Prime AudioContext on first user interaction so ringing works without autoplay blocks
  useEffect(() => {
    const handleUnlockAudio = () => {
      getAudioContext();
      window.removeEventListener('click', handleUnlockAudio);
      window.removeEventListener('keydown', handleUnlockAudio);
    };
    window.addEventListener('click', handleUnlockAudio);
    window.addEventListener('keydown', handleUnlockAudio);
    return () => {
      window.removeEventListener('click', handleUnlockAudio);
      window.removeEventListener('keydown', handleUnlockAudio);
    };
  }, []);

  // Web Audio API Slack-grade Notification Chime
  const playNotificationChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz) crisp tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Note 2: A5 (880 Hz) harmonic chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.09);
      gain2.gain.setValueAtTime(0.25, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.42);
    } catch {
      // Browser audio policy fallback
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('chat_sound_enabled', String(next));
      if (next) {
        toast.success('Chat chime ring enabled 🔔');
        setTimeout(playNotificationChime, 50);
      } else {
        toast.info('Chat chime muted 🔕');
      }
      return next;
    });
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setHasNotifPermission(true);
      toast.success('Desktop notifications enabled! You will be alerted when messages arrive.');
    } else {
      toast.info('Desktop notifications permission denied.');
    }
  };

  // Restore document title on focus
  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title;
    }
    const handleFocus = () => {
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
    };
  }, []);

  // Chat-to-Task State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalData, setTaskModalData] = useState<{
    title: string;
    description: string;
    assigneeId?: number;
    sourceId?: number | null;
    sourceType?: string;
  }>({
    title: '',
    description: '',
    sourceType: 'chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available quick reaction emojis
  const QUICK_EMOJIS = ['👍', '❤️', '🚀', '👀', '🎉', '🔥', '✅', '💡'];

  // Sync Team Members (props, adminApi fallback, and message authors)
  useEffect(() => {
    if (teamMembers && teamMembers.length > 0) {
      setMembers(
        teamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role || m.roles?.[0] || 'Member',
        }))
      );
    } else {
      if (user?.roles?.includes('client')) {
        projectsApi
          .getProject(projectId)
          .then((proj: any) => {
            const list: { id: number; name: string; role?: string }[] = [];
            if (proj.users && Array.isArray(proj.users)) {
              proj.users.forEach((u: any) =>
                list.push({ id: u.id, name: u.name, role: u.roles?.[0] || u.role || 'Member' })
              );
            }
            if (proj.pm) {
              list.push({ id: proj.pm.id, name: proj.pm.name, role: 'Project Manager' });
            }
            if (list.length > 0) setMembers(list);
          })
          .catch(() => {});
        return;
      }
      adminApi
        .getUsers()
        .then((res) => {
          if (res?.data && res.data.length > 0) {
            setMembers(
              res.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                role: u.roles?.[0] || u.role || 'Member',
              }))
            );
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [teamMembers, user]);

  useEffect(() => {
    if (!messages.length) return;
    setMembers((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const additions: typeof prev = [];
      messages.forEach((m) => {
        if (m.user && !existingIds.has(m.user.id)) {
          existingIds.add(m.user.id);
          additions.push({
            id: m.user.id,
            name: m.user.name,
            role: 'Member',
          });
        }
      });
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, [messages]);

  // Distinct other members available for 1-on-1 direct messaging
  const otherMembers = useMemo(() => {
    return members.filter((m) => m.id > 0 && m.id !== user?.id);
  }, [members, user?.id]);

  // Open or create 1-on-1 Direct Message channel
  const handleOpenDirectChat = async (targetMember: { id: number; name: string }) => {
    try {
      const dmChannel = await phase5Api.getOrCreateDirectChannel(projectId, targetMember.id);
      setChannels((prev) => {
        if (!prev.some((c) => c.id === dmChannel.id)) {
          return [...prev, dmChannel];
        }
        return prev;
      });
      setActiveChannel(dmChannel);
      setMobileView('chat');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not open direct message.');
    }
  };

  // Helper to extract DM recipient details from channel name
  const getDirectChannelInfo = (channel: ProjectChannelItem | null) => {
    if (!channel || !channel.name.startsWith('dm-')) return null;
    const parts = channel.name.replace('dm-', '').split('-').map(Number);
    const otherUserId = parts.find((id) => id !== user?.id);
    const otherMember = members.find((m) => m.id === otherUserId);
    return {
      otherUserId,
      otherMember,
      displayName: otherMember?.name || `Teammate #${otherUserId || ''}`,
      role: otherMember?.role || 'Member',
    };
  };

  const filteredMembers = useMemo(() => {
    const specialTokens = [
      { id: -1, name: 'channel', role: 'Notify everyone in this channel' },
      { id: -2, name: 'everyone', role: 'Notify all project members' },
    ];
    const pool = [...specialTokens, ...members];
    if (!mentionQuery) return pool;
    const q = mentionQuery.toLowerCase();
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [members, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const selStart = e.target.selectionStart || 0;
    const beforeCursor = val.slice(0, selStart);
    const mentionMatch = beforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);

    if (mentionMatch) {
      setShowMentionMenu(true);
      setMentionQuery(mentionMatch[1]);
      setSelectedMentionIdx(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleInsertMention = (memberName: string) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? inputText.length;
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);

    const lastAtPos = textBefore.lastIndexOf('@');
    let newText = '';
    let newCursorPos = 0;

    if (lastAtPos !== -1) {
      const beforeAt = textBefore.slice(0, lastAtPos);
      newText = `${beforeAt}@${memberName} ${textAfter}`;
      newCursorPos = beforeAt.length + memberName.length + 2;
    } else {
      newText = `${textBefore}@${memberName} ${textAfter}`;
      newCursorPos = textBefore.length + memberName.length + 2;
    }

    setInputText(newText);
    setShowMentionMenu(false);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleTriggerMentionBtn = () => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? inputText.length;
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);

    if (textBefore.endsWith('@')) {
      setShowMentionMenu(true);
      setMentionQuery('');
      setSelectedMentionIdx(0);
      textarea?.focus();
      return;
    }

    const needsSpace = textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n');
    const prefix = needsSpace ? ' @' : '@';
    const newText = `${textBefore}${prefix}${textAfter}`;
    const newPos = cursorPos + prefix.length;

    setInputText(newText);
    setShowMentionMenu(true);
    setMentionQuery('');
    setSelectedMentionIdx(0);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!content) return null;

    // Check if this message is an automated task creation card
    if (content.includes('📌 **TASK CREATED:')) {
      const taskBody = content.replace('📌 **TASK CREATED:', '').replace('[View in Kanban Board ↗]', '').trim();
      return (
        <div className="p-3 my-1 rounded-xl bg-white border border-emerald-300 shadow-xs text-slate-800">
          <div className="flex items-center gap-1.5 mb-1.5 text-emerald-700 font-bold text-xs">
            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Task Created from Discussion</span>
          </div>
          <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-900 font-medium">
            {taskBody}
          </div>
          {onNavigateToKanban && (
            <button
              type="button"
              onClick={onNavigateToKanban}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
            >
              <span>View in Kanban Board</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    const escapedNames = members
      .map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .filter(Boolean);

    const patternStr = escapedNames.length > 0
      ? `(@(?:${escapedNames.join('|')}|everyone|channel|[a-zA-Z0-9_.-]+))`
      : `(@[a-zA-Z0-9_.-]+)`;

    const regex = new RegExp(patternStr, 'gi');
    const parts = content.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const rawTarget = part.slice(1);
        const mentionTarget = rawTarget.toLowerCase();
        const currentUserName = user?.name?.toLowerCase() || '';
        const isMentionedMe =
          mentionTarget === 'everyone' ||
          mentionTarget === 'channel' ||
          (currentUserName && currentUserName.includes(mentionTarget));

        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-md text-[11px] mx-0.5 align-baseline ${
              isMe
                ? 'bg-white/20 text-white border border-white/30 shadow-2xs'
                : isMentionedMe
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
            }`}
          >
            <AtSign className="w-2.5 h-2.5 inline shrink-0" />
            {rawTarget}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // 1. Load Channels
  useEffect(() => {
    loadChannels();
    loadPresence();
  }, [projectId]);

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const data = await phase5Api.getChannels(projectId);
      setChannels(data);
      if (data && data.length > 0) {
        setActiveChannel((prev) => {
          if (!prev) return data[0];
          return data.find((c) => c.id === prev.id) || data[0];
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load chat channels.');
    } finally {
      setLoadingChannels(false);
    }
  };

  // 2. Load Messages when Active Channel Changes + Real-time Polling & Chime Alert
  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel.id);

    // Silent background poll every 3 seconds for instant multi-user Slack experience
    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        pollCount++;
        // Every ~12s, refresh channel list to pick up newly opened DMs or public channels
        if (pollCount % 4 === 0) {
          phase5Api.getChannels(projectId).then((chans) => {
            if (chans && chans.length > 0) setChannels(chans);
          }).catch(() => {});
        }

        // Every ~6s, refresh team presence (real-time online / offline status)
        if (pollCount % 2 === 0) {
          loadPresence();
        }

        const res = await phase5Api.getMessages(activeChannel.id);
        const ordered = [...(res.data || [])].reverse();

        if (lastMaxMsgIdRef.current > 0) {
          const freshIncoming = ordered.filter(
            (m) => m.id > lastMaxMsgIdRef.current && m.user_id !== user?.id
          );

          if (freshIncoming.length > 0) {
            // 1. Play audio chime ring
            playNotificationChime();

            const latestMsg = freshIncoming[freshIncoming.length - 1];
            const senderName = latestMsg.user?.name || 'Teammate';
            const isDirectMsg = activeChannel.name.startsWith('dm-');
            const channelLabel = isDirectMsg ? 'Direct Message' : `#${activeChannel.name}`;

            // 2. Desktop Notification & Tab Title Badge if tab is in background
            if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
              document.title = `(1) 💬 ${senderName}: ${latestMsg.content?.slice(0, 30) || 'New message'}`;

              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try {
                  const notif = new Notification(`💬 ${senderName} (${channelLabel})`, {
                    body: latestMsg.content || (latestMsg.code_snippet ? 'Shared a code snippet' : 'Shared an attachment'),
                    icon: '/favicon.ico',
                  });
                  notif.onclick = () => {
                    window.focus();
                    notif.close();
                  };
                } catch {
                  // ignore
                }
              }
            } else {
              // In-app sonner toast notification
              toast(`💬 ${senderName} (${channelLabel}): "${latestMsg.content?.slice(0, 60) || 'New message'}"`);
            }

            scrollToBottom();
          }
        }

        if (ordered.length > 0) {
          lastMaxMsgIdRef.current = Math.max(lastMaxMsgIdRef.current, ...ordered.map((m) => m.id));
        }

        setMessages(ordered);
      } catch {
        // silent
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChannel?.id]);

  const loadMessages = async (channelId: number) => {
    try {
      setLoadingMessages(true);
      const res = await phase5Api.getMessages(channelId);
      // messages arrive latest first from paginator, reverse to show oldest first in chat flow
      const ordered = [...(res.data || [])].reverse();
      if (ordered.length > 0) {
        lastMaxMsgIdRef.current = Math.max(0, ...ordered.map((m) => m.id));
      }
      setMessages(ordered);
      scrollToBottom();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load channel messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 3. Handle File Upload via Direct / Presigned Upload Pipeline
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);

      // Request presigned upload metadata
      const presigned = await phase5Api.requestPresignedUpload({
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size,
        folder: 'chat_attachments',
      });

      let finalUrl = presigned.public_url;

      if (presigned.mode === 's3_presigned') {
        // Direct PUT to S3 / Cloudflare R2
        await fetch(presigned.upload_url, {
          method: 'PUT',
          headers: presigned.headers,
          body: file,
        });
      } else {
        // Fallback to direct multipart upload endpoint
        const uploadRes = await phase5Api.directUploadFile(file, 'chat_attachments');
        finalUrl = uploadRes.public_url;
      }

      const isImg = file.type.startsWith('image/');
      setPendingAttachments((prev) => [
        ...prev,
        {
          file_name: file.name,
          file_url: finalUrl,
          file_type: file.type,
          file_size_bytes: file.size,
          preview_url: isImg ? URL.createObjectURL(file) : undefined,
        },
      ]);

      toast.success(`'${file.name}' attached successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'File upload failed.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Convert chat message to a project task
  const handleConvertMessageToTask = (msg: ProjectMessageItem) => {
    let cleanTitle = msg.content?.split('\n')[0]?.trim() || '';
    if (cleanTitle.length > 80) {
      cleanTitle = cleanTitle.substring(0, 80) + '...';
    }
    if (!cleanTitle && msg.attachments && msg.attachments.length > 0) {
      cleanTitle = `Review attachment: ${msg.attachments[0].file_name}`;
    }
    if (!cleanTitle) {
      cleanTitle = `Task from #${activeChannel?.name || 'chat'}`;
    }

    let desc = `Originated from discussion in #${activeChannel?.name || 'general'} by ${msg.user?.name || 'Teammate'} on ${new Date(msg.created_at).toLocaleString()}:\n\n> ${msg.content || '(Attachment shared)'}`;
    if (msg.attachments && msg.attachments.length > 0) {
      desc += `\n\nAttachments:\n` + msg.attachments.map((a) => `- [${a.file_name}](${a.file_url})`).join('\n');
    }

    // Check if any team member is mentioned in message
    const mentioned = members.find(
      (m) => m.name && msg.content && msg.content.toLowerCase().includes(`@${m.name.toLowerCase()}`)
    );

    setTaskModalData({
      title: cleanTitle,
      description: desc,
      assigneeId: mentioned ? mentioned.id : undefined,
      sourceType: 'chat',
      sourceId: msg.id,
    });
    setTaskModalOpen(true);
  };

  // Quick New Task via Composer
  const handleQuickNewTask = () => {
    let rawText = inputText.trim();
    if (rawText.toLowerCase().startsWith('/task')) {
      rawText = rawText.replace(/^\/task\s*/i, '').trim();
    }

    setTaskModalData({
      title: rawText || '',
      description: rawText ? `Created from #${activeChannel?.name || 'general'} chat discussion:\n\n> ${rawText}` : `Task initiated from #${activeChannel?.name || 'general'} chat.`,
      sourceType: 'chat',
      sourceId: null,
    });
    setInputText('');
    setTaskModalOpen(true);
  };

  // Handle task successfully created
  const handleTaskCreatedSuccess = async (createdTask?: any) => {
    setTaskModalOpen(false);
    if (onTaskCreated) {
      onTaskCreated(createdTask);
    }

    // Automatically post confirmation card in active chat channel
    if (activeChannel && createdTask) {
      try {
        const assigneeObj = members.find((m) => m.id === createdTask.assignee_id);
        const assigneeName = assigneeObj ? `@${assigneeObj.name}` : 'Unassigned';
        const estHours = createdTask.estimated_hours ? `${createdTask.estimated_hours}h` : '1h';
        const cardText = `📌 **TASK CREATED: #${createdTask.id}** — **${createdTask.title}**\n👤 Assignee: ${assigneeName} | ⚡ Priority: ${(createdTask.priority || 'medium').toUpperCase()} | ⏱️ Est: ${estHours}\n[View in Kanban Board ↗]`;

        const autoMsg = await phase5Api.sendMessage(activeChannel.id, {
          content: cardText,
        });
        setMessages((prev) => [...prev, autoMsg]);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to post task notification in chat:', err);
      }
    }
  };

  // 4. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChannel) return;

    if (inputText.trim().toLowerCase().startsWith('/task')) {
      handleQuickNewTask();
      return;
    }

    if (!inputText.trim() && !codeText.trim() && pendingAttachments.length === 0) return;

    try {
      setIsSending(true);

      const payload = {
        content: inputText.trim() || (codeText.trim() ? 'Shared a code snippet:' : 'Shared file attachments:'),
        code_snippet: codeText.trim() || undefined,
        code_language: codeText.trim() ? codeLanguage : undefined,
        attachments: pendingAttachments.map((a) => ({
          file_name: a.file_name,
          file_url: a.file_url,
          file_type: a.file_type,
          file_size_bytes: a.file_size_bytes,
        })),
      };

      const newMsg = await phase5Api.sendMessage(activeChannel.id, payload);
      setMessages((prev) => [...prev, newMsg]);

      // Reset
      setInputText('');
      setCodeText('');
      setShowCodeModal(false);
      setPendingAttachments([]);
      scrollToBottom();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Toggle Reaction
  const handleToggleReaction = async (messageId: number, emoji: string) => {
    try {
      const res = await phase5Api.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return { ...m, reactions: res.reactions };
          }
          return m;
        })
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update reaction.');
    }
  };

  // Helper for copying code block
  const handleCopyCode = (messageId: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(messageId);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Format timestamp like Slack
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col md:flex-row h-[580px] sm:h-[640px] max-h-[calc(100vh-170px)] min-h-[480px] bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
      {/* --- SLACK SIDEBAR (CHANNELS) --- */}
      <div
        className={`w-full md:w-64 bg-slate-50/90 border-r border-slate-200 flex flex-col ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Workspace Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-white/60 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">{projectTitle}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Project Workspace Chat</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeChannel && (
              <button
                onClick={() => setMobileView('chat')}
                className="md:hidden px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 shadow-2xs cursor-pointer"
              >
                Chat →
              </button>
            )}
            <button
              onClick={loadChannels}
              title="Refresh channels"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Channels & Direct Messages List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-4">
          {/* 1. PUBLIC & INTERNAL CHANNELS */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Channels</span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {channels.filter((c) => !c.name.startsWith('dm-')).length}
              </span>
            </div>

            {loadingChannels ? (
              <div className="p-4 flex items-center justify-center text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-600" /> Loading channels...
              </div>
            ) : (
              channels
                .filter((chan) => !chan.name.startsWith('dm-'))
                .map((chan) => {
                  const isActive = activeChannel?.id === chan.id;
                  return (
                    <button
                      key={chan.id}
                      onClick={() => {
                        setActiveChannel(chan);
                        setMobileView('chat');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs font-bold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {chan.is_internal ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{chan.name}</span>
                      </div>

                      {chan.is_internal && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded uppercase font-bold shrink-0">
                          Staff
                        </span>
                      )}
                    </button>
                  );
                })
            )}
          </div>

          {/* 2. DIRECT MESSAGES (1-ON-1) */}
          <div className="space-y-1 pt-1 border-t border-slate-200/60">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-slate-400" />
                Direct Messages
              </span>
              <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.2 rounded-full font-semibold">
                {otherMembers.length}
              </span>
            </div>

            {otherMembers.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-slate-400 italic">
                No other teammates found
              </div>
            ) : (
              otherMembers.map((member) => {
                const dmKey = `dm-${Math.min(user?.id || 0, member.id)}-${Math.max(user?.id || 0, member.id)}`;
                const dmChannel = channels.find((c) => c.name === dmKey);
                const isActive = activeChannel?.id === dmChannel?.id || activeChannel?.name === dmKey;
                const presence = presenceMap.get(member.id);
                const isOnline = presence?.is_online ?? false;

                return (
                  <button
                    key={member.id}
                    onClick={() => handleOpenDirectChat(member)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {member.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isOnline ? 'Online now' : presence?.last_seen_human || 'Offline'}
                        />
                      </div>
                      <div className="truncate text-left min-w-0">
                        <span className="truncate block font-medium">{member.name}</span>
                        <span
                          className={`text-[9px] block truncate ${
                            isOnline ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-normal'
                          }`}
                        >
                          {isOnline ? '🟢 Online' : presence?.last_seen_human || 'Offline'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 truncate max-w-[65px] font-normal shrink-0">
                      {member.role || 'Member'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Current User Pill */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="truncate text-xs">
            <p className="font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.roles?.[0] || 'Member'}</p>
          </div>
        </div>
      </div>

      {/* --- MAIN CHAT PANE --- */}
      <div
        className={`flex-1 flex flex-col bg-white min-w-0 ${
          mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Channel Top Header */}
        <div className="h-14 px-3 sm:px-5 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Mobile Channels Switcher Button */}
            <button
              type="button"
              onClick={() => setMobileView('sidebar')}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 text-xs font-bold border border-slate-200 bg-slate-50 shrink-0 cursor-pointer"
              title="View all channels & DMs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
              <span className="text-[11px]">Chat</span>
            </button>

            {activeChannel?.name?.startsWith('dm-') ? (
              (() => {
                const dmInfo = getDirectChannelInfo(activeChannel);
                const presence = dmInfo?.otherUserId ? presenceMap.get(dmInfo.otherUserId) : null;
                const isOnline = presence?.is_online ?? false;

                return (
                  <>
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-2xs">
                        {dmInfo?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {dmInfo?.displayName}
                        </h4>
                        <span
                          className={`text-[9px] sm:text-[10px] border px-1.5 py-0.2 rounded font-semibold shrink-0 flex items-center gap-1 ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {isOnline ? 'Online' : `Offline (${presence?.last_seen_human || 'recently'})`}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Private 1-on-1 • {dmInfo?.role || 'Team Member'}
                      </p>
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                {activeChannel?.is_internal ? (
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{activeChannel?.name || 'Channel'}</h4>
                    {activeChannel?.is_internal && (
                      <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold shrink-0">
                        Internal
                      </span>
                    )}
                    <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {Array.from(presenceMap.values()).filter((p) => p.is_online).length} Online
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{activeChannel?.topic || 'Project coordination and updates'}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Audio Ring Chime Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Ring alert sound enabled (Click to mute)' : 'Ring alert sound muted (Click to unmute)'}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Ring Alert On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Muted</span>
                </>
              )}
            </button>

            {/* Desktop Notification Permission Bell */}
            <button
              type="button"
              onClick={requestNotificationPermission}
              title={
                hasNotifPermission
                  ? 'Desktop push notifications active'
                  : 'Enable desktop push notification when other tabs are active'
              }
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                hasNotifPermission
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
              }`}
            >
              {hasNotifPermission ? (
                <>
                  <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Push Active</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">Enable Push</span>
                </>
              )}
            </button>

            {/* Refresh Messages & Channels */}
            <button
              onClick={() => {
                if (activeChannel) loadMessages(activeChannel.id);
                loadChannels();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
              title="Refresh messages and channels"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pt-8 sm:pt-8 space-y-3 bg-white min-h-0">
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Loading channel messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600">
                {activeChannel?.name?.startsWith('dm-') ? (
                  <MessageCircle className="w-6 h-6" />
                ) : (
                  <Hash className="w-6 h-6" />
                )}
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {activeChannel?.name?.startsWith('dm-')
                  ? `Direct message with ${getDirectChannelInfo(activeChannel)?.displayName || 'Teammate'}`
                  : `Welcome to #${activeChannel?.name}!`}
              </p>
              <p className="text-slate-400 text-xs mt-1 text-center max-w-sm">
                {activeChannel?.name?.startsWith('dm-')
                  ? 'This is a private 1-on-1 direct conversation. Only you and this teammate have access to these messages.'
                  : activeChannel?.is_internal
                  ? 'This channel is strictly for internal staff discussions, technical notes, and developer sync.'
                  : 'This is the start of the project discussion channel with client and team.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = Boolean(
                (user?.id && msg.user_id === user.id) ||
                (user?.id && msg.user?.id === user.id) ||
                (user?.email && msg.user?.email && user.email.toLowerCase() === msg.user.email.toLowerCase())
              );
              const isHovered = hoveredMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => setHoveredMessageId((prev) => (prev === msg.id ? null : msg.id))}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} py-1`}
                >
                  <div
                    className={`group relative flex ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    } items-start gap-2 max-w-[92%] sm:max-w-[78%] md:max-w-[70%] min-w-0`}
                  >
                    {/* Quick Reaction Bar on Hover / Tap */}
                    {isHovered && (
                      <div
                        className={`absolute ${
                          isMe ? 'right-0' : 'left-0'
                        } -top-7 sm:-top-7 z-30 bg-white border border-slate-200/90 rounded-xl px-1.5 py-0.5 shadow-lg flex items-center gap-0.5 sm:gap-1 max-w-[calc(100vw-36px)] animate-in fade-in zoom-in-95 duration-100 select-none`}
                      >
                        {QUICK_EMOJIS.slice(0, 5).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, emoji);
                            }}
                            className="hover:scale-125 hover:bg-slate-100 p-1 rounded-lg transition text-xs cursor-pointer"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="hidden sm:flex items-center gap-0.5">
                          {QUICK_EMOJIS.slice(5).map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReaction(msg.id, emoji);
                              }}
                              className="hover:scale-125 hover:bg-slate-100 p-1 rounded-lg transition text-xs cursor-pointer"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5 shrink-0" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertMessageToTask(msg);
                          }}
                          className="hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 px-1.5 py-0.5 rounded-lg transition text-xs flex items-center gap-1 font-bold cursor-pointer shrink-0"
                          title="Convert this message to Kanban Task"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="text-[10px]">Create Task</span>
                        </button>
                      </div>
                    )}

                    {/* User Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                        isMe
                          ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                          : 'bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {isMe
                        ? user?.name?.charAt(0) || 'U'
                        : msg.user?.name?.charAt(0) || 'U'}
                    </div>

                    {/* Message Bubble + Meta */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 max-w-full`}>
                      {/* Author + Timestamp Header */}
                      <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {isMe ? (
                          <span className="font-bold text-indigo-600 text-xs">You</span>
                        ) : (
                          <span className="font-bold text-slate-800 text-xs">{msg.user?.name || 'Teammate'}</span>
                        )}

                        {msg.is_internal && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                            INTERNAL
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          {formatTime(msg.created_at)}
                          {isMe && renderDeliveryStatus(msg)}
                        </span>
                      </div>

                      {/* Bubble Body */}
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed break-words shadow-2xs select-text ${
                          msg.content?.includes('📌 **TASK CREATED:')
                            ? 'bg-slate-50 border border-emerald-300/80 text-slate-800'
                            : isMe
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-slate-100 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {/* Text Content with Rendered Mentions */}
                        <div className="whitespace-pre-wrap">
                          {renderMessageContent(msg.content, isMe)}
                        </div>

                        {/* Code Snippet Box (Slack Code Block) */}
                        {msg.code_snippet && (
                          <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-xs text-left">
                            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                                {msg.code_language || 'Code'}
                              </span>
                              <button
                                onClick={() => handleCopyCode(msg.id, msg.code_snippet!)}
                                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition"
                              >
                                {copiedCodeId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
                              <code>{msg.code_snippet}</code>
                            </pre>
                          </div>
                        )}

                        {/* Attachments List */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {msg.attachments.map((att) => {
                              const isImg =
                                att.file_type.startsWith('image/') ||
                                att.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                              if (isImg) {
                                return (
                                  <div
                                    key={att.id}
                                    onClick={() => setActiveLightboxImg(att.file_url)}
                                    className={`group/img relative cursor-pointer rounded-xl overflow-hidden border shadow-2xs ${
                                      isMe ? 'border-indigo-400/50 hover:border-white' : 'border-slate-200 hover:border-indigo-400'
                                    }`}
                                  >
                                    <img
                                      src={att.file_url}
                                      alt={att.file_name}
                                      className="h-32 w-auto max-w-xs object-cover rounded-xl"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition text-white text-xs gap-1">
                                      <ExternalLink className="w-4 h-4" /> Click to view
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={att.id}
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition text-xs shadow-2xs ${
                                    isMe
                                      ? 'bg-indigo-700/80 border border-indigo-400/50 hover:bg-indigo-700 text-white'
                                      : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-800'
                                  }`}
                                >
                                  <FileText className={`w-4 h-4 shrink-0 ${isMe ? 'text-white' : 'text-indigo-600'}`} />
                                  <div className="truncate max-w-[180px] text-left">
                                    <p className="font-semibold truncate">{att.file_name}</p>
                                    <p className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                      {formatBytes(att.file_size_bytes)}
                                    </p>
                                  </div>
                                  <Download className={`w-3.5 h-3.5 shrink-0 ml-1 ${isMe ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`} />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Emoji Reaction Badges */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`mt-1.5 flex flex-wrap gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || []).concat(r);
                              return acc;
                            }, {} as Record<string, typeof msg.reactions>)
                          ).map(([emoji, list]) => {
                            const hasMe = list.some((r) => r.user_id === user?.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition ${
                                  hasMe
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{list.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Seen by indicator for Group Channels */}
                      {!activeChannel?.name?.startsWith('dm-') && (() => {
                        const channelReaders = (msg.reads || []).filter((r) => r.user_id !== msg.user_id);
                        if (!channelReaders || channelReaders.length === 0) return null;

                        return (
                          <div
                            className={`mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 select-none ${
                              isMe ? 'justify-end' : 'justify-start'
                            }`}
                            title={channelReaders
                              .map((r) => `${r.user?.name || 'Member'} (${formatTime(r.read_at)})`)
                              .join('\n')}
                          >
                            <div className="flex items-center -space-x-1 overflow-hidden shrink-0">
                              {channelReaders.slice(0, 3).map((r, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-4 rounded-full bg-slate-200 border border-white text-[8px] font-bold text-slate-700 flex items-center justify-center shrink-0 shadow-2xs"
                                  title={`${r.user?.name || 'Member'} - ${formatTime(r.read_at)}`}
                                >
                                  {r.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              ))}
                            </div>
                            <span className="flex items-center gap-1 font-medium text-slate-500 text-[10px]">
                              <CheckCheck className="w-3 h-3 text-sky-500 shrink-0" />
                              <span>
                                Seen by{' '}
                                <strong className="text-slate-700 font-semibold">
                                  {channelReaders
                                    .slice(0, 2)
                                    .map((r) => r.user?.name?.split(' ')[0] || 'Member')
                                    .join(', ')}
                                </strong>
                                {channelReaders.length > 2 ? ` +${channelReaders.length - 2} more` : ''}
                              </span>
                            </span>
                          </div>
                        );
                      })()}

                      {/* Seen indicator for 1-on-1 DM Channels */}
                      {activeChannel?.name?.startsWith('dm-') && isMe && (() => {
                        const dmInfo = getDirectChannelInfo(activeChannel);
                        const otherUserId = dmInfo?.otherUserId;
                        const readItem = otherUserId ? msg.reads?.find((r) => r.user_id === otherUserId) : null;
                        if (!readItem) return null;

                        return (
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-sky-600 font-medium select-none">
                            <CheckCheck className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>Seen {formatTime(readItem.read_at)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- PENDING ATTACHMENTS & CODE SNIPPET TRAY --- */}
        {(pendingAttachments.length > 0 || codeText.trim()) && (
          <div className="px-3 sm:px-5 py-2 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center gap-2">
            {/* Attached Code Snippet Preview Chip */}
            {codeText.trim() && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 shadow-sm animate-in fade-in">
                <div className="p-1 rounded-md bg-slate-800 text-emerald-400 shrink-0">
                  <Code className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/80 shrink-0">
                    {codeLanguage}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 truncate max-w-[150px] sm:max-w-[240px]">
                    {codeText.trim().split('\n')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    ({codeText.trim().split('\n').length} {codeText.trim().split('\n').length === 1 ? 'line' : 'lines'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 ml-1 border-l border-slate-700 pl-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCodeModal(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    title="Edit snippet"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeText('')}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                    title="Remove snippet"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Pending File Attachments */}
            {pendingAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-2xs"
              >
                {att.preview_url ? (
                  <img src={att.preview_url} alt="thumb" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span className="truncate max-w-[150px] font-medium">{att.file_name}</span>
                <button
                  type="button"
                  onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- MESSAGE COMPOSER --- */}
        <div className="relative p-2.5 sm:p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
          {/* Mention Autocomplete Dropdown */}
          {showMentionMenu && filteredMembers.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 sm:left-6 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-indigo-600" /> Mention Team Member
                </span>
                <button
                  type="button"
                  onClick={() => setShowMentionMenu(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  Dismiss (Esc)
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filteredMembers.map((member, idx) => {
                  const isSelected = idx === selectedMentionIdx;
                  return (
                    <button
                      key={`${member.id}-${member.name}`}
                      type="button"
                      onClick={() => handleInsertMention(member.name)}
                      onMouseEnter={() => setSelectedMentionIdx(idx)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition text-xs ${
                        isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          member.id < 0
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {member.id < 0 ? '@' : member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span>@{member.name}</span>
                          {member.id < 0 && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-mono">
                              Special
                            </span>
                          )}
                        </p>
                        {member.role && (
                          <p className="text-[10px] text-slate-400 truncate capitalize">{member.role}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="bg-white border border-slate-300 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition shadow-xs">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (showMentionMenu && filteredMembers.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIdx((prev) => (prev + 1) % filteredMembers.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIdx((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    const targetMember = filteredMembers[selectedMentionIdx];
                    if (targetMember) {
                      handleInsertMention(targetMember.name);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentionMenu(false);
                    return;
                  }
                }

                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                codeText.trim()
                  ? "Add an optional message or note with your code snippet..."
                  : activeChannel?.name?.startsWith('dm-')
                  ? `Message @${getDirectChannelInfo(activeChannel)?.displayName || 'teammate'}... Type @ to tag or Ctrl+Enter to send`
                  : `Message #${activeChannel?.name || 'channel'}... Type @ to tag or Ctrl+Enter to send`
              }
              className="w-full bg-transparent px-3 sm:px-4 py-2 sm:py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed font-normal"
            />

            {/* Composer Toolbar */}
            <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between gap-1">
              <div className="flex items-center gap-0.5 sm:gap-1 text-slate-500">
                {/* Tag / Mention button */}
                <button
                  type="button"
                  onClick={handleTriggerMentionBtn}
                  title="Tag / Mention someone (@)"
                  className={`p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition ${
                    showMentionMenu ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-300' : ''
                  }`}
                >
                  <AtSign className="w-4 h-4" />
                </button>

                {/* Code block insertion */}
                <button
                  type="button"
                  onClick={() => setShowCodeModal(true)}
                  title={codeText.trim() ? "Code snippet attached (Click to edit)" : "Share Code Snippet"}
                  className={`p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition cursor-pointer ${
                    codeText.trim() ? 'text-indigo-600 bg-indigo-50 ring-1 ring-indigo-300' : ''
                  }`}
                >
                  <Code className="w-4 h-4" />
                </button>

                {/* File Attachment via Presigned upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Attach file or image (Presigned Upload)"
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition cursor-pointer"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>

                <div className="w-[1px] h-4 bg-slate-300 mx-0.5 sm:mx-1" />

                {/* Create Project Task Shortcut */}
                <button
                  type="button"
                  onClick={handleQuickNewTask}
                  title="Create Project Task (/task)"
                  className="px-1.5 sm:px-2 py-1 rounded-lg hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition flex items-center gap-1 font-semibold text-xs border border-transparent hover:border-indigo-200 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] hidden sm:inline font-bold">New Task</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !codeText.trim() && pendingAttachments.length === 0)}
                  className="px-3 sm:px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden xs:inline">Send</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* --- CODE SNIPPET MODAL --- */}
      {showCodeModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setShowCodeModal(false)}
            />
            <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Share Code Snippet</h4>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="php">PHP</option>
                    <option value="python">Python</option>
                    <option value="sql">SQL</option>
                    <option value="html">HTML / CSS</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash / Shell</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                  <textarea
                    rows={8}
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    placeholder="// Paste your code snippet here..."
                    className="w-full font-mono bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-300 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!codeText.trim()) {
                      toast.error('Code snippet cannot be empty');
                      return;
                    }
                    setShowCodeModal(false);
                    toast.success('Snippet attached to composer!');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20"
                >
                  Attach Snippet
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* --- IMAGE LIGHTBOX MODAL --- */}
      {activeLightboxImg &&
        createPortal(
          <div
            onClick={() => setActiveLightboxImg(null)}
            className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out animate-in fade-in duration-200"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={activeLightboxImg}
                alt="Enlarged preview"
                className="max-h-[85vh] w-auto rounded-xl shadow-2xl object-contain bg-white"
              />
              <button
                onClick={() => setActiveLightboxImg(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 shadow-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>,
          document.body
        )}
      {/* --- CREATE TASK MODAL (From Chat) --- */}
      {taskModalOpen && (
        <CreateTaskModal
          projectId={projectId}
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSuccess={handleTaskCreatedSuccess}
          initialTitle={taskModalData.title}
          initialDescription={taskModalData.description}
          initialAssigneeId={taskModalData.assigneeId}
          sourceType={taskModalData.sourceType}
          sourceId={taskModalData.sourceId}
          sprints={sprints}
          milestones={milestones}
          existingTasks={existingTasks}
          teamMembers={members}
        />
      )}
    </div>
  );
}
