import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../LanguageContext';

const LEVEL_LABEL = {
  beginner: 'เริ่มต้น',
  intermediate: 'ปานกลาง',
  advanced: 'ชำนาญ',
  expert: 'เชี่ยวชาญ',
};

const LEVEL_BADGE = {
  beginner: 'bg-slate-50 text-slate-600',
  intermediate: 'bg-blue-50 text-blue-600',
  advanced: 'bg-purple-50 text-purple-600',
  expert: 'bg-amber-50 text-amber-700',
};

const SKILL_CATEGORY_LABEL = {
  accounting: 'บัญชี',
  tax: 'ภาษี',
  audit: 'สอบบัญชี',
  software: 'โปรแกรม',
  soft_skill: 'Soft Skill',
  other: 'อื่นๆ',
};

export default function SkillMap({ currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: mySkills = [] } = useQuery({
    queryKey: ['mySkills', currentUser?.email],
    queryFn: () => base44.entities.SkillEntry.filter(
      { user_email: currentUser.email },
      'skill_name',
      100
    ),
    enabled: !!currentUser?.email,
  });

  const deleteSkill = useMutation({
    mutationFn: (id) => base44.entities.SkillEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySkills'] });
    },
  });

  const currentSkills = mySkills.filter(s => !s.is_goal);
  const goalSkills = mySkills.filter(s => s.is_goal);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-indigo-500" /> {t('my_day_skills_title')}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-3 h-3" /> {t('my_day_skills_add')}
        </Button>
      </div>

      {mySkills.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="p-6 text-center">
            <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t('my_day_skills_empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="p-4 space-y-4">
            {/* Current skills */}
            {currentSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('my_day_skills_current')}</p>
                <div className="flex flex-wrap gap-2">
                  {currentSkills.map(skill => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm"
                    >
                      <span>{skill.skill_name}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${LEVEL_BADGE[skill.level] || ''}`}>
                        {LEVEL_LABEL[skill.level] || skill.level}
                      </Badge>
                      <button
                        onClick={() => deleteSkill.mutate(skill.id)}
                        className="text-muted-foreground hover:text-red-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goal skills */}
            {goalSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('my_day_skills_goal')}</p>
                <div className="flex flex-wrap gap-2">
                  {goalSkills.map(skill => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50/50 text-sm"
                    >
                      <span>🎯 {skill.skill_name}</span>
                      <button
                        onClick={() => deleteSkill.mutate(skill.id)}
                        className="text-muted-foreground hover:text-red-500 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SkillFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        currentUser={currentUser}
      />
    </div>
  );
}

function SkillFormDialog({ open, onOpenChange, currentUser }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState('other');
  const [level, setLevel] = useState('beginner');
  const [isGoal, setIsGoal] = useState(false);

  const createSkill = useMutation({
    mutationFn: (data) => base44.entities.SkillEntry.create({
      ...data,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySkills'] });
      toast.success('เพิ่มทักษะแล้ว');
      onOpenChange(false);
      setSkillName('');
      setCategory('other');
      setLevel('beginner');
      setIsGoal(false);
    },
  });

  const handleSubmit = () => {
    if (!skillName.trim()) return;
    createSkill.mutate({
      skill_name: skillName.trim(),
      category,
      level: isGoal ? 'beginner' : level,
      is_goal: isGoal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🎓 {t('my_day_skills_add')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label>{t('my_day_skills_type')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsGoal(false)}
                className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                  !isGoal ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                {t('my_day_skills_type_current')}
              </button>
              <button
                type="button"
                onClick={() => setIsGoal(true)}
                className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${
                  isGoal ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border hover:border-amber-300'
                }`}
              >
                🎯 {t('my_day_skills_type_goal')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('my_day_skills_name')} *</Label>
            <Input
              value={skillName}
              onChange={e => setSkillName(e.target.value)}
              placeholder="เช่น ภาษีเงินได้นิติบุคคล, Excel, Peak Account"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('my_day_skills_category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SKILL_CATEGORY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Level — only for current skills */}
          {!isGoal && (
            <div className="space-y-1.5">
              <Label>{t('my_day_skills_level')}</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!skillName.trim() || createSkill.isPending}
            className="w-full"
          >
            {createSkill.isPending ? 'กำลังบันทึก...' : t('my_day_skills_add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}