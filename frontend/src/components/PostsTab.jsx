import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Textarea, Badge } from './ui';
import { History, FileSpreadsheet, ExternalLink, BarChart2, Upload, Check } from 'lucide-react';

export default function PostsTab({ posts = [], onSaveMetrics, onImportCsv }) {
  const [showCsvBox, setShowCsvBox] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [metricsValues, setMetricsValues] = useState({});

  const handleMetricChange = (postId, field, val) => {
    setMetricsValues(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [field]: val
      }
    }));
  };

  const handleSaveMetricClick = (postId, existingMetrics) => {
    const updated = metricsValues[postId] || {};
    const impressions = updated.impressions !== undefined ? updated.impressions : existingMetrics.impressions;
    const reactions = updated.reactions !== undefined ? updated.reactions : existingMetrics.reactions;
    onSaveMetrics(postId, { impressions, reactions, comments: 0 });
  };

  const handleCsvSubmit = (e) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    onImportCsv(csvContent);
    setCsvContent('');
    setShowCsvBox(false);
  };

  return (
    <div className="space-y-6">
      {/* CSV Importer */}
      <Card className="p-6 border-purple-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import Historical LinkedIn Posts (CSV)</h3>
              <p className="text-xs text-slate-400">
                Extracts your top 5 highest-engagement posts from LinkedIn Data Export and teaches the AI your winning voice.
              </p>
            </div>
          </div>
          <Button variant="purple" onClick={() => setShowCsvBox(!showCsvBox)}>
            {showCsvBox ? 'Close' : 'Import CSV'}
          </Button>
        </div>

        {showCsvBox && (
          <form onSubmit={handleCsvSubmit} className="space-y-3 pt-2">
            <p className="text-xs text-slate-400">
              Go to LinkedIn &rarr; <b>Settings & Privacy</b> &rarr; <b>Data Privacy</b> &rarr; <b>Get a copy of your data</b> &rarr; check <b>Posts</b>. Paste `Shares.csv` or `Posts.csv` contents here:
            </p>
            <Textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={4}
              placeholder="Paste Shares.csv or Posts.csv text here..."
              className="font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCsvBox(false)}>Cancel</Button>
              <Button type="submit" variant="default" className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Parse & Train AI on Top Posts
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Post History & Learning Loop
          </h2>
          <p className="text-xs text-slate-400">
            Log impressions and reactions to train your AI writing style on what works.
          </p>
        </div>
      </div>

      {/* Posts Cards */}
      <div className="space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => {
            const langBadge = post.language === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English';
            const m = post.metrics || { impressions: 0, reactions: 0 };
            const currentInputs = metricsValues[post.id] || {};

            return (
              <Card key={post.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={post.language === 'AR' ? 'warning' : 'default'}>{langBadge}</Badge>
                    <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                    <Badge variant={post.publishedToLinkedIn ? 'success' : 'secondary'}>
                      {post.publishedToLinkedIn ? 'Published on LinkedIn' : 'Local Draft'}
                    </Badge>
                  </div>
                  {post.postUrl && post.postUrl.startsWith('http') && (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open in LinkedIn
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Post Content */}
                  <div className="md:col-span-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hook</p>
                    <p className="text-sm font-bold text-white leading-snug">"{post.hook || ''}"</p>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
                      {post.postText}
                    </div>
                    {post.firstCommentText && (
                      <p className="text-xs text-slate-400 mt-2">
                        <b>1st Comment:</b> <span className="italic text-slate-300">{post.firstCommentText}</span>
                      </p>
                    )}
                  </div>

                  {/* Media Visual Card */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visual Card</p>
                    {post.mediaUrl ? (
                      <div>
                        <img
                          src={post.mediaUrl}
                          alt="Post Visual"
                          className="w-full h-auto rounded-lg border border-slate-800 object-cover shadow-md"
                        />
                        <a
                          href={post.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-xs text-blue-400 hover:underline pt-1"
                        >
                          View Full Media
                        </a>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-lg border border-slate-800">
                        No Media Card
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics Logger Bar */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg">
                  <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>Log Engagement (Learning Loop):</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">Views:</span>
                      <Input
                        type="number"
                        value={currentInputs.impressions !== undefined ? currentInputs.impressions : m.impressions}
                        onChange={(e) => handleMetricChange(post.id, 'impressions', Number(e.target.value))}
                        className="w-20 text-center h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">Reactions:</span>
                      <Input
                        type="number"
                        value={currentInputs.reactions !== undefined ? currentInputs.reactions : m.reactions}
                        onChange={(e) => handleMetricChange(post.id, 'reactions', Number(e.target.value))}
                        className="w-16 text-center h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSaveMetricClick(post.id, m)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 text-center text-xs text-slate-500">
            No posts generated yet. Tap "Preview Next Post" to craft your first!
          </Card>
        )}
      </div>
    </div>
  );
}
