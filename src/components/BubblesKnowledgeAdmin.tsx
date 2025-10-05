import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKnowledgeBase, KnowledgeEntry } from '@/hooks/useKnowledgeBase';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  'Tokenomics',
  'Network Stats',
  'Wallets & Holders',
  'Exchanges',
  'Technical',
  'General',
  'Other'
];

export const BubblesKnowledgeAdmin = () => {
  const { entries, loading, addEntry, updateEntry, deleteEntry, refresh } = useKnowledgeBase();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'General',
    title: '',
    content: '',
    priority: 0,
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      category: 'General',
      title: '',
      content: '',
      priority: 0,
      is_active: true
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const success = editingId
      ? await updateEntry(editingId, formData)
      : await addEntry(formData);

    if (success) {
      toast.success(editingId ? 'Knowledge updated!' : 'Knowledge added!');
      resetForm();
    } else {
      toast.error('Failed to save knowledge');
    }
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      priority: entry.priority,
      is_active: entry.is_active
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge entry?')) return;
    
    const success = await deleteEntry(id);
    if (success) {
      toast.success('Knowledge deleted');
    } else {
      toast.error('Failed to delete knowledge');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🧠 Bubbles Knowledge Base</span>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Knowledge
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Teach Bubbles new facts about W-Chain. These will be automatically injected into her responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdding && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{editingId ? 'Edit Knowledge' : 'New Knowledge Entry'}</span>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority (0-10)</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="0"
                        max="10"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Current WCO Price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Detailed information that Bubbles should know..."
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active (visible to Bubbles)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editingId ? 'Update' : 'Add'} Knowledge</Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {loading && <p className="text-muted-foreground">Loading knowledge base...</p>}
            
            {!loading && entries.length === 0 && (
              <p className="text-muted-foreground">No knowledge entries yet. Add your first one above!</p>
            )}

            {entries.map((entry) => (
              <Card key={entry.id} className={!entry.is_active ? 'opacity-50' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{entry.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                        {entry.priority > 0 && (
                          <Badge variant="secondary" className="text-xs">Priority: {entry.priority}</Badge>
                        )}
                        {!entry.is_active && (
                          <Badge variant="destructive" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
