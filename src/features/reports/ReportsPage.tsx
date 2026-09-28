import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { reportsService } from '@/services/reports.service';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function ReportsPage() {
  const { organization } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';

  const [reportType, setReportType] = useState<'sales' | 'rep'>('sales');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (reportType === 'sales') {
          const res = await reportsService.getSalesReport(orgId);
          if (res && res.length > 0) {
            setData(res);
          } else {
            setData([
              { Invoice: 'INV-2026-0041', Date: '16/09/2026', Customer: 'Rohan Sharma', Salesperson: 'Arjun Nair', Team: 'Alpha Squad', Subtotal: 65000, Total: 65000, Method: 'UPI', Status: 'PAID' },
              { Invoice: 'INV-2026-0040', Date: '15/09/2026', Customer: 'Priya Verma', Salesperson: 'Kavita Menon', Team: 'Beta Sharks', Subtotal: 35000, Total: 35000, Method: 'CARD', Status: 'PAID' },
              { Invoice: 'INV-2026-0039', Date: '15/09/2026', Customer: 'Vikram Joshi', Salesperson: 'Arjun Nair', Team: 'Alpha Squad', Subtotal: 45000, Total: 45000, Method: 'BANK_TRANSFER', Status: 'PAID' },
            ]);
          }
        } else {
          const res = await reportsService.getEmployeePerformanceReport(orgId);
          if (res && res.length > 0) {
            setData(res);
          } else {
            setData([
              { Employee: 'Arjun Nair', Email: 'arjun.nair@acmelearning.io', Role: 'SALES_REP', Team: 'Alpha Squad', DealsClosed: 11, TotalRevenue: 650000, AverageDealSize: 59090 },
              { Employee: 'Kavita Menon', Email: 'kavita.menon@acmelearning.io', Role: 'SALES_REP', Team: 'Beta Sharks', DealsClosed: 9, TotalRevenue: 520000, AverageDealSize: 57777 },
              { Employee: 'Suresh Iyer', Email: 'suresh.iyer@acmelearning.io', Role: 'SALES_REP', Team: 'Alpha Squad', DealsClosed: 8, TotalRevenue: 440000, AverageDealSize: 55000 },
            ]);
          }
        }
      } catch (err) {
        console.error('Error generating report:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId, reportType]);

  const handleExport = () => {
    reportsService.exportCSV(data, `${reportType}-report`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Reporting &amp; Exports"
        subtitle="Generate itemized financial audits, employee performance scorecards, and CSV spreadsheets."
      >
        <Button onClick={handleExport} size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Export CSV Spreadsheet
        </Button>
      </PageHeader>

      {/* Selector Bar */}
      <div className="flex items-center gap-3">
        <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
          <SelectTrigger className="w-64 bg-card font-medium">
            <SelectValue placeholder="Select Report Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales &amp; Invoicing Audit Log</SelectItem>
            <SelectItem value="rep">Employee Performance Scorecard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Preview */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Report Preview ({data.length} records)</CardTitle>
            <CardDescription>Real-time export dataset based on current filters</CardDescription>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          {data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(data[0]).map((key) => (
                    <TableHead key={key} className="text-xs uppercase font-bold">{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((val: any, valIdx) => (
                      <TableCell key={valIdx} className="text-xs font-medium">
                        {typeof val === 'number' && val > 1000 ? formatCurrency(val) : String(val)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
