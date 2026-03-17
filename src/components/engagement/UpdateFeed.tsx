'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/supabase/client';
import { EngagementUpdate } from '@/lib/types';

interface UpdateFeedProps {
  engagementId: string;
  plannerUserId: string;
  coupleUserId: string;
  plannerName: string;
  coupleName: string;
}

export default function UpdateFeed({
  engagementId,
  plannerUserId,
  coupleUserId,
  plannerName,
  coupleName,
}: UpdateFeedProps) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [updates, setUpdates] = useState<EngagementUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUpdates = useCallback(async () => {
    const { data, error } = await supabase
      .from('engagement_updates')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setUpdates(data as EngagementUpdate[]);
    }
    setLoading(false);
  }, [supabase, engagementId]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newContent.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('engagement_updates').insert({
      engagement_id: engagementId,
      author_user_id: user.id,
      content: newContent.trim(),
    });

    if (!error) {
      setNewContent('');
      await loadUpdates();
    }
    setSubmitting(false);
  };

  const getAuthorName = (authorId: string) => {
    if (authorId === plannerUserId) return plannerName;
    if (authorId === coupleUserId) return coupleName;
    return 'Unknown';
  };

  const isPlanner = (authorId: string) => authorId === plannerUserId;

  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Updates</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : updates.length === 0 ? (
        <p className="text-sm text-slate-400">No updates yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {updates.map((update) => {
            const fromPlanner = isPlanner(update.author_user_id);
            return (
              <div
                key={update.id}
                className={`flex ${fromPlanner ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    fromPlanner
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-teal-50 border border-teal-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-xs font-medium ${
                        fromPlanner ? 'text-purple-700' : 'text-teal-700'
                      }`}
                    >
                      {getAuthorName(update.author_user_id)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTimestamp(update.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{update.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write an update..."
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
