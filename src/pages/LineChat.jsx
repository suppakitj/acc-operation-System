import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle, User, Users, ArrowLeft, AlertCircle, Settings, ChevronUp, Paperclip, Loader2, ScreenShare, X, Smile } from 'lucide-react';
import ChatBubble from '../components/chat/ChatBubble';
import CreateTaskFromChat from '../components/chat/CreateTaskFromChat';
import ScreenCaptureDialog from '../components/chat/ScreenCaptureDialog';
import PinnedMessages from '../components/chat/PinnedMessages';
import MentionInput from '../components/chat/MentionInput';
import { format, isToday, isYesterday } from 'date-fns';
import { th } from 'date-fns/locale';
import { parseUTCDate } from '@/lib/dateUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '../components/LanguageContext';
import { useUserList } from '@/hooks/useUserList';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const MESSAGES_PER_PAGE = 20;
const INITIAL_FETCH_LIMIT = 500;
const LOAD_MORE_BATCH = 500;

function formatChatDate(dateStr) {
  if (!dateStr) return '';
  const d = parseUTCDate(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'เมื่อวาน';
  return format(d, 'd MMM', { locale: th });
}

function getLastMessagePreview(messages) {
  if (!messages || messages.length === 0) return '';
  // Find the most recent message by created_date
  const last = messages.reduce((latest, m) => {
    if (!latest) return m;
    return (m.created_date || '') > (latest.created_date || '') ? m : latest;
  }, null);
  if (!last) return '';
  if (last.direction === 'outgoing') {
    const prefix = 'คุณ: ';
    if (last.message_type === 'image') return prefix + '📷 รูปภาพ';
    if (last.message_type === 'sticker') return prefix + '😊 Sticker';
    if (last.message_type === 'file') return prefix + '📎 ไฟล์';
    return prefix + (last.content || '');
  }
  if (last.message_type === 'image') return '📷 รูปภาพ';
  if (last.message_type === 'sticker') return '😊 Sticker';
  if (last.message_type === 'file') return '📎 ไฟล์';
  return last.content || '';
}

// Date separator component
function DateSeparator({ date }) {
  const d = parseUTCDate(date);
  let label;
  if (isToday(d)) label = 'วันนี้';
  else if (isYesterday(d)) label = 'เมื่อวาน';
  else label = format(d, 'd MMMM yyyy', { locale: th });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-medium text-muted-foreground bg-background px-2 rounded-full">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function LineChat() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskMessage, setTaskMessage] = useState(null);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [sendingCapture, setSendingCapture] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  // Persist pinned messages per chat in localStorage
  const getPinnedKey = (chatId) => `line_pinned_${chatId}`;
  const loadPinnedIds = (chatId) => {
    if (!chatId) return [];
    try {
      const saved = localStorage.getItem(getPinnedKey(chatId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };
  const [pinnedIds, setPinnedIds] = useState([]);
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);
  const chatTopRef = useRef(null);
  const chatScrollRef = useRef(null);
  const prevMessageCount = useRef(0);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    setTimeout(() => {
      const viewport = chatScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        if (behavior === 'instant') {
          viewport.scrollTop = viewport.scrollHeight;
        } else {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
      }
    }, 150);
  }, []);
  const [activeMentions, setActiveMentions] = useState([]);
  const [triggerMentionName, setTriggerMentionName] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'line_oa'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 5 * 60_000,
  });
  const getConfigVal = (key) => configs.find(c => c.key === key)?.value || '';
  const isLineConfigured = !!(getConfigVal('line_channel_id') && getConfigVal('line_channel_secret') && getConfigVal('line_access_token'));

  const { data: users = [] } = useUserList();

  const [allMessages, setAllMessages] = useState([]);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const parseMessages = (data) => {
    let msgs = data?.messages;
    if (typeof msgs === 'string') {
      try { msgs = JSON.parse(msgs); } catch { msgs = []; }
    }
    if (!Array.isArray(msgs)) return [];
    return msgs.filter(m => m && typeof m === 'object' && m.id);
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['lineMessages'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listLineMessages', { limit: INITIAL_FETCH_LIMIT });
      const msgs = parseMessages(res.data);
      setHasMoreOnServer(msgs.length >= INITIAL_FETCH_LIMIT);
      setAllMessages(msgs);
      return msgs;
    },
    refetchInterval: 15_000,
    staleTime: 12_000,
  });

  const loadOlderFromServer = useCallback(async () => {
    if (loadingMore || !hasMoreOnServer) return;
    setLoadingMore(true);
    try {
      const res = await base44.functions.invoke('listLineMessages', {
        limit: LOAD_MORE_BATCH,
        offset: allMessages.length,
      });
      const older = parseMessages(res.data);
      if (older.length === 0) {
        setHasMoreOnServer(false);
      } else {
        setAllMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = older.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMsgs];
        });
        if (older.length < LOAD_MORE_BATCH) setHasMoreOnServer(false);
      }
    } catch (e) {
      console.error('Load older messages failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [allMessages.length, loadingMore, hasMoreOnServer]);

  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async ({ line_user_id, message, display_name, chat_type, file_url, file_type, mentions }) => {
      const res = await base44.functions.invoke('lineSendMessage', { line_user_id, message, display_name, chat_type, file_url, file_type, mentions });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineMessages'] });
      setNewMessage('');
      scrollToBottom('smooth');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileSend = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;
    e.target.value = '';
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isImage = file.type.startsWith('image/');
      sendMutation.mutate({
        line_user_id: selectedUserId, message: file.name,
        display_name: selectedUser?.name, chat_type: selectedUser?.chatType || 'user',
        file_url, file_type: isImage ? 'image' : 'file',
      });
    } catch (err) {
      toast.error('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const markReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await base44.functions.invoke('markLineMessagesRead', { messageIds });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lineMessages'] }),
  });

  // Use allMessages (includes older loaded from server) merged with latest query
  const combinedMessages = useMemo(() => {
    const idSet = new Set();
    const result = [];
    // Latest messages first (from query), then older
    for (const m of messages) { if (!idSet.has(m.id)) { idSet.add(m.id); result.push(m); } }
    for (const m of allMessages) { if (!idSet.has(m.id)) { idSet.add(m.id); result.push(m); } }
    return result;
  }, [messages, allMessages]);

  // Group messages by user
  const userGroups = useMemo(() => {
    const groups = {};
    combinedMessages.forEach(m => {
      const key = m.line_user_id || m.customer_name || 'unknown';
      if (!groups[key]) groups[key] = { id: key, name: m.display_name || m.customer_name || '?', image: '', messages: [], unread: 0, lastDate: m.created_date, chatType: m.chat_type || 'user' };
      groups[key].messages.push(m);
      if (!m.is_read && m.direction === 'incoming') groups[key].unread++;
      if ((m.created_date || '') > (groups[key].lastDate || '')) groups[key].lastDate = m.created_date;
      if (m.profile_image && !groups[key].image) groups[key].image = m.profile_image;
      // Use display_name from the most recent message
      if ((m.created_date || '') >= (groups[key].lastDate || '') && m.display_name) groups[key].name = m.display_name;
    });
    return groups;
  }, [combinedMessages]);

  const userList = Object.values(userGroups)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      return new Date(b.lastDate) - new Date(a.lastDate);
    });

  const selectedUser = selectedUserId ? userGroups[selectedUserId] : null;
  const isGroupChat = selectedUser?.chatType === 'group';

  const { data: lineMembers = [] } = useQuery({
    queryKey: ['lineGroupMembers', selectedUserId],
    queryFn: async () => {
      const res = await base44.functions.invoke('listGroupMembers', { group_id: selectedUserId });
      return res.data?.members || [];
    },
    enabled: !!selectedUserId && isGroupChat,
    staleTime: 60_000,
  });

  const allChatMessages = selectedUser?.messages?.sort((a, b) => parseUTCDate(a.created_date) - parseUTCDate(b.created_date)) || [];
  const totalMessages = allChatMessages.length;
  const hasOlderMessages = totalMessages > visibleCount;
  const chatMessages = hasOlderMessages ? allChatMessages.slice(totalMessages - visibleCount) : allChatMessages;

  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE);
    setReplyTo(null);
    // Load pinned messages for this chat
    setPinnedIds(loadPinnedIds(selectedUserId));
  }, [selectedUserId]);

  const handleLoadOlder = useCallback(() => {
    // If we've shown all local messages, try fetching more from server
    if (visibleCount >= totalMessages && hasMoreOnServer) {
      loadOlderFromServer();
    }
    setVisibleCount(prev => prev + MESSAGES_PER_PAGE);
    setTimeout(() => { chatTopRef.current?.scrollIntoView({ behavior: 'instant' }); }, 50);
  }, [visibleCount, totalMessages, hasMoreOnServer, loadOlderFromServer]);

  useEffect(() => {
    if (selectedUserId) {
      scrollToBottom('instant');
    }
    if (selectedUser) {
      const unreadIds = selectedUser.messages.filter(m => !m.is_read && m.direction === 'incoming').map(m => m.id);
      if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
    }
  }, [selectedUserId, allChatMessages.length]);

  useEffect(() => {
    if (allChatMessages.length > prevMessageCount.current && prevMessageCount.current > 0) {
      scrollToBottom('smooth');
    }
    prevMessageCount.current = allChatMessages.length;
  }, [allChatMessages.length]);

  const handleCaptureSend = async (file) => {
    if (!selectedUserId) return;
    setSendingCapture(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({
        line_user_id: selectedUserId, message: 'Screenshot',
        display_name: selectedUser?.name, chat_type: selectedUser?.chatType || 'user',
        file_url, file_type: 'image',
      });
      setCaptureDialogOpen(false);
    } catch (err) {
      toast.error('ส่ง screenshot ล้มเหลว: ' + err.message);
    } finally {
      setSendingCapture(false);
    }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedUserId) return;
    const msgText = replyTo
      ? `↩️ ${replyTo.sender_name || replyTo.display_name || ''}: "${replyTo.content || ''}"\n\n${newMessage.trim()}`
      : newMessage.trim();
    sendMutation.mutate({
      line_user_id: selectedUserId, message: msgText,
      display_name: selectedUser?.name, chat_type: selectedUser?.chatType || 'user',
      mentions: activeMentions.length > 0 ? activeMentions : undefined,
      reply_to_id: replyTo?.id || undefined,
    });
    setReplyTo(null);
    setActiveMentions([]);
  };

  const handleReply = (msg) => setReplyTo(msg);
  const handleMentionClick = (senderName) => {
    setTriggerMentionName(null);
    setTimeout(() => setTriggerMentionName(senderName), 0);
  };
  const handlePin = (msg) => {
    setPinnedIds(prev => {
      const newIds = prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id];
      // Save to localStorage
      if (selectedUserId) {
        localStorage.setItem(getPinnedKey(selectedUserId), JSON.stringify(newIds));
      }
      return newIds;
    });
  };

  // Group messages by date
  const messagesWithSeparators = [];
  let lastDateStr = '';
  chatMessages.forEach(m => {
    const dateStr = m.created_date ? format(parseUTCDate(m.created_date), 'yyyy-MM-dd') : '';
    if (dateStr && dateStr !== lastDateStr) {
      messagesWithSeparators.push({ type: 'separator', date: m.created_date, key: `sep-${dateStr}` });
      lastDateStr = dateStr;
    }
    messagesWithSeparators.push({ type: 'message', data: m, key: m.id });
  });

  // Not configured banner
  if (!isLineConfigured && configs.length > 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('line_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('line_subtitle')}</p>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md space-y-4 p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">LINE OA ยังไม่ได้ตั้งค่า</h3>
            <p className="text-sm text-muted-foreground">กรุณาตั้งค่า Channel ID, Channel Secret และ Channel Access Token ก่อนใช้งาน Chat</p>
            <Link to="/AppSettings">
              <Button className="gap-2"><Settings className="w-4 h-4" /> ไปตั้งค่า LINE OA</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalUnread = Object.values(userGroups).reduce((s, u) => s + u.unread, 0);

  return (
    <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] flex flex-col">
      {/* Main Chat Container */}
      <div className="flex-1 flex rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* ── Contact Sidebar ── */}
        <div className={`w-full lg:w-[340px] xl:w-[380px] border-r flex flex-col bg-card ${selectedUserId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Sidebar Header */}
          <div className="p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">แชท</h2>
                {totalUnread > 0 && (
                  <p className="text-[11px] text-muted-foreground">{totalUnread} ข้อความใหม่</p>
                )}
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] gap-1.5 border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> LINE
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1">
            {userList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{search ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีข้อความ'}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">เมื่อมีคนส่งข้อความมาจะแสดงที่นี่</p>
              </div>
            ) : userList.map(u => {
              const isActive = selectedUserId === u.id;
              const hasUnread = u.unread > 0;
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 relative
                    ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'}
                    ${hasUnread && !isActive ? 'bg-primary/[0.02]' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden ${u.image ? '' : 'bg-gradient-to-br from-green-400 to-green-600'}`}>
                      {u.image ? (
                        <img src={u.image} className="w-full h-full object-cover" alt="" />
                      ) : u.chatType === 'group' ? (
                        <Users className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-semibold text-sm">{u.name?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    {hasUnread && (
                      <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#06C755] border-2 border-card" />
                    )}
                    {u.chatType === 'group' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center">
                        <Users className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>{u.name}</p>
                      <span className={`text-[10px] shrink-0 ${hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {formatChatDate(u.lastDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs truncate flex-1 ${hasUnread ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
                        {getLastMessagePreview(u.messages)}
                      </p>
                      {hasUnread && (
                        <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {u.unread > 99 ? '99+' : u.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        {/* ── Chat Area ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${selectedUserId ? 'flex' : 'hidden lg:flex'}`}>
          {!selectedUser ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-base font-medium text-muted-foreground/60">เลือกการสนทนา</h3>
                <p className="text-xs text-muted-foreground/40 mt-1">เลือกแชทจากรายชื่อทางซ้ายเพื่อเริ่มสนทนา</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0 h-8 w-8" onClick={() => setSelectedUserId(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="relative shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${selectedUser.image ? '' : 'bg-gradient-to-br from-green-400 to-green-600'}`}>
                    {selectedUser.image ? (
                      <img src={selectedUser.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-white font-semibold text-xs">{selectedUser.name?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{selectedUser.name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {isGroupChat ? `${lineMembers.length || '—'} สมาชิก` : 'LINE Chat'}
                  </p>
                </div>
                {isGroupChat && (
                  <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                    <Users className="w-3 h-3" /> กลุ่ม
                  </Badge>
                )}
              </div>

              {/* Pinned Messages */}
              <PinnedMessages
                messages={allChatMessages}
                pinnedIds={pinnedIds}
                onUnpin={handlePin}
                onScrollTo={(id) => {
                  const el = document.getElementById(`msg-${id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-amber-50');
                    setTimeout(() => el.classList.remove('bg-amber-50'), 2000);
                  }
                }}
              />

              {/* Messages */}
              <ScrollArea className="flex-1" ref={chatScrollRef}>
                <div className="px-4 py-3 space-y-1">
                  {(hasOlderMessages || hasMoreOnServer) && (
                    <div className="flex justify-center py-2">
                      <Button variant="ghost" size="sm" onClick={handleLoadOlder}
                        disabled={loadingMore}
                        className="text-xs text-muted-foreground gap-1.5 hover:text-foreground rounded-full px-4 h-7 bg-muted/50">
                        {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        {loadingMore ? 'กำลังโหลด...' : hasOlderMessages ? `โหลดข้อความเก่า (${totalMessages - visibleCount})` : 'โหลดข้อความเก่าจากเซิร์ฟเวอร์'}
                      </Button>
                    </div>
                  )}
                  <div ref={chatTopRef} />
                  {messagesWithSeparators.map(item => {
                    if (item.type === 'separator') {
                      return <DateSeparator key={item.key} date={item.date} />;
                    }
                    const m = item.data;
                    return (
                      <div key={m.id} id={`msg-${m.id}`} className="transition-colors duration-700 rounded-lg">
                        <ChatBubble
                          message={m}
                          onCreateTask={(msg) => { setTaskMessage(msg); setTaskDialogOpen(true); }}
                          onReply={handleReply}
                          onMentionClick={handleMentionClick}
                          onPin={handlePin}
                          pinnedIds={pinnedIds}
                          onQuoteClick={(msgId) => {
                            const idx = allChatMessages.findIndex(m => m.id === msgId);
                            if (idx >= 0 && idx < totalMessages - visibleCount) {
                              setVisibleCount(totalMessages - idx + 5);
                            }
                            setTimeout(() => {
                              const el = document.getElementById(`msg-${msgId}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                el.classList.add('bg-primary/10');
                                setTimeout(() => el.classList.remove('bg-primary/10'), 2000);
                              }
                            }, 100);
                          }}
                        />
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Reply Preview */}
              {replyTo && (
                <div className="px-4 py-2 border-t bg-muted/30">
                  <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border">
                    <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-primary truncate">{replyTo.sender_name || replyTo.display_name || ''}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{replyTo.content || (replyTo.message_type === 'image' ? '📷 รูปภาพ' : '📎 ไฟล์')}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full hover:bg-destructive/10" onClick={() => setReplyTo(null)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="px-4 py-3 border-t bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt" onChange={handleFileSend} />
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile || sendMutation.isPending}
                      title="แนบไฟล์"
                    >
                      {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => setCaptureDialogOpen(true)}
                      disabled={sendMutation.isPending}
                      title="Capture Screen"
                    >
                      <ScreenShare className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <MentionInput
                      placeholder="พิมพ์ข้อความ..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      disabled={sendMutation.isPending}
                      users={users}
                      lineMembers={lineMembers}
                      chatType={selectedUser?.chatType || 'user'}
                      onMentionsChange={setActiveMentions}
                      triggerMentionName={triggerMentionName}
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    size="icon"
                    className="h-9 w-9 rounded-full shrink-0 bg-green-600 hover:bg-green-700 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ScreenCaptureDialog open={captureDialogOpen} onOpenChange={setCaptureDialogOpen} onSend={handleCaptureSend} sending={sendingCapture} />
      <CreateTaskFromChat open={taskDialogOpen} onOpenChange={setTaskDialogOpen} message={taskMessage} chatDisplayName={selectedUser?.name} />
    </div>
  );
}