import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ListTodo, Plus, Trash2, CalendarDays, X } from 'lucide-react';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { th } from 'date-fns/locale';

function TodoRow({ todo, onToggle, onDelete }) {
  const isDone = todo.is_done;
  const hasDueDate = !!todo.due_date;
  const isOverdue = hasDueDate && !isDone && isPast(new Date(todo.due_date + 'T23:59:59'));
  const isDueToday = hasDueDate && !isDone && isToday(new Date(todo.due_date));
  const isDueTomorrow = hasDueDate && !isDone && isTomorrow(new Date(todo.due_date));

  return (
    <div className={`flex items-center gap-2 py-1.5 px-1 rounded-lg group hover:bg-muted/50 transition-colors ${isDone ? 'opacity-50' : ''}`}>
      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) => onToggle.mutate({ id: todo.id, is_done: checked })}
        className="shrink-0"
      />
      <span className={`flex-1 text-xs ${isDone ? 'line-through text-muted-foreground' : ''}`}>
        {todo.title}
      </span>
      {hasDueDate && !isDone && (
        <span className={`text-[10px] shrink-0 ${
          isOverdue ? 'text-red-600 font-semibold' :
          isDueToday ? 'text-amber-600 font-semibold' :
          isDueTomorrow ? 'text-blue-600' : 'text-muted-foreground'
        }`}>
          {isOverdue ? 'เลยกำหนด' :
           isDueToday ? 'วันนี้' :
           isDueTomorrow ? 'พรุ่งนี้' :
           format(new Date(todo.due_date), 'd MMM', { locale: th })}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete.mutate(todo.id)}
      >
        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
      </Button>
    </div>
  );
}

export default function MyTodoList({ currentUser }) {
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);

  const { data: todos = [] } = useQuery({
    queryKey: ['myTodos', currentUser?.email],
    queryFn: () => base44.entities.TodoItem.filter(
      { owner_email: currentUser.email },
      '-created_date',
      50
    ),
    enabled: !!currentUser?.email,
    staleTime: 30_000,
  });

  const pendingTodos = todos.filter(t => !t.is_done);
  const doneTodos = todos.filter(t => t.is_done).slice(0, 5);

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.TodoItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTodos'] });
      setNewTodo('');
      setNewDueDate('');
      setShowDateInput(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_done }) => base44.entities.TodoItem.update(id, { is_done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myTodos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myTodos'] }),
  });

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    addMutation.mutate({
      title: newTodo.trim(),
      is_done: false,
      due_date: newDueDate || undefined,
      owner_email: currentUser.email,
      owner_name: currentUser.full_name || currentUser.email,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <ListTodo className="w-4 h-4" /> To-Do ของฉัน
        {pendingTodos.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">({pendingTodos.length})</span>
        )}
      </p>

      <Card className="shadow-sm border">
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="เพิ่มสิ่งที่ต้องทำ... (Enter เพื่อเพิ่ม)"
              className="text-xs h-8"
              disabled={addMutation.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 shrink-0 ${showDateInput ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setShowDateInput(!showDateInput)}
              title="ตั้งวันกำหนด"
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAdd}
              disabled={!newTodo.trim() || addMutation.isPending}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {showDateInput && (
            <div className="flex items-center gap-2 pl-1">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <Input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="text-xs h-7 w-[160px]"
              />
              {newDueDate && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewDueDate('')}>
                  <X className="w-3 h-3" />
                </Button>
              )}
              <span className="text-[10px] text-muted-foreground">ตั้งวันกำหนด → จะได้รับ email เตือน</span>
            </div>
          )}

          {pendingTodos.length === 0 && doneTodos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">ยังไม่มีรายการ — พิมพ์แล้วกด Enter</p>
          ) : (
            <div className="space-y-0.5">
              {pendingTodos.map(todo => (
                <TodoRow key={todo.id} todo={todo} onToggle={toggleMutation} onDelete={deleteMutation} />
              ))}

              {doneTodos.length > 0 && (
                <>
                  <div className="border-t my-2" />
                  <p className="text-[10px] text-muted-foreground">เสร็จแล้ว</p>
                  {doneTodos.map(todo => (
                    <TodoRow key={todo.id} todo={todo} onToggle={toggleMutation} onDelete={deleteMutation} />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}