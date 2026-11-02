import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Trash2,
  Download,
  Edit3,
  Check,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';
import { ConversationRecord } from '../types';

interface HistoryViewProps {
  conversations: ConversationRecord[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAllConversations,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleDraft, setEditTitleDraft] = useState('');

  const filtered = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    const matchesTitle = conv.title.toLowerCase().includes(q);
    const matchesMessages = conv.messages.some((m) => m.text.toLowerCase().includes(q));
    return matchesTitle || matchesMessages;
  });

  const handleExportConversation = (conv: ConversationRecord) => {
    const lines = [
      `JARVIS AI — Conversation Export`,
      `Title: ${conv.title}`,
      `Updated: ${conv.updatedAt}`,
      `Model: ${conv.model}`,
      `----------------------------------------`,
      ...conv.messages.map(
        (m) => `[${m.timestamp}] ${m.role === 'user' ? 'Sir' : 'JARVIS'}:\n${m.text}\n`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_history.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3.5 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 text-[#C89DA6] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search conversation history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved chats or Smali snippets..."
            className="w-full rounded-xl bg-[#0B0305] border border-[#DC2626]/35 pl-8 pr-3 py-2 text-xs text-white placeholder-[#7F525B] focus:border-[#EF4444] focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onNewConversation}
          className="flex items-center gap-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white shrink-0"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New</span>
        </button>

        {conversations.length > 0 && (
          <button
            type="button"
            onClick={onClearAllConversations}
            className="flex items-center gap-1 rounded-xl bg-[#240910] hover:bg-[#380E18] border border-[#DC2626]/30 px-2.5 py-2 text-xs text-[#FCA5A5] shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-[#C89DA6]">
        Stored locally on device. Old conversations are never uploaded automatically—only the
        active thread context is sent when you message JARVIS.
      </p>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-[#130609] border border-[#DC2626]/20 p-6 text-center text-xs text-[#C89DA6]">
            No matching conversations found, Sir.
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;
            const lastMsg = conv.messages[conv.messages.length - 1];

            return (
              <div
                key={conv.id}
                className={`rounded-xl p-3.5 border transition-all ${
                  isActive
                    ? 'bg-[#220910] border-[#EF4444]'
                    : 'bg-[#130609] border-[#DC2626]/25 hover:border-[#DC2626]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editTitleDraft}
                        onChange={(e) => setEditTitleDraft(e.target.value)}
                        className="flex-1 rounded-lg bg-[#090204] border border-[#EF4444] px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editTitleDraft.trim()) {
                            onRenameConversation(conv.id, editTitleDraft.trim());
                          }
                          setEditingId(null);
                        }}
                        aria-label="Save conversation title"
                        className="p-1.5 rounded-lg bg-[#DC2626] text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className="text-left flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />
                        <span className="font-semibold text-xs text-white">{conv.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#C89DA6]">
                        <span>{conv.updatedAt}</span>
                        <span aria-hidden="true">·</span>
                        <span>{conv.messages.length} msgs</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[#F87171]">{conv.model}</span>
                      </div>
                    </button>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.id)}
                      className="px-2 py-1 rounded-lg bg-[#DC2626]/20 hover:bg-[#DC2626] text-[11px] font-medium text-white flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Open</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(conv.id);
                        setEditTitleDraft(conv.title);
                      }}
                      aria-label={`Rename ${conv.title}`}
                      className="p-1.5 rounded-lg text-[#C89DA6] hover:text-white"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportConversation(conv)}
                      aria-label={`Export ${conv.title}`}
                      className="p-1.5 rounded-lg text-[#C89DA6] hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteConversation(conv.id)}
                      aria-label={`Delete ${conv.title}`}
                      className="p-1.5 rounded-lg text-[#FCA5A5] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {lastMsg && (
                  <p className="mt-2 text-[11px] text-[#C89DA6] line-clamp-2">
                    {lastMsg.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
