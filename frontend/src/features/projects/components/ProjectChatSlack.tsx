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
} from 'lucide-react';
import {
  phase5Api,
  type ProjectChannelItem,
  type ProjectMessageItem,
} from '@/api/phase5.api';
import { adminApi } from '@/api/admin.api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface ProjectChatSlackProps {
  projectId: number;
  projectTitle: string;
  teamMembers?: { id: number; name: string; email?: string; roles?: string[]; role?: string }[];
}

export function ProjectChatSlack({ projectId, projectTitle, teamMembers }: ProjectChatSlackProps) {
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

  // Quick Emoji Picker for Hover
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

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
  }, [teamMembers]);

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

  // 2. Load Messages when Active Channel Changes + Real-time Polling
  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel.id);

    // Silent background poll every 3.5 seconds for instant Slack-like experience
    const interval = setInterval(async () => {
      try {
        const res = await phase5Api.getMessages(activeChannel.id);
        const ordered = [...(res.data || [])].reverse();
        setMessages(ordered);
      } catch {
        // silent
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeChannel?.id]);

  const loadMessages = async (channelId: number) => {
    try {
      setLoadingMessages(true);
      const res = await phase5Api.getMessages(channelId);
      // messages arrive latest first from paginator, reverse to show oldest first in chat flow
      const ordered = [...(res.data || [])].reverse();
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

  // 4. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChannel) return;
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
    <div className="flex flex-col md:flex-row h-[620px] max-h-[calc(100vh-230px)] min-h-[500px] bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
      {/* --- SLACK SIDEBAR (CHANNELS) --- */}
      <div className="w-full md:w-64 bg-slate-50/90 border-r border-slate-200 flex flex-col">
        {/* Workspace Header */}
        <div className="p-4 border-b border-slate-200/80 bg-white/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {projectTitle}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Project Workspace Chat</p>
          </div>
          <button
            onClick={loadChannels}
            title="Refresh channels"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Channels List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Channels
          </div>

          {loadingChannels ? (
            <div className="p-4 flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-600" /> Loading channels...
            </div>
          ) : (
            channels.map((chan) => {
              const isActive = activeChannel?.id === chan.id;
              return (
                <button
                  key={chan.id}
                  onClick={() => setActiveChannel(chan)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs'
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
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded uppercase font-bold">
                      Staff
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Current User Pill */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-2xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="truncate text-xs">
            <p className="font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.roles?.[0] || 'Member'}</p>
          </div>
        </div>
      </div>

      {/* --- MAIN CHAT PANE --- */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel Top Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            {activeChannel?.is_internal ? (
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Lock className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Hash className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">{activeChannel?.name || 'Channel'}</h4>
                {activeChannel?.is_internal && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                    Internal Notes (Hidden from Client)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{activeChannel?.topic || 'Project coordination and updates'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => activeChannel && loadMessages(activeChannel.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Loading channel messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-500">
                <Hash className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">Welcome to #{activeChannel?.name}!</p>
              <p className="text-slate-400 text-xs mt-1 text-center max-w-sm">
                {activeChannel?.is_internal
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
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} py-1`}
                >
                  <div
                    className={`group relative flex ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    } items-start gap-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}
                  >
                    {/* Quick Reaction Bar on Hover (Slack-like) */}
                    {isHovered && (
                      <div
                        className={`absolute ${
                          isMe ? 'left-0' : 'right-0'
                        } -top-4 z-10 bg-white border border-slate-200 rounded-xl px-1.5 py-0.5 shadow-md flex items-center gap-1`}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 hover:bg-slate-100 p-1 rounded transition text-xs"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
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

                        <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                      </div>

                      {/* Bubble Body */}
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed break-words shadow-2xs select-text ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-slate-100 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {/* Text Content with Rendered Mentions */}
                        <p className="whitespace-pre-wrap">
                          {renderMessageContent(msg.content, isMe)}
                        </p>

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
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- PENDING ATTACHMENTS TRAY --- */}
        {pendingAttachments.length > 0 && (
          <div className="px-5 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
            {pendingAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 shadow-2xs"
              >
                {att.preview_url ? (
                  <img src={att.preview_url} alt="thumb" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <FileText className="w-4 h-4 text-indigo-600" />
                )}
                <span className="truncate max-w-[150px] font-medium">{att.file_name}</span>
                <button
                  onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-rose-500 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- MESSAGE COMPOSER --- */}
        <div className="relative p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
          {/* Mention Autocomplete Dropdown */}
          {showMentionMenu && filteredMembers.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 sm:left-6 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
              placeholder={`Message #${activeChannel?.name || 'channel'}... Type @ to tag or Ctrl+Enter to send`}
              className="w-full bg-transparent px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed font-normal"
            />

            {/* Composer Toolbar */}
            <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-500">
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
                  title="Share Code Snippet"
                  className={`p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition ${
                    codeText.trim() ? 'text-indigo-600 bg-indigo-50' : ''
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
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && !codeText.trim() && pendingAttachments.length === 0)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send
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
    </div>
  );
}
