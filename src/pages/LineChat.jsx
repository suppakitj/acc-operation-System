import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle, User, Users, ArrowLeft, AlertCircle, Settings, ChevronUp } from 'lucide-react';
import ChatBubble from '../components/chat/ChatBubble';
import CreateTaskFromChat from '../components/chat/CreateTaskFromChat';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '../components/LanguageContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const MESSAGES_PER_PAGE = 50;

export default function LineChat() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskMessage, setTaskMessage] = useState(null);
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);
  const chatTopRef = useRef(null);

  // Check LINE config
  const { data: configs = [] } = useQuery({
    queryKey: ['appConfig', 'line_oa'],
    queryFn: () => base44.entities.AppConfig.list(),
  });
  const getConfigVal = (key) => configs.find(c => c.key === key)?.value || '';
  const isLineConfigured = !!(getConfigVal('line_channel_id') && getConfigVal('line_channel_secret') && getConfigVal('line_access_token'));

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

  // Send via backend function (actual LINE API)
  const sendMutation = useMutation({
    mutationFn: async ({ line_user_id, message, display_name, chat_type }) => {
      const res = await base44.functions.invoke('lineSendMessage', { line_user_id, message, display_name, chat_type });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineMessages'] });
      setNewMessage('');
    },
    onError: (err) => toast.error(err.message),
  });

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
    if (m.created_date > userGroups[key].lastDate) userGroups[key].lastDate = m.created_date;
    // Keep the latest non-empty profile image
    if (m.profile_image && !userGroups[key].image) userGroups[key].image = m.profile_image;
  });

  const userList = Object.values(userGroups)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

  const selectedUser = selectedUserId ? userGroups[selectedUserId] : null;
  const allChatMessages = selectedUser?.messages?.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) || [];
  const totalMessages = allChatMessages.length;
  const hasOlderMessages = totalMessages > visibleCount;
  const chatMessages = hasOlderMessages ? allChatMessages.slice(totalMessages - visibleCount) : allChatMessages;

  // Reset visible count when switching chats
  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE);
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

  const handleSend = () => {
    if (!newMessage.trim() || !selectedUserId) return;
    sendMutation.mutate({
      line_user_id: selectedUserId,
      message: newMessage.trim(),
      display_name: selectedUser?.name,
      chat_type: selectedUser?.chatType || 'user',
    });
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
                      {u.lastDate && <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(u.lastDate), 'HH:mm')}</span>}
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
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-3 md:p-4">
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
                      <ChatBubble key={m.id} message={m} />
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 border-t flex gap-2 shrink-0">
                <Input
                  placeholder={t('type_message')}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sendMutation.isPending}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim() || sendMutation.isPending} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}