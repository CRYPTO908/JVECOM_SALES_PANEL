// ============================================================================
// SalesOS — Customers Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { localDb, isLocalStorageMode } from '@/lib/localDb';
import type { Customer, PaginatedResponse } from '@/types';
import type { CustomerInput } from '@/schemas';

interface CustomerFilters {
  search?: string;
  status?: string;
  assigned_to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export const customersService = {
  async list(orgId: string, filters: CustomerFilters = {}): Promise<PaginatedResponse<Customer>> {
    if (isLocalStorageMode()) {
      const items = localDb.getCustomers(orgId, { search: filters.search, status: filters.status });
      return {
        data: items,
        total: items.length,
        page: filters.page || 1,
        pageSize: filters.pageSize || 25,
        totalPages: 1,
      };
    }

    const {
      search, status, assigned_to,
      page = 1, pageSize = 25,
      sortBy = 'created_at', sortDir = 'desc'
    } = filters;

    let query = supabase
      .from('customers')
      .select('*, assigned_salesperson:profiles!customers_assigned_to_fkey(id, first_name, last_name)', { count: 'exact' })
      .eq('organization_id', orgId);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as unknown as Customer[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Customer> {
    if (isLocalStorageMode()) {
      const cust = localDb.getById<Customer>('customers', id);
      if (!cust) throw new Error('Customer not found');
      return cust;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*, assigned_salesperson:profiles!customers_assigned_to_fkey(id, first_name, last_name, email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as unknown as Customer;
  },

  async create(orgId: string, input: CustomerInput): Promise<Customer> {
    if (isLocalStorageMode()) {
      return localDb.createCustomer(orgId, input as any);
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        organization_id: orgId,
        ...input,
        email: input.email || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Customer;
  },

  async update(id: string, input: Partial<CustomerInput>): Promise<Customer> {
    if (isLocalStorageMode()) {
      return localDb.update<Customer>('customers', id, input as any);
    }

    const { data, error } = await supabase
      .from('customers')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Customer;
  },

  async getAll(orgId: string): Promise<Customer[]> {
    if (isLocalStorageMode()) {
      return localDb.getCustomers(orgId);
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, company, status')
      .eq('organization_id', orgId)
      .order('first_name');

    if (error) throw error;
    return (data || []) as unknown as Customer[];
  },
};
