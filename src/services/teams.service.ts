// ============================================================================
// SalesOS — Teams Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Team, Profile } from '@/types';
import type { TeamInput } from '@/schemas';

export const teamsService = {
  async list(orgId: string) {
    if (isLocalStorageMode()) {
      return localDb.getTeams(orgId);
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*, manager:profiles!teams_manager_id_fkey(id, first_name, last_name, avatar_url)')
      .eq('organization_id', orgId)
      .order('name');

    if (error) throw error;

    // Get member counts
    const { data: counts } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('organization_id', orgId)
      .not('team_id', 'is', null);

    const memberCounts: Record<string, number> = {};
    counts?.forEach(p => {
      const teamId = p.team_id as string;
      memberCounts[teamId] = (memberCounts[teamId] || 0) + 1;
    });

    return (data || []).map(t => ({
      ...t,
      member_count: memberCounts[t.id] || 0,
    })) as unknown as Team[];
  },

  async getById(id: string) {
    if (isLocalStorageMode()) {
      return localDb.getById<Team>('teams', id);
    }

    const { data, error } = await supabase
      .from('teams')
      .select('*, manager:profiles!teams_manager_id_fkey(id, first_name, last_name, avatar_url, email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Team;
  },

  async getMembers(teamId: string) {
    if (isLocalStorageMode()) {
      return localDb.getAll<Profile>('profiles').filter(p => p.team_id === teamId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('team_id', teamId)
      .order('first_name');

    if (error) throw error;
    return data;
  },

  async create(orgId: string, input: TeamInput) {
    if (isLocalStorageMode()) {
      return localDb.createTeam(orgId, input);
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({
        organization_id: orgId,
        name: input.name,
        description: input.description || null,
        manager_id: input.manager_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Team;
  },

  async update(id: string, input: Partial<TeamInput>) {
    if (isLocalStorageMode()) {
      return localDb.update<Team>('teams', id, input as any);
    }

    const { data, error } = await supabase
      .from('teams')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Team;
  },

  async delete(id: string) {
    if (isLocalStorageMode()) {
      localDb.delete('teams', id);
      return;
    }

    const { error } = await supabase
      .from('teams')
      .update({ status: 'INACTIVE' })
      .eq('id', id);

    if (error) throw error;
  },

  async addMember(teamId: string, userId: string, orgId: string) {
    if (isLocalStorageMode()) {
      localDb.update<Profile>('profiles', userId, { team_id: teamId } as any);
      return;
    }

    // Update profile's team
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: teamId })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Add team member history record
    const { error } = await supabase
      .from('team_members')
      .insert({
        organization_id: orgId,
        team_id: teamId,
        user_id: userId,
      });

    if (error) throw error;
  },

  async removeMember(teamId: string, userId: string) {
    if (isLocalStorageMode()) {
      localDb.update<Profile>('profiles', userId, { team_id: null } as any);
      return;
    }

    // Remove from profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('id', userId)
      .eq('team_id', teamId);

    if (profileError) throw profileError;

    // Update team member history
    const { error } = await supabase
      .from('team_members')
      .update({ left_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .is('left_at', null);

    if (error) throw error;
  },
};
