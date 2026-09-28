// ============================================================================
// SalesOS — Targets Service
// Target setting, tracking, progress calculation, and milestones
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Target, TargetMilestone, PaginatedResponse } from '@/types';
import type { TargetInput } from '@/schemas';

interface TargetFilters {
  user_id?: string;
  team_id?: string;
  scope?: string;
  period?: string;
  type?: string;
  is_active?: boolean;
  page?: number;
  pageSize?: number;
}

export const targetsService = {
  async list(orgId: string, filters: TargetFilters = {}): Promise<PaginatedResponse<Target>> {
    if (isLocalStorageMode()) {
      let list = localDb.getAll<Target>('targets');
      if (filters.user_id) list = list.filter(t => t.user_id === filters.user_id);
      if (filters.team_id) list = list.filter(t => t.team_id === filters.team_id);
      return {
        data: list,
        total: list.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      user_id, team_id, scope, period, type, is_active,
      page = 1, pageSize = 25
    } = filters;

    let query = supabase
      .from('targets')
      .select(`
        *,
        user:profiles(id, first_name, last_name, avatar_url),
        team:teams(id, name),
        product:products(id, name),
        milestones:target_milestones(*)
      `, { count: 'exact' })
      .eq('organization_id', orgId);

    if (user_id) query = query.eq('user_id', user_id);
    if (team_id) query = query.eq('team_id', team_id);
    if (scope) query = query.eq('scope', scope);
    if (period) query = query.eq('period', period);
    if (type) query = query.eq('type', type);
    if (is_active !== undefined) query = query.eq('is_active', is_active);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order('period_start', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Target[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Target> {
    const { data, error } = await supabase
      .from('targets')
      .select(`
        *,
        user:profiles(id, first_name, last_name, email, avatar_url),
        team:teams(id, name),
        product:products(id, name),
        milestones:target_milestones(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Target;
  },

  async create(orgId: string, input: TargetInput): Promise<Target> {
    const { data, error } = await supabase
      .from('targets')
      .insert({
        organization_id: orgId,
        user_id: input.user_id || null,
        team_id: input.team_id || null,
        type: input.type,
        scope: input.scope,
        period: input.period,
        target_value: input.target_value,
        current_value: 0,
        period_start: input.period_start,
        period_end: input.period_end,
        product_id: input.product_id || null,
        is_active: true,
      })
      .select(`
        *,
        user:profiles(id, first_name, last_name),
        team:teams(id, name),
        product:products(id, name)
      `)
      .single();

    if (error) throw error;

    // Create default milestones (25%, 50%, 75%, 100%, 125%, 150%)
    const defaultPercentages = [25, 50, 75, 100, 125, 150];
    const milestones = defaultPercentages.map(pct => ({
      organization_id: orgId,
      target_id: data.id,
      milestone_percentage: pct,
      is_reached: false,
    }));

    await supabase.from('target_milestones').insert(milestones);

    return this.getById(data.id);
  },

  async update(id: string, input: Partial<TargetInput>): Promise<Target> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.target_value !== undefined) updates.target_value = input.target_value;
    if (input.period_start !== undefined) updates.period_start = input.period_start;
    if (input.period_end !== undefined) updates.period_end = input.period_end;
    if (input.product_id !== undefined) updates.product_id = input.product_id;

    const { error } = await supabase
      .from('targets')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return this.getById(id);
  },

  async getMilestones(targetId: string): Promise<TargetMilestone[]> {
    const { data, error } = await supabase
      .from('target_milestones')
      .select('*')
      .eq('target_id', targetId)
      .order('milestone_percentage', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as TargetMilestone[];
  },

  async recalculateProgress(targetId: string): Promise<Target> {
    try {
      await supabase.rpc('calculate_target_achievement', { p_target_id: targetId });
    } catch (err) {
      console.warn('RPC calculate_target_achievement fallback:', err);
    }
    return this.getById(targetId);
  }
};
