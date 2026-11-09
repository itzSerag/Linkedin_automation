import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from './ui';
import { Lightbulb, Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';

export default function IdeaBankTab({ ideas = [], onAddIdea, onDeleteIdea, onAiBrainstorm, onDraftIdea, isGeneratingAi }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newLang, setNewLang] = useState('EN');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    onAddIdea({ topic: newTopic.trim(), language: newLang });
    setNewTopic('');
    setShowAddForm(false);
  };

  const pendingIdeas = ideas.filter(i => i.status === 'pending');
  const usedIdeas = ideas.filter(i => i.status === 'used');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Engineering Idea Bank
          </h2>
          <p className="text-xs text-slate-400">
            Log your daily thoughts, or let AI generate senior-level architecture topics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="purple" onClick={onAiBrainstorm} disabled={isGeneratingAi}>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{isGeneratingAi ? 'Brainstorming...' : '✨ AI Brainstorm 5 Ideas'}</span>
          </Button>
          <Button variant="default" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add Idea</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Add Form */}
      {showAddForm && (
        <Card className="p-5 border-blue-500/30">
          <form onSubmit={handleAddSubmit} className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add New Topic to Pipeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Why indexing isn't just 'put an index on foreign keys'"
                  autoFocus
                />
              </div>
              <div>
                <Select value={newLang} onChange={(e) => setNewLang(e.target.value)}>
                  <option value="EN">English 🇬🇧</option>
                  <option value="AR">Arabic 🇸🇦</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button type="submit" variant="default">Save to Bank</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Ideas List */}
      <div className="space-y-3">
        {ideas.length > 0 ? (
          ideas.map((idea) => {
            const isPending = idea.status === 'pending';
            const langBadge = idea.language === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';
            return (
              <Card
                key={idea.id}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${!isPending ? 'opacity-50' : ''}`}
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <Badge variant={idea.language === 'AR' ? 'warning' : 'default'}>{langBadge}</Badge>
                    <Badge variant="secondary">{idea.category || 'Architecture'}</Badge>
                    <Badge variant={isPending ? 'success' : 'secondary'}>
                      {isPending ? 'Pending' : 'Used'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-200">{idea.topic}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isPending && (
                    <Button variant="secondary" onClick={() => onDraftIdea(idea.topic, idea.language)} size="sm">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Draft
                    </Button>
                  )}
                  <Button variant="destructive" size="icon" onClick={() => onDeleteIdea(idea.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 text-center text-xs text-slate-500">
            Idea bank is empty. Tap "Add Idea" or "AI Brainstorm" to populate topics!
          </Card>
        )}
      </div>
    </div>
  );
}
