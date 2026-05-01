import { supabase } from '@/integrations/supabase/client';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';
import { authService } from './authService';

export type AuthorType = 'editor' | 'municipality' | 'partner';

export interface CuratedList {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_type: AuthorType | null;
  is_published: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface CuratedActivitySummary {
  id: string;
  name: string;
  description: string | null;
  imageurlthumb: string | null;
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  age_buckets: string[];
  activity_type: string[];
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
}

export interface CuratedListItem {
  id: string;
  activity_id: string;
  sort_order: number;
  note: string | null;
}

export interface CuratedListItemWithActivity extends CuratedListItem {
  activity: CuratedActivitySummary;
}

export interface EditableListItem {
  activity_id: string;
  name: string;
  imageurlthumb: string | null;
  sort_order: number;
  note: string;
}

export interface CuratedActivitySearchResult {
  id: string;
  name: string;
  imageurlthumb: string | null;
  location_address: string | null;
  min_price: number | null;
  max_price: number | null;
}

export interface OrgProfile {
  org_name: string;
  org_type: 'municipality' | 'partner';
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  verified: boolean;
}

export interface CuratedListDetailResult {
  list: CuratedList;
  items: CuratedListItemWithActivity[];
  orgProfile: OrgProfile | null;
}

export interface CuratedListDraft {
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_type: AuthorType | null;
  is_published: boolean;
  created_by?: string | null;
}

function curatedClient() {
  return supabase as any;
}

function normalizeEditableItems(rows: any[] | null | undefined): EditableListItem[] {
  return (rows || [])
    .filter(row => row.activity !== null)
    .map(row => ({
      activity_id: row.activity_id,
      name: row.activity.name,
      imageurlthumb: row.activity.imageurlthumb,
      sort_order: row.sort_order,
      note: row.note || '',
    }));
}

function normalizeItemsWithActivities(rows: any[] | null | undefined): CuratedListItemWithActivity[] {
  return (rows || []).filter((item): item is CuratedListItemWithActivity => item.activity !== null);
}

async function replaceListItems(listId: string, items: EditableListItem[]): Promise<void> {
  const client = curatedClient();
  const { error: deleteError } = await client.from('curated_list_items').delete().eq('list_id', listId);
  throwIfError('curatedListsService.replaceListItems.delete', deleteError);

  if (items.length === 0) return;

  const { error: insertError } = await client
    .from('curated_list_items')
    .insert(items.map(item => ({
      list_id: listId,
      activity_id: item.activity_id,
      sort_order: item.sort_order,
      note: item.note || null,
    })));

  throwIfError('curatedListsService.replaceListItems.insert', insertError);
}

export const curatedListsService = {
  async listPublished(): Promise<CuratedList[]> {
    assertSupabaseProvider('curatedListsService.listPublished');
    assertCapability('view_activities');

    const { data, error } = await curatedClient()
      .from('curated_lists')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    throwIfError('curatedListsService.listPublished', error);
    return (data || []) as CuratedList[];
  },

  async listAll(): Promise<CuratedList[]> {
    assertSupabaseProvider('curatedListsService.listAll');
    assertCapability('manage_curated_lists');

    const { data, error } = await curatedClient()
      .from('curated_lists')
      .select('*')
      .order('created_at', { ascending: false });

    throwIfError('curatedListsService.listAll', error);
    return (data || []) as CuratedList[];
  },

  async listForCurrentOrg(): Promise<CuratedList[]> {
    assertSupabaseProvider('curatedListsService.listForCurrentOrg');
    assertCapability('manage_curated_lists');

    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await curatedClient()
      .from('curated_lists')
      .select('id, slug, title, description, author_name, author_type, is_published, created_at, created_by')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    throwIfError('curatedListsService.listForCurrentOrg', error);
    return (data || []) as CuratedList[];
  },

  async getBySlug(slug: string): Promise<CuratedListDetailResult | null> {
    assertSupabaseProvider('curatedListsService.getBySlug');
    assertCapability('view_activities');

    const client = curatedClient();
    const { data: list, error: listError } = await client
      .from('curated_lists')
      .select('id, slug, title, description, cover_image_url, author_name, author_type, created_by, is_published, created_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (listError || !list) return null;

    const orgProfile = list.created_by ? await this.getOrgProfileForUser(list.created_by) : null;

    const { data: items, error: itemsError } = await client
      .from('curated_list_items')
      .select(`
        id,
        activity_id,
        sort_order,
        note,
        activity:activity_id (
          id, name, description, imageurlthumb,
          min_price, max_price, location_address,
          age_buckets, activity_type, urlmoreinfo, urlmoreinfo_status
        )
      `)
      .eq('list_id', list.id)
      .order('sort_order', { ascending: true });

    throwIfError('curatedListsService.getBySlug.items', itemsError);

    return {
      list: list as CuratedList,
      items: normalizeItemsWithActivities(items),
      orgProfile,
    };
  },

  async getEditable(id: string, ownerUserId?: string): Promise<{ list: CuratedList; items: EditableListItem[] } | null> {
    assertSupabaseProvider('curatedListsService.getEditable');
    assertCapability('manage_curated_lists');

    const client = curatedClient();
    let query = client.from('curated_lists').select('*').eq('id', id);
    if (ownerUserId) query = query.eq('created_by', ownerUserId);

    const { data: list, error } = await query.single();
    if (error || !list) return null;

    const { data: items, error: itemsError } = await client
      .from('curated_list_items')
      .select(`
        activity_id,
        sort_order,
        note,
        activity:activity_id (id, name, imageurlthumb, location_address, min_price, max_price)
      `)
      .eq('list_id', id)
      .order('sort_order', { ascending: true });

    throwIfError('curatedListsService.getEditable.items', itemsError);
    return { list: list as CuratedList, items: normalizeEditableItems(items) };
  },

  async searchActivities(query: string): Promise<CuratedActivitySearchResult[]> {
    assertSupabaseProvider('curatedListsService.searchActivities');
    assertCapability('search_activities');

    const trimmed = query.trim();
    if (!trimmed) return [];

    const { data, error } = await supabase
      .from('activityspots')
      .select('id, name, imageurlthumb, location_address, min_price, max_price')
      .ilike('name', `%${trimmed}%`)
      .limit(20);

    throwIfError('curatedListsService.searchActivities', error);
    return (data || []) as CuratedActivitySearchResult[];
  },

  async saveList(input: { id?: string; list: CuratedListDraft; items: EditableListItem[] }): Promise<string> {
    assertSupabaseProvider('curatedListsService.saveList');
    assertCapability('manage_curated_lists');

    const client = curatedClient();
    let listId = input.id;

    if (listId) {
      const { error } = await client
        .from('curated_lists')
        .update(input.list)
        .eq('id', listId);
      throwIfError('curatedListsService.saveList.update', error);
    } else {
      const { data, error } = await client
        .from('curated_lists')
        .insert(input.list)
        .select('id')
        .single();
      throwIfError('curatedListsService.saveList.insert', error);
      listId = data.id;
    }

    await replaceListItems(listId!, input.items);
    return listId!;
  },

  async setPublished(id: string, isPublished: boolean): Promise<void> {
    assertSupabaseProvider('curatedListsService.setPublished');
    assertCapability('manage_curated_lists');

    const { error } = await curatedClient()
      .from('curated_lists')
      .update({ is_published: isPublished })
      .eq('id', id);

    throwIfError('curatedListsService.setPublished', error);
  },

  async deleteList(id: string): Promise<void> {
    assertSupabaseProvider('curatedListsService.deleteList');
    assertCapability('manage_curated_lists');

    const { error } = await curatedClient().from('curated_lists').delete().eq('id', id);
    throwIfError('curatedListsService.deleteList', error);
  },

  async getCurrentOrgProfile(): Promise<OrgProfile | null> {
    assertSupabaseProvider('curatedListsService.getCurrentOrgProfile');
    assertCapability('manage_curated_lists');

    const user = await authService.getCurrentUser();
    if (!user) return null;
    return this.getOrgProfileForUser(user.id);
  },

  async getOrgProfileForUser(userId: string): Promise<OrgProfile | null> {
    assertSupabaseProvider('curatedListsService.getOrgProfileForUser');

    const { data, error } = await curatedClient()
      .from('org_profiles')
      .select('org_name, org_type, description, logo_url, website_url, verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throwIfError('curatedListsService.getOrgProfileForUser', error);
    return (data as OrgProfile | null) || null;
  },
};
