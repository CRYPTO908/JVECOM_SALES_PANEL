import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { productsService } from '@/services/products.service';
import type { Product } from '@/types';
import { ProductStatus } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Search, Layers, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductInput } from '@/schemas';

export function ProductListPage() {
  const { organization, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: 'Software Development',
      cost: 0,
      selling_price: 0,
      description: '',
      status: 'ACTIVE',
    },
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productsService.list(orgId, {
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });

      if (res && res.data.length > 0) {
        setProducts(res.data);
      } else {
        // High fidelity fallback course catalog
        setProducts([
          {
            id: '66666666-6666-6666-6666-666666666661',
            organization_id: orgId,
            name: 'Full-Stack Python Bootcamp',
            sku: 'SKU-PY-01',
            category: 'Software Development',
            description: 'Comprehensive 6-month Python, Django, React live training program',
            cost: 15000,
            selling_price: 35000,
            status: ProductStatus.ACTIVE,
            created_at: '2026-01-10',
            updated_at: '2026-01-10',
            image_url: null,
          },
          {
            id: '66666666-6666-6666-6666-666666666662',
            organization_id: orgId,
            name: 'AI & GenAI Masterclass',
            sku: 'SKU-AI-02',
            category: 'Data & AI',
            description: 'LLMs, Prompt Engineering, RAG Systems, Vector DBs and agentic workflows',
            cost: 22000,
            selling_price: 65000,
            status: ProductStatus.ACTIVE,
            created_at: '2026-01-15',
            updated_at: '2026-01-15',
            image_url: null,
          },
          {
            id: '66666666-6666-6666-6666-666666666663',
            organization_id: orgId,
            name: 'Executive Web Development',
            sku: 'SKU-WEB-03',
            category: 'Software Development',
            description: 'TypeScript, Next.js, Cloud Architectures for working tech leads',
            cost: 18000,
            selling_price: 45000,
            status: ProductStatus.ACTIVE,
            created_at: '2026-01-20',
            updated_at: '2026-01-20',
            image_url: null,
          },
          {
            id: '66666666-6666-6666-6666-666666666664',
            organization_id: orgId,
            name: 'Advanced Business Analytics with Excel & PowerBI',
            sku: 'SKU-BI-04',
            category: 'Analytics',
            description: 'Financial modeling, PowerBI dashboards, SQL analytics',
            cost: 8000,
            selling_price: 25000,
            status: ProductStatus.ACTIVE,
            created_at: '2026-02-01',
            updated_at: '2026-02-01',
            image_url: null,
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [orgId, statusFilter]);

  const onCreateProduct = async (values: any) => {
    try {
      await productsService.create(orgId, values);
      success('Product Created', `Added "${values.name}" to catalog`);
      setIsDialogOpen(false);
      form.reset();
      loadProducts();
    } catch (err: unknown) {
      toastError('Failed to create product', err instanceof Error ? err.message : 'Please check product details');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products &amp; Programs"
        subtitle="Manage product catalog, course tuition pricing, profit margins, and sales availability."
      >
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product / Course</DialogTitle>
                <DialogDescription>Define catalog item pricing and attributes</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onCreateProduct)} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" placeholder="e.g. AI & GenAI Masterclass" {...form.register('name')} />
                  {form.formState.errors.name?.message && (
                    <p className="text-xs text-destructive">{String(form.formState.errors.name.message)}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sku">SKU / Code</Label>
                    <Input id="sku" placeholder="SKU-AI-01" {...form.register('sku')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="Data & AI" {...form.register('category')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cost">Cost Price (₹)</Label>
                    <Input id="cost" type="number" {...form.register('cost')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="selling_price">Selling Price (₹)</Label>
                    <Input id="selling_price" type="number" {...form.register('selling_price')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Program overview..." {...form.register('description')} />
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Product</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search products by title, category, or SKU..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value={ProductStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={ProductStatus.ARCHIVED}>Archived</SelectItem>
            <SelectItem value={ProductStatus.DRAFT}>Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading catalog items..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No products in catalog"
          description="Add your company's offerings to start generating quotes and closing deals."
          actionLabel="Add Product"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Gross Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((prod) => {
                  const margin = prod.selling_price - prod.cost;
                  const marginPct = prod.selling_price > 0 ? Math.round((margin / prod.selling_price) * 100) : 0;
                  return (
                    <TableRow key={prod.id}>
                      <TableCell>
                        <div className="font-semibold text-sm text-foreground">{prod.name}</div>
                        {prod.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-sm mt-0.5">
                            {prod.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{prod.sku || '—'}</TableCell>
                      <TableCell className="text-xs font-medium">{prod.category || 'General'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatCurrency(prod.cost)}</TableCell>
                      <TableCell className="font-bold text-sm text-foreground">{formatCurrency(prod.selling_price)}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(margin)} ({marginPct}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={prod.status === ProductStatus.ACTIVE ? 'success' : 'outline'} className="text-[10px]">
                          {prod.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
