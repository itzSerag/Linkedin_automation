import React from 'react';
import { Button, Input, Textarea, Badge } from './ui';
import { X, Sparkles, Copy, Send, RefreshCw, Flame } from 'lucide-react';

export default function PostPreviewModal({
  isOpen,
  onClose,
  draft,
  error,
  isLoading,
  isPublishing,
  onRegenerate,
  onPublish,
  onCopy,
  onUpdateDraftText
}) {
  if (!isOpen) return null;

  const calculateDraftScore = (text = '', hook = '') => {
    let score = 7.5;
    if (hook.length > 20 && hook.length < 120) score += 0.8;
    if (text.includes('?')) score += 0.6;
    if (text.includes('#')) score += 0.4;
    if (text.length >= 850 && text.length <= 1300) score += 0.7;
    return Math.min(9.8, score).toFixed(1);
  };

  const draftScore = draft ? calculateDraftScore(draft.postText, draft.hook) : '—';

  return (
    <div className="fixed inset-0 z-50 bg-slate-100/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-preview-title"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="px-5 sm:px-7 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="post-preview-title" className="text-base font-bold text-slate-100">Post studio</h3>
              <p className="text-xs text-slate-500">Shape the words. Check the visual. Publish when ready.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close post studio" className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-7 overflow-y-auto flex-1 text-sm">
          {isLoading ? (
            <div className="min-h-80 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300 font-medium text-sm">Putting the draft together…</p>
              <p className="text-slate-500 text-xs">Writing the post and drawing its visual card.</p>
            </div>
          ) : error ? (
            <div role="alert" className="max-w-xl mx-auto my-16 p-5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-sm">
              <p className="font-semibold">Couldn’t generate the draft</p>
              <p className="mt-1 text-xs text-rose-700">{error}</p>
            </div>
          ) : draft ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5 lg:gap-7">
              <section className="space-y-4 min-w-0">
                {(draft.isMock || draft.warning) && (
                  <div role="status" className="p-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                    <p className="font-semibold">Preview only</p>
                    <p className="mt-1">{draft.warning || 'This fallback post cannot be published.'}</p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-[#fff5e8] border border-[#f0ddc6] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#bd593d] flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-100">Draft structure: {draftScore} / 10</span>
                      <p className="text-xs text-slate-500">A rough check for hook, length, and formatting—not a reach prediction.</p>
                    </div>
                  </div>
                  <Badge variant={Number(draftScore) >= 8.5 ? 'success' : 'default'}>
                    {Number(draftScore) >= 8.5 ? 'Ready to review' : 'Needs a pass'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Topic</p>
                    <p className="font-semibold text-blue-400 truncate">{draft.topic}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{draft.postText?.length || 0} characters</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-slate-300" htmlFor="post-draft-text">Post copy</label>
                    <span className="text-[11px] text-emerald-700 font-medium">Editable</span>
                  </div>
                  <Textarea
                    id="post-draft-text"
                    value={draft.postText || ''}
                    onChange={(e) => onUpdateDraftText?.(e.target.value)}
                    rows={17}
                    className="leading-relaxed text-sm resize-y"
                    placeholder="Review or tweak your post text here…"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300" htmlFor="first-comment">First comment</label>
                  <Input id="first-comment" value={draft.firstCommentText || ''} readOnly placeholder="No first comment for this draft" className="text-xs" />
                </div>
              </section>

              <section className="min-w-0 space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Visual direction</p>
                    <h4 className="text-sm font-semibold text-slate-100">Post card preview</h4>
                  </div>
                  {draft.cardType && <Badge variant="purple">{draft.cardType}</Badge>}
                </div>
                {draft.mediaUrl ? (
                  <a href={draft.mediaUrl} target="_blank" rel="noreferrer" className="group block rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-sm">
                    <img
                      src={draft.mediaUrl}
                      alt="Generated visual card for this LinkedIn post"
                      className="w-full h-auto rounded-xl object-contain max-h-[34rem]"
                    />
                    <span className="block text-center text-xs text-slate-500 group-hover:text-blue-400 py-2">Open full size ↗</span>
                  </a>
                ) : (
                  <div className="min-h-72 rounded-2xl border border-dashed border-slate-700 bg-slate-950 flex items-center justify-center text-center p-8">
                    <p className="text-xs text-slate-500">No visual card was returned for this draft.</p>
                  </div>
                )}
                <p className="text-xs text-slate-500 leading-relaxed">The preview card is generated separately from the post copy. Use Settings to choose a visual style and accent.</p>
              </section>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-500">No draft loaded.</div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70">
          <Button variant="secondary" onClick={onRegenerate} disabled={isLoading || isPublishing} size="sm">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Regenerate
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCopy} disabled={!draft || isLoading || isPublishing} size="sm">
              <Copy className="w-3.5 h-3.5" /> Copy Text
            </Button>
            <Button variant="default" onClick={onPublish} disabled={!draft || draft.isMock || Boolean(draft.warning) || isLoading || isPublishing} size="sm">
              {isPublishing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{draft?.isMock || draft?.warning ? 'Preview Only' : 'Publish Now'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
