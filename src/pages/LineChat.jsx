import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle, User, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '../components/LanguageContext';

export default function LineChat() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({ queryKey: ['lineMessages'], queryFn: () => base44.entities.LineMessage.list('-created_date', 500) });
  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.LineMessage.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lineMessages'] }); setNewMessage(''); },
  });

  const userGroups = {};
  messages.forEach(m => {
    const key = m.line_user_id || m.customer_name || 'unknown';
    if (!userGroups[key]) userGroups[key] = { id: key, name: m.display_name || m.customer_name || '?', image: m.profile_image, messages: [], unread: 0 };
    userGroups[key].messages.push(m);
    if (!m.is_read && m.direction === 'incoming') userGroups[key].unread++;
  });

  const userList = Object.values(userGroups).filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()));
  const selectedUser = selectedUserId ? userGroups[selectedUserId] : null;
  const chatMessages = selectedUser?.messages?.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) || [];

  const handleSend = () => {
    if (!newMessage.trim() || !selectedUserId) return;
    sendMutation.mutate({ line_user_id: selectedUserId, display_name: selectedUser?.name, content: newMessage, direction: 'outgoing', message_type: 'text' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{t('line_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('line_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-220px)]">
        {/* Contact List — hidden on mobile when chat selected */}
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
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />{t('no_messages')}
                </div>
              ) : userList.map(u => (
                <div key={u.id} onClick={() => setSelectedUserId(u.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${selectedUserId === u.id ? 'bg-muted' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.image ? <img src={u.image} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.messages[0]?.content}</p>
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
                    {selectedUser.image ? <img src={selectedUser.image} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                  </div>
                  <CardTitle className="text-base">{selectedUser.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-3 md:p-4">
                  <div className="space-y-3">
                    {chatMessages.map(m => (
                      <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2 ${m.direction === 'outgoing' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.direction === 'outgoing' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {m.created_date && format(new Date(m.created_date), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-3 border-t flex gap-2 shrink-0">
                <Input placeholder={t('type_message')} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <Button onClick={handleSend} disabled={!newMessage.trim()} size="icon" className="shrink-0"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}