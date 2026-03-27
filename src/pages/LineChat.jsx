import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle, User, Users, ArrowLeft, AlertCircle, Settings, ChevronUp, Paperclip, Loader2, Image as ImageIcon, ScreenShare } from 'lucide-react';
import ChatBubble from '../components/chat/ChatBubble';
import CreateTaskFromChat from '../components/chat/CreateTaskFromChat';
import ScreenCaptureDialog from '../components/chat/ScreenCaptureDialog';
import PinnedMessages from '../components/chat/PinnedMessages';
import MentionInput from '../components/chat/MentionInput';
import { format } from 'date-fns';
import { parseUTCDate } from '@/lib/dateUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '../components/LanguageContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const MESSAGES_PER_PAGE = 10;

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
  const [pinnedIds, setPinnedIds] = useState([]);
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);
  const chatTopRef = useRef(null);

  const [activeMentions, setActiveMentions] = useState([]);

  // Check LINE config
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'line_oa'],
    queryFn: () => base44.entities.AppConfig.list(),
  });
  const getConfigVal = (key) => configs.find(c => c.key === key)?.value || '';
  const isLineConfigured = !!(getConfigVal('line_channel_id') && getConfigVal('line_channel_secret') && getConfigVal('line_access_token'));

  // Fetch users for @mention
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data?.users || [];
    },
    staleTime: 2 * 60_000,
  });

  // Poll messages every 15s to reduce API load
  const { data: messages = [] } = useQuery({
    queryKey: ['lineMessages'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listLineMessages', {});
      return res.data?.messages || [];
    },
    refetchInterval: 15_000,
    staleTime: 12_000,
  });

  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Send via backend function (actual LINE API)
  const sendMutation = useMutation({
    mutationFn: async ({ line_user_id, message, display_name, chat_type, file_url, file_type }) => {
      const res = await base44.functions.invoke('lineSendMessage', { line_user_id, message, display_name, chat_type, file_url, file_type });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineMessages'] });
      setNewMessage('');
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
        line_user_id: selectedUserId,
        message: file.name,
        display_name: selectedUser?.name,
        chat_type: selectedUser?.chatType || 'user',
        file_url,
        file_type: isImage ? 'image' : 'file',
      });
    } catch (err) {
      toast.error('อัปโหลดไฟล์ล้มเหลว: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Mark messages as read (via backend to access service-role data)
  const markReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      await base44.functions.invoke('markLineMessagesRead', { messageIds });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lineMessages'] }),
  });

  // Group messages by user
  const userGroups = {};
  messages.forEach(m => {
    const key = m.line_user_id || m.customer_name || 'unknown';
    if (!userGroups[key]) userGroups[key] = { id: key, name: m.display_name || m.customer_name || '?', image: '', messages: [], unread: 0, lastDate: m.created_date, chatType: m.chat_type || 'user' };
    userGroups[key].messages.push(m);
    if (!m.is_read && m.direction === 'incoming') userGroups[key].unread++;
    if (parseUTCDate(m.created_date) > parseUTCDate(userGroups[key].lastDate)) userGroups[key].lastDate = m.created_date;
    // Keep the latest non-empty profile image
    if (m.profile_image && !userGroups[key].image) userGroups[key].image = m.profile_image;
  });

  const userList = Object.values(userGroups)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

  const selectedUser = selectedUserId ? userGroups[selectedUserId] : null;

  // Determine if current chat is a group
  const isGroupChat = selectedUser?.chatType === 'group';

  // Fetch LINE group members for selected group chat
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

  // Reset visible count and reply when switching chats
  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE);
    setReplyTo(null);
  }, [selectedUserId]);

  const handleLoadOlder = useCallback(() => {
    setVisibleCount(prev => prev + MESSAGES_PER_PAGE);
    // Keep scroll position near top after loading
    setTimeout(() => {
      chatTopRef.current?.scrollIntoView({ behavior: 'instant' });
    }, 50);
  }, []);

  // Auto-scroll and mark read
  useEffect(() => {
    if (selectedUserId && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (selectedUser) {
      const unreadIds = selectedUser.messages.filter(m => !m.is_read && m.direction === 'incoming').map(m => m.id);
      if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
    }
  }, [selectedUserId, messages.length]);

  const handleCaptureSend = async (file) => {
    if (!selectedUserId) return;
    setSendingCapture(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMutation.mutate({
        line_user_id: selectedUserId,
        message: 'Screenshot',
        display_name: selectedUser?.name,
        chat_type: selectedUser?.chatType || 'user',
        file_url,
        file_type: 'image',
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
      line_user_id: selectedUserId,
      message: msgText,
      display_name: selectedUser?.name,
      chat_type: selectedUser?.chatType || 'user',
      mentions: activeMentions.length > 0 ? activeMentions : undefined,
      reply_to_id: replyTo?.id || undefined,
    });
    setReplyTo(null);
    setActiveMentions([]);
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
  };

  const handlePin = (msg) => {
    setPinnedIds(prev =>
      prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
    );
  };

  // Not configured banner
  if (!isLineConfigured && configs.length > 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('line_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('line_subtitle')}</p>
        </div>
        <Card className="border-yellow-300 bg-yellow-50/50">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto" />
            <h3 className="font-semibold text-lg">LINE OA ยังไม่ได้ตั้งค่า</h3>
            <p className="text-sm text-muted-foreground">กรุณาตั้งค่า Channel ID, Channel Secret และ Channel Access Token ก่อนใช้งาน Chat</p>
            <Link to="/AppSettings">
              <Button className="gap-2 mt-2"><Settings className="w-4 h-4" /> ไปตั้งค่า LINE OA</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('line_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('line_subtitle')}</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> LINE Connected
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-220px)]">
        {/* Contact List */}
        <Card className={`lg:col-span-1 flex flex-col ${selectedUserId ? 'hidden lg:flex' : 'flex'}`}>
          <CardHeader className="pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {userList.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>{t('no_messages')}</p>
                  <p className="text-[11px] mt-1">เมื่อมีคนส่งข้อความมาที่ LINE OA จะแสดงที่นี่</p>
                </div>
              ) : userList.map(u => (
                <div key={u.id} onClick={() => setSelectedUserId(u.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${selectedUserId === u.id ? 'bg-muted' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.image ? <img src={u.image} className="w-full h-full object-cover" alt="" /> : (u.chatType === 'group' ? <Users className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.lastDate && <span className="text-[10px] text-muted-foreground shrink-0">{format(parseUTCDate(u.lastDate), 'HH:mm')}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {(() => {
                        const last = u.messages[u.messages.length - 1];
                        if (!last) return '';
                        if (last.message_type === 'image') return '🖼️ รูปภาพ';
                        if (last.message_type === 'sticker') return '😊 Sticker';
                        if (last.message_type === 'file') return '📎 ไฟล์';
                        return last.content;
                      })()}
                    </p>
                  </div>
                  {u.unread > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">{u.unread}</Badge>}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={`lg:col-span-2 flex flex-col ${selectedUserId ? 'flex' : 'hidden lg:flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>{t('select_chat')}</p></div>
            </div>
          ) : (
            <>
              <CardHeader className="pb-2 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setSelectedUserId(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {selectedUser.image ? <img src={selectedUser.image} className="w-full h-full object-cover" alt="" /> : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedUser.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground">LINE User ID: {selectedUserId.substring(0, 12)}...</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
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
                <ScrollArea className="flex-1 p-3 md:p-4">
                  <div className="space-y-3">
                    {hasOlderMessages && (
                      <div className="flex justify-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadOlder}
                          className="text-xs text-muted-foreground gap-1.5 hover:text-foreground"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          โหลดข้อความเก่า ({totalMessages - visibleCount} ข้อความ)
                        </Button>
                      </div>
                    )}
                    <div ref={chatTopRef} />
                    {chatMessages.map(m => (
                      <div key={m.id} id={`msg-${m.id}`} className="transition-colors duration-1000 rounded-lg">
                      <ChatBubble
                        message={m}
                        onCreateTask={(msg) => { setTaskMessage(msg); setTaskDialogOpen(true); }}
                        onReply={handleReply}
                        onPin={handlePin}
                        pinnedIds={pinnedIds}
                        onQuoteClick={(msgId) => {
                          // If the message is not visible, load more
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
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              {replyTo && (
                <div className="px-3 pt-2 pb-0 border-t bg-muted/30 flex items-center gap-2">
                  <div className="flex-1 min-w-0 border-l-2 border-primary pl-2 py-1">
                    <p className="text-[11px] font-medium text-primary truncate">{replyTo.sender_name || replyTo.display_name || ''}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{replyTo.content || (replyTo.message_type === 'image' ? '🖼️ รูปภาพ' : '📎 ไฟล์')}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyTo(null)}>
                    <span className="text-xs">✕</span>
                  </Button>
                </div>
              )}
              <div className={`p-3 ${!replyTo ? 'border-t' : ''} flex gap-2 shrink-0`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt"
                  onChange={handleFileSend}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || sendMutation.isPending}
                  title="แนบไฟล์/รูปภาพ"
                >
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setCaptureDialogOpen(true)}
                  disabled={sendMutation.isPending}
                  title="Capture Screen"
                >
                  <ScreenShare className="w-4 h-4" />
                </Button>
                <MentionInput
                  placeholder={t('type_message')}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sendMutation.isPending}
                  users={users}
                  lineMembers={lineMembers}
                  chatType={selectedUser?.chatType || 'user'}
                  onMentionsChange={setActiveMentions}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Screen Capture dialog */}
      <ScreenCaptureDialog
        open={captureDialogOpen}
        onOpenChange={setCaptureDialogOpen}
        onSend={handleCaptureSend}
        sending={sendingCapture}
      />

      {/* Create Task from LINE message dialog */}
      <CreateTaskFromChat
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        message={taskMessage}
        chatDisplayName={selectedUser?.name}
      />
    </div>
  );
}