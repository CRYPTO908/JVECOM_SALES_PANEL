import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { organizationsService } from '@/services/organizations.service';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Building, Shield, Bell, User, CheckCircle2 } from 'lucide-react';

export function SettingsPage() {
  const { organization, profile, isAdmin } = useAuth();
  const orgId = organization?.id || '11111111-1111-1111-1111-111111111111';
  const { success, error: toastError } = useToast();

  const [companyName, setCompanyName] = useState(organization?.name || 'Acme Learning Technologies');
  const [industry, setIndustry] = useState(organization?.industry || 'EdTech & Corporate Training');
  const [currency, setCurrency] = useState(organization?.currency || 'INR');
  const [timezone, setTimezone] = useState(organization?.timezone || 'Asia/Kolkata');
  const [website, setWebsite] = useState(organization?.website || 'https://acmelearning.io');
  const [saving, setSaving] = useState(false);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await organizationsService.update(orgId, {
        name: companyName,
        industry,
        currency,
        timezone,
        website,
      });
      success('Settings Saved', 'Organization profile updated successfully');
    } catch (err: unknown) {
      toastError('Failed to save', err instanceof Error ? err.message : 'Please check parameters');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings &amp; Configuration"
        subtitle="Configure organization parameters, multi-currency tokens, sales qualification rules, and preferences."
      />

      <Tabs defaultValue="org" className="w-full">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="org" className="gap-2">
            <Building className="w-4 h-4" /> Organization
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="w-4 h-4" /> Sales &amp; Qualification
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" /> Personal Profile
          </TabsTrigger>
        </TabsList>

        {/* Organization Profile Tab */}
        <TabsContent value="org" className="pt-4">
          <Card className="border-border/60">
            <form onSubmit={handleSaveOrg}>
              <CardHeader>
                <CardTitle className="text-base">Organization Profile</CardTitle>
                <CardDescription>Primary business identity, regional locale, and default billing currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company / Organization Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Default Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
                        <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                        <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                        <SelectItem value="AED">AED (د.إ) — UAE Dirham</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST - UTC+4:00)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving changes...' : 'Save Organization Settings'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Qualification Rules Tab */}
        <TabsContent value="rules" className="pt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Sales Qualification Policies</CardTitle>
              <CardDescription>Automated criteria for qualifying revenue towards compensation &amp; gamification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Require Payment for Deal Qualification</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, sales only credit commission and XP points once invoice status is marked as PAID.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                  Enabled
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Automatic Refund Reversals</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Immediately revoke earned XP and cancel commission records if a payment is refunded or charged back.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                  Enforced by DB Triggers
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Profile Tab */}
        <TabsContent value="profile" className="pt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Personal Account Information</CardTitle>
              <CardDescription>Your contact details and role in the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={`${profile?.first_name || 'Admin'} ${profile?.last_name || 'User'}`} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={profile?.email || 'admin@acmelearning.io'} disabled />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Role</Label>
                <Input value={profile?.role || 'ORG_ADMIN'} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
