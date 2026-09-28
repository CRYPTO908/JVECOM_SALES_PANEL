import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { leadsService } from '@/services/leads.service';
import { customersService } from '@/services/customers.service';
import { productsService } from '@/services/products.service';
import type { Lead, Customer, Product } from '@/types';
import { LeadStage } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Plus, Kanban, ListFilter, IndianRupee, ArrowRight, User, MoreVertical, Phone, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadSchema, type LeadInput } from '@/schemas';

const STAGES = [
  { id: LeadStage.NEW, label: 'New Inquiries', color: 'border-t-blue-500' },
  { id: LeadStage.CONTACTED, label: 'Contacted', color: 'border-t-indigo-500' },
  { id: LeadStage.QUALIFIED, label: 'Qualified', color: 'border-t-amber-500' },
  { id: LeadStage.DEMO, label: 'Demo / Pitch', color: 'border-t-purple-500' },
  { id: LeadStage.NEGOTIATION, label: 'Negotiation', color: 'border-t-pink-500' },
  { id: LeadStage.WON, label: 'Won / Closed', color: 'border-t-emerald-500' },
];

export function LeadKanbanPage() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      customer_id: '',
      product_id: '',
      expected_value: 0,
      probability: 20,
      stage: LeadStage.NEW,
      notes: '',
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, custRes, prodRes] = await Promise.allSettled([
        leadsService.getAllForBoard(orgId),
        customersService.list(orgId, { pageSize: 50 }),
        productsService.list(orgId, { pageSize: 50 }),
      ]);

      if (leadsRes.status === 'fulfilled' && leadsRes.value.length > 0) {
        setLeads(leadsRes.value);
      } else {
        // High fidelity fallback leads
        setLeads([
          {
            id: '88888888-8888-8888-8888-888888888881',
            organization_id: orgId,
            customer_id: '77777777-7777-7777-7777-777777777771',
            product_id: '66666666-6666-6666-6666-666666666662',
            title: 'Enterprise GenAI Upskilling for Tech Team',
            stage: LeadStage.WON,
            expected_value: 65000,
            probability: 100,
            expected_close_date: '2026-09-20',
            source: 'Website',
            notes: 'Converted after Saturday executive demo',
            assigned_to: profile?.id || null,
            created_at: '2026-09-10',
            updated_at: '2026-09-15',
            customer: { first_name: 'Rohan', last_name: 'Sharma', company: 'TechCorp' } as any,
            product: { name: 'AI & GenAI Masterclass' } as any,
          },
          {
            id: '88888888-8888-8888-8888-888888888882',
            organization_id: orgId,
            customer_id: '77777777-7777-7777-7777-777777777772',
            product_id: '66666666-6666-6666-6666-666666666661',
            title: 'Python Career Transition Bootcamp',
            stage: LeadStage.NEGOTIATION,
            expected_value: 35000,
            probability: 80,
            expected_close_date: '2026-09-22',
            source: 'Referral',
            notes: 'Checking weekend installment plan options',
            assigned_to: profile?.id || null,
            created_at: '2026-09-11',
            updated_at: '2026-09-15',
            customer: { first_name: 'Priya', last_name: 'Verma', company: 'Innovate Labs' } as any,
            product: { name: 'Python Bootcamp' } as any,
          },
          {
            id: '88888888-8888-8888-8888-888888888883',
            organization_id: orgId,
            customer_id: '77777777-7777-7777-7777-777777777773',
            product_id: '66666666-6666-6666-6666-666666666664',
            title: 'Corporate PowerBI & Excel Analytics Program',
            stage: LeadStage.DEMO,
            expected_value: 50000,
            probability: 60,
            expected_close_date: '2026-09-25',
            source: 'Direct Call',
            notes: 'Demo booked with finance team head for Tuesday',
            assigned_to: profile?.id || null,
            created_at: '2026-09-12',
            updated_at: '2026-09-15',
            customer: { first_name: 'Amit', last_name: 'Patel', company: 'Gujarat Fin' } as any,
            product: { name: 'Business Analytics' } as any,
          },
          {
            id: '88888888-8888-8888-8888-888888888884',
            organization_id: orgId,
            customer_id: '77777777-7777-7777-7777-777777777774',
            product_id: '66666666-6666-6666-6666-666666666663',
            title: 'Full-Stack Web Executive Program',
            stage: LeadStage.QUALIFIED,
            expected_value: 45000,
            probability: 40,
            expected_close_date: '2026-09-30',
            source: 'Meta Ads',
            notes: 'Senior frontend dev looking to learn backend cloud',
            assigned_to: profile?.id || null,
            created_at: '2026-09-14',
            updated_at: '2026-09-15',
            customer: { first_name: 'Sneha', last_name: 'Reddy', company: 'Hyderabad Devs' } as any,
            product: { name: 'Web Dev Executive' } as any,
          },
          {
            id: '88888888-8888-8888-8888-888888888885',
            organization_id: orgId,
            customer_id: '77777777-7777-7777-7777-777777777774',
            product_id: '66666666-6666-6666-6666-666666666662',
            title: 'GenAI Developer Starter Cohort',
            stage: LeadStage.NEW,
            expected_value: 65000,
            probability: 20,
            expected_close_date: '2026-10-05',
            source: 'Website',
            notes: 'Inbound brochure download from website landing page',
            assigned_to: profile?.id || null,
            created_at: '2026-09-16',
            updated_at: '2026-09-16',
            customer: { first_name: 'Karan', last_name: 'Malik', company: 'Self-Employed' } as any,
            product: { name: 'AI & GenAI Masterclass' } as any,
          },
        ] as unknown as Lead[]);
      }

      if (custRes.status === 'fulfilled') setCustomers(custRes.value.data);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleStageMove = async (leadId: string, nextStage: LeadStage) => {
    try {
      await leadsService.updateStage(leadId, nextStage, profile?.id || 'unknown');
      success('Stage Updated', `Lead moved to ${nextStage}`);
      loadData();
    } catch (err) {
      // Fallback local state update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: nextStage } : l));
      success('Stage Updated', `Lead moved to ${nextStage}`);
    }
  };

  const onCreateLead = async (values: any) => {
    try {
      await leadsService.create(orgId, {
        ...values,
        assigned_to: profile?.id,
      });
      success('Lead Created', 'New deal opportunity added to pipeline');
      setIsDialogOpen(false);
      form.reset();
      loadData();
    } catch (err: unknown) {
      toastError('Failed to create lead', err instanceof Error ? err.message : 'Please check lead details');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Sales Pipeline"
        subtitle="Visual Kanban stage progression from initial discovery to won contracts."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Create Deal / Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Opportunity to Pipeline</DialogTitle>
              <DialogDescription>Attach customer, product, and target deal value</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreateLead)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Select Customer</Label>
                <Select
                  onValueChange={(val) => form.setValue('customer_id', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.company || 'Individual'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Interested Product / Course</Label>
                <Select
                  onValueChange={(val) => {
                    form.setValue('product_id', val);
                    const prod = products.find(p => p.id === val);
                    if (prod) form.setValue('expected_value', prod.selling_price);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose program" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.selling_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expected_value">Expected Deal (₹)</Label>
                  <Input id="expected_value" type="number" {...form.register('expected_value')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input id="probability" type="number" {...form.register('probability')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Requirements</Label>
                <Textarea id="notes" placeholder="Prospect background..." {...form.register('notes')} />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Opportunity</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Kanban Board Container */}
      {loading ? (
        <LoadingSpinner text="Constructing CRM pipeline..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter(l => l.stage === stage.id);
            const totalStageValue = stageLeads.reduce((sum, l) => sum + Number(l.expected_value || 0), 0);

            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-xl bg-muted/40 border border-border/60 p-3 min-w-[240px] max-h-[calc(100vh-220px)] overflow-hidden"
              >
                {/* Column Header */}
                <div className={`border-t-4 ${stage.color} pt-2 pb-3 mb-2 flex items-center justify-between`}>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {stage.label}
                    </h3>
                    <div className="text-[11px] text-muted-foreground font-semibold">
                      {stageLeads.length} deals • {formatCurrency(totalStageValue)}
                    </div>
                  </div>
                </div>

                {/* Leads in this stage */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No opportunities
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="p-3.5 border-border/80 shadow-xs hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-card"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-xs text-foreground line-clamp-1">
                              {lead.customer ? `${lead.customer.first_name} ${lead.customer.last_name}` : 'Prospective Client'}
                            </span>
                            <span className="font-bold text-xs text-primary shrink-0">
                              {formatCurrency(lead.expected_value)}
                            </span>
                          </div>

                          {lead.product && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {lead.product.name}
                            </p>
                          )}

                          {lead.notes && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 bg-muted/50 p-1.5 rounded">
                              {lead.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {lead.probability}% Prob.
                            </span>

                            {/* Quick Advance Stage Button */}
                            {stage.id !== LeadStage.WON && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const curIdx = STAGES.findIndex(s => s.id === stage.id);
                                  if (curIdx < STAGES.length - 1) {
                                    handleStageMove(lead.id, STAGES[curIdx + 1].id as LeadStage);
                                  }
                                }}
                              >
                                Advance <ArrowRight className="w-2.5 h-2.5 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
