import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../LanguageContext';
import { useSortableTable } from '@/hooks/useSortableTable';
import SortableHeader from '@/components/shared/SortableHeader';

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  management: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  super_supervisor: 'bg-yellow-100 text-yellow-700',
  staff: 'bg-gray-100 text-gray-700',
};

const DEPT_COLORS = {
  management: 'bg-orange-100 text-orange-700',
  accounting: 'bg-green-100 text-green-700',
  consulting: 'bg-blue-100 text-blue-700',
  audit: 'bg-purple-100 text-purple-700',
  billing: 'bg-yellow-100 text-yellow-700',
  it: 'bg-gray-100 text-gray-700',
};

export default function UserTable({ users, onEdit, onToggleStatus }) {
  const { t } = useLanguage();
  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(users, 'full_name', 'asc');

  return (
    <div className="overflow-x-auto border rounded-lg bg-card">
      <table className="w-full text-left">
        <thead className="border-b bg-muted/30">
          <tr>
            <SortableHeader label="รหัส" field="employee_id" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase" />
            <SortableHeader label="ชื่อ-นามสกุล" field="full_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase" />
            <SortableHeader label="Email" field="email" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase hidden md:table-cell" />
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">เบอร์โทร</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">แผนก</th>
            <SortableHeader label="ตำแหน่ง" field="position" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase hidden sm:table-cell" />
            <SortableHeader label="Role" field="role" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase hidden sm:table-cell" />
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">สถานะ</th>
            <SortableHeader label="สร้างเมื่อ" field="created_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase hidden xl:table-cell" />
            <SortableHeader label="แก้ไขล่าสุด" field="updated_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="uppercase hidden xl:table-cell" />
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase w-10"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={11} className="text-center py-12 text-sm text-muted-foreground">{t('no_data')}</td></tr>
          ) : sorted.map(user => (
            <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5">
                <span className="text-xs font-mono font-medium text-primary">{user.employee_id || '-'}</span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-[10px] font-bold">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{user.full_name || '-'}</p>
                    {user.username && <p className="text-[10px] text-muted-foreground">@{user.username}</p>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <p className="text-xs">{user.phone || '-'}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1 flex-wrap">
                  {(user.departments || (user.department ? [user.department] : [])).map(d => (
                    <Badge key={d} variant="secondary" className={`text-[9px] px-1.5 py-0 ${DEPT_COLORS[d] || ''}`}>
                      {t(`dept_${d}`)}
                    </Badge>
                  ))}
                  {!(user.departments?.length || user.department) && <span className="text-xs text-muted-foreground">-</span>}
                </div>
              </td>
              <td className="px-3 py-2.5 hidden sm:table-cell">
                <p className="text-xs">{user.position || '-'}</p>
              </td>
              <td className="px-3 py-2.5 hidden sm:table-cell">
                <Badge variant="secondary" className={`text-[10px] ${ROLE_COLORS[user.role] || ROLE_COLORS.staff}`}>
                  {t(`role_${user.role}`) || 'Staff'}
                </Badge>
              </td>
              <td className="px-3 py-2.5">
                <Switch
                  checked={user.user_status !== 'inactive'}
                  onCheckedChange={() => onToggleStatus(user)}
                  className="scale-75"
                />
              </td>
              <td className="px-3 py-2.5 hidden xl:table-cell">
                <div className="text-[10px] text-muted-foreground">
                  {user.created_date ? format(new Date(user.created_date), 'dd/MM/yy HH:mm') : '-'}
                  {user.created_by && <p className="truncate">{user.created_by}</p>}
                </div>
              </td>
              <td className="px-3 py-2.5 hidden xl:table-cell">
                <div className="text-[10px] text-muted-foreground">
                  {user.updated_date ? format(new Date(user.updated_date), 'dd/MM/yy HH:mm') : '-'}
                  {user.last_modified_by && <p className="truncate">{user.last_modified_by}</p>}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(user)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}