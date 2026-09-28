import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { loginSchema, type LoginInput } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Shield, Sparkles, TrendingUp, Users, Award, Lock, Mail, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    const { error } = await signIn(values.email, values.password);
    setLoading(false);

    if (error) {
      toastError('Authentication Failed', error.message || 'Invalid email or password');
    } else {
      toastSuccess('Welcome back!', 'Logged into SalesOS successfully');
      navigate('/');
    }
  };

  // Helper to prefill demo accounts for rapid evaluation
  const setDemoCredentials = (role: 'admin' | 'manager' | 'rep') => {
    if (role === 'admin') {
      form.setValue('email', 'admin@acmelearning.io');
      form.setValue('password', 'password123');
    } else if (role === 'manager') {
      form.setValue('email', 'manager@acmelearning.io');
      form.setValue('password', 'password123');
    } else {
      form.setValue('email', 'rep@acmelearning.io');
      form.setValue('password', 'password123');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Branding & Feature Highlights */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-950 text-white flex-col justify-between p-12 border-r border-neutral-800 relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">SalesOS</span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                Enterprise
              </span>
            </div>
          </div>
          <p className="text-neutral-400 text-sm mt-3 max-w-sm">
            The next-generation sales performance, gamification, and compensation platform for high-velocity teams.
          </p>
        </div>

        <div className="relative z-10 space-y-6 my-auto">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Full-Funnel CRM & Pipeline</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Drag-and-drop Kanban pipeline with activities, follow-ups, and conversion tracking.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Gamification & XP Engine</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Tiered leveling, achievements, real-time leaderboards, and milestones motivate sales reps.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Automated Compensation</h4>
              <p className="text-xs text-neutral-400 mt-0.5">Automated commission calculation, performance bonuses, statements, and refund reversal logic.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-neutral-500 pt-6 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Multi-Tenant &amp; Row Level Security Enabled</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* Right: Login Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">SalesOS</span>
          </div>

          <Card className="border-border/60 shadow-xl shadow-neutral-950/5">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access your organization's workspace
              </CardDescription>
            </CardHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      className="pl-9"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive font-medium">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      {...form.register('password')}
                    />
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive font-medium">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Quick test accounts */}
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Demo Autofill Credentials:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDemoCredentials('admin')}
                    >
                      Admin
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDemoCredentials('manager')}
                    >
                      Manager
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setDemoCredentials('rep')}
                    >
                      Sales Rep
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Sign in to SalesOS
                </Button>
              </CardFooter>
            </form>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Invited by your company?{' '}
            <Link to="/accept-invitation" className="text-primary underline hover:text-primary/80">
              Accept your invitation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
