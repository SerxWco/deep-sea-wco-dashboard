import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useKnowledgeBase = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to load knowledge entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const addEntry = async (entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert([entry]);

      if (insertError) throw insertError;
      
      await loadEntries();
      return true;
    } catch (err) {
      console.error('Failed to add entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      return false;
    }
  };

  const updateEntry = async (id: string, updates: Partial<KnowledgeEntry>) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      await loadEntries();
      return true;
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      await loadEntries();
      return true;
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      return false;
    }
  };

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh: loadEntries
  };
};
