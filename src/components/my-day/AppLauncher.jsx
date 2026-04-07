import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutGrid, Globe, Calculator, FileText, Building2, Users,
  HardDrive, MessageCircle, BookOpen, CreditCard, Scale,
  Briefcase, Mail, Phone, Shield, Database, Folder, Star,
  Link, ExternalLink, Monitor, Smartphone, Cloud, Lock,
  Search, Settings, Zap, Target, Activity, BarChart3, PieChart,
  ClipboardList, Calendar, Clock, DollarSign, Receipt, Landmark,
  GraduationCap, Heart, Home, Key, Layers, Map, Megaphone,
  Package, Printer, Server, Share2, ShoppingCart, Truck, Wifi
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const ICON_MAP = {
  Globe, Calculator, FileText, Building2, Users,
  HardDrive, MessageCircle, BookOpen, CreditCard, Scale,
  Briefcase, Mail, Phone, Shield, Database, Folder, Star,
  Link, ExternalLink, Monitor, Smartphone, Cloud, Lock,
  Search, Settings, Zap, Target, Activity, BarChart3, PieChart,
  ClipboardList, Calendar, Clock, DollarSign, Receipt, Landmark,
  GraduationCap, Heart, Home, Key, Layers, Map, Megaphone,
  Package, Printer, Server, Share2, ShoppingCart, Truck, Wifi, LayoutGrid,
};

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  teal: 'bg-teal-100 text-teal-700',
  slate: 'bg-slate-100 text-slate-700',
};

const CATEGORY_LABEL = {
  tax_gov: '📋 ภาษี & ราชการ',
  accounting: '📊 บัญชี',
  hr_social: '👥 HR & ประกันสังคม',
  internal: '🏢 ระบบภายใน',
  other: '🔗 อื่นๆ',
};

function AppIcon({ icon, color }) {
  const colorClass = COLOR_MAP[color] || COLOR_MAP.blue;

  if (icon && /^[^\x00-\x7F]/.test(icon)) {
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
        <span className="text-xl">{icon}</span>
      </div>
    );
  }

  const IconComp = ICON_MAP[icon] || Globe;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
      <IconComp className="w-5 h-5" />
    </div>
  );
}

function AppTile({ app }) {
  return (
    <a
      href={app.url}
      target={app.open_in_new_tab !== false ? '_blank' : '_self'}
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
    >
      <AppIcon icon={app.icon} color={app.color} />
      <span className="text-[11px] font-medium leading-tight line-clamp-2 group-hover:text-primary">
        {app.name}
      </span>
    </a>
  );
}

export default function AppLauncher({ currentUser }) {
  const { t } = useLanguage();

  const { data: miniApps = [] } = useQuery({
    queryKey: ['miniApps'],
    queryFn: () => base44.entities.MiniApp.list('sort_order', 50),
    staleTime: 120_000,
  });

  const visibleApps = useMemo(() => {
    const userRole = currentUser?.role || 'staff';
    const userDepts = currentUser?.departments || [currentUser?.department].filter(Boolean);

    return miniApps.filter(app => {
      if (app.status !== 'active') return false;
      if (app.target_roles?.length > 0 && !app.target_roles.includes(userRole)) return false;
      if (app.target_departments?.length > 0 && !app.target_departments.some(d => userDepts.includes(d))) return false;
      return true;
    });
  }, [miniApps, currentUser]);

  const grouped = useMemo(() => {
    const groups = {};
    visibleApps.forEach(app => {
      const cat = app.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(app);
    });
    return groups;
  }, [visibleApps]);

  const categoryCount = Object.keys(grouped).length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <LayoutGrid className="w-4 h-4" /> {t('my_day_apps_title')}
      </p>

      {visibleApps.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="p-6 text-center">
            <LayoutGrid className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">ยังไม่มี Mini App — ติดต่อ Admin เพื่อเพิ่ม</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-4 space-y-4">
            {categoryCount <= 1 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {visibleApps.map(app => <AppTile key={app.id} app={app} />)}
              </div>
            ) : (
              Object.entries(CATEGORY_LABEL).map(([cat, label]) => {
                const apps = grouped[cat];
                if (!apps || apps.length === 0) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                      {apps.map(app => <AppTile key={app.id} app={app} />)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}