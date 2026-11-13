import React from 'react';
import { Button, Input, Textarea, Badge } from './ui';
import { X, Sparkles, Copy, Send, RefreshCw, Flame, Check } from 'lucide-react';

export default function PostPreviewModal({
  isOpen,
  onClose,
  draft,
  isLoading,
  isPublishing,
  onRegenerate,
  onPublish,
  onCopy,
  onUpdateDraftText
}) {
  if (!isOpen) return null;

  // Compute a smart heuristic Hook / Viral score (1.0 - 10.0) based on length, questions, formatting
  const calculateViralScore = (text = '', hook = '') => {
    let score = 7.5;
    if (hook.length > 20 && hook.length < 120) score += 0.8;
    if (text.includes('?')) score += 0.6; // Ends with engagement question
    if (text.includes('#')) score += 0.4; // Has hashtags
    if (text.length >= 850 && text.length <= 1300) score += 0.7; // Optimal character range
    return Math.min(9.8, score).toFixed(1);
  };

  const viralScore = draft ? calculateViralScore(draft.postText, draft.hook) : '8.8';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Post Preview & Viral Strength</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 font-medium text-xs">AI is crafting your technical post...</p>
            </div>
          ) : draft ? (
            <div className="space-y-4">
              {/* Viral Score & Metadata Strip */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Hook Strength Score: {viralScore} / 10</span>
                    <p className="text-xs text-slate-400">Optimal length, sharp hook, and engagement call to action</p>
                  </div>
                </div>
                <Badge variant={Number(viralScore) >= 8.5 ? 'success' : 'default'}>
                  {Number(viralScore) >= 8.5 ? 'High Reach' : 'Solid'}
                </Badge>
              </div>

              {/* Topic & Char Count */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold text-blue-400">Topic: {draft.topic}</span>
                <span className="font-mono">{draft.postText?.length || 0} characters</span>
              </div>

              {/* Post Text */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">LinkedIn Post Text:</label>
                  <span className="text-[11px] text-emerald-400 font-medium">✏️ Editable (tweak before publishing)</span>
                </div>
                <Textarea
                  value={draft.postText || ''}
                  onChange={(e) => onUpdateDraftText?.(e.target.value)}
                  rows={11}
                  className="leading-relaxed font-sans text-xs focus:ring-1 focus:ring-blue-500"
                  placeholder="Review or tweak your post text here..."
                />
              </div>

              {/* First Comment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  First Comment (GitHub / Portfolio link):
                </label>
                <Input value={draft.firstCommentText || ''} readOnly className="text-xs" />
              </div>

              {/* Visual Card Preview */}
              {draft.mediaUrl && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Generated Technical Visual Card:</label>
                    <a href={draft.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline font-medium">Open Full Card</a>
                  </div>
                  <img
                    src={draft.mediaUrl}
                    alt="Visual Card Preview"
                    className="w-full h-auto rounded-xl border border-slate-800 shadow-md object-contain bg-slate-950 max-h-80"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">No draft loaded.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <Button variant="secondary" onClick={onRegenerate} disabled={isLoading || isPublishing} size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCopy} disabled={!draft || isLoading || isPublishing} size="sm">
              <Copy className="w-3.5 h-3.5" /> Copy Text
            </Button>
            <Button variant="default" onClick={onPublish} disabled={!draft || isLoading || isPublishing} size="sm">
              {isPublishing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Now</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
