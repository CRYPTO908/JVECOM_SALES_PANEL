import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { IndianRupee, Award, Flame, Download, CheckCircle2, FileText } from 'lucide-react';
import { reportsService } from '@/services/reports.service';

export function CompensationDashboardPage() {
  const { profile, isAdmin } = useAuth();

  const statements = [
    {
      period: 'August 2026',
      rep: 'Arjun Nair',
      grossSales: 650000,
      qualifyingSales: 650000,
      commission: 32500,
      bonus: 20000,
      adjustments: 0,
      totalPayable: 52500,
      status: 'PAID',
    },
    {
      period: 'August 2026',
      rep: 'Kavita Menon',
      grossSales: 520000,
      qualifyingSales: 520000,
      commission: 26000,
      bonus: 15000,
      adjustments: 0,
      totalPayable: 41000,
      status: 'PAID',
    },
    {
      period: 'September 2026 (Live)',
      rep: 'Arjun Nair',
      grossSales: 440000,
      qualifyingSales: 440000,
      commission: 22000,
      bonus: 15000,
      adjustments: 0,
      totalPayable: 37000,
      status: 'PENDING_APPROVAL',
    },
  ];

  const handleExport = () => {
    reportsService.exportCSV(statements, 'compensation-statements');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compensation &amp; Payroll Statements"
        subtitle="Transparent earnings breakdown: gross closed sales, earned commission, bonuses, adjustments, and payable sums."
      >
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Commission Liability"
          value={formatCurrency(80500)}
          icon={<Award className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          title="Total Performance Bonuses"
          value={formatCurrency(50000)}
          icon={<Flame className="w-5 h-5" />}
          variant="warning"
        />
        <StatCard
          title="Net Disbursed"
          value={formatCurrency(93500)}
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          title="Pending Approval"
          value={formatCurrency(37000)}
          description="September live cycle"
          variant="purple"
        />
      </div>

      {/* Statements Table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Monthly Compensation Ledger</CardTitle>
          <CardDescription>Itemized statements ready for payroll disbursement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle</TableHead>
                <TableHead>Sales Rep</TableHead>
                <TableHead className="text-right">Gross Sales</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Adjustments</TableHead>
                <TableHead className="text-right font-bold">Total Payable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((st, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-semibold text-xs text-foreground">{st.period}</TableCell>
                  <TableCell className="text-sm font-medium">{st.rep}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(st.grossSales)}</TableCell>
                  <TableCell className="text-right font-medium text-xs">{formatCurrency(st.commission)}</TableCell>
                  <TableCell className="text-right font-medium text-xs text-amber-600 dark:text-amber-400">
                    +{formatCurrency(st.bonus)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(st.adjustments)}</TableCell>
                  <TableCell className="text-right font-bold text-sm text-foreground">
                    {formatCurrency(st.totalPayable)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.status === 'PAID' ? 'success' : 'outline'} className="text-[10px]">
                      {(st.status ? String(st.status).replace(/_/g, ' ') : 'PENDING')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
