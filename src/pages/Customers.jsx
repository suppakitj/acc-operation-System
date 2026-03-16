import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Building2 } from 'lucide-react';
import StatusBadge from '../components/shared/StatusBadge';
import ServiceBadge from '../components/shared/ServiceBadge';
import CustomerForm from '../components/customers/CustomerForm';
import { useLanguage } from '../components/LanguageContext';

export default function Customers() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list('-created_date') });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); setEditingCustomer(null); },
  });

  const filtered = customers.filter(c =>
    !search || c.company_name?.toLowerCase().includes(search.toLowerCase()) || c.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (data) => {
    if (editingCustomer) updateMutation.mutate({ id: editingCustomer.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{t('customers_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('customers_subtitle')} — {customers.length} {t('companies')}</p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); setShowForm(true); }} className="gap-2 shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> {t('add_customer')}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">{t('no_data')}</div>
        ) : (
          filtered.map(customer => (
            <Card key={customer.id} className="hover:shadow-md transition-all cursor-pointer group"
              onClick={() => { setEditingCustomer(customer); setShowForm(true); }}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{customer.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{customer.tax_id || '-'}</p>
                    </div>
                  </div>
                  <StatusBadge status={customer.status} />
                </div>
                {customer.contact_person && (
                  <p className="text-xs text-muted-foreground mb-2">{t('contact_person')}: {customer.contact_person}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {customer.services?.map(s => <ServiceBadge key={s} service={s} />)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCustomer ? t('edit_customer') : t('add_customer')}</DialogTitle></DialogHeader>
          <CustomerForm customer={editingCustomer} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}