'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, RotateCcw, Sparkles } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; context?: { sources: string[]; omitted: number } };

export function SessionChat({ sessionId, topic, examReview, isMember }: {
  sessionId: string; topic: string; examReview: boolean; isMember: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const restoreFocus = useRef(false);
  const conversation = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const element = conversation.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!busy && restoreFocus.current) {
      input.current?.focus();
      restoreFocus.current = false;
    }
  }, [busy]);

  async function send(text = draft) {
    const content = text.trim();
    if (!content || content.length > 4000 || pending.current || !isMember) return;
    pending.current = true;
    const previous = messages;
    const next: Message[] = [...previous, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    controller.current = new AbortController();
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-21) }),
        signal: controller.current.signal,
      });
      const result = await response.json().catch(() => {
        throw new Error('The assistant is temporarily unavailable. Please try again.');
      });
      if (!response.ok) throw new Error(result.error || 'Unable to send your message. Please try again.');
      if (typeof result.message !== 'string' || !result.message.trim()) throw new Error('No response received. Please try again.');
      setMessages([...next, { role: 'assistant', content: result.message, context: result.context }]);
    } catch (cause) {
      if (controller.current?.signal.aborted) return;
      setMessages(previous);
      setDraft(content);
      setError(cause instanceof Error ? cause.message : 'Connection failed. Please try again.');
    } finally {
      pending.current = false;
      restoreFocus.current = true;
      setBusy(false);
    }
  }

  const prompts = [
    { label: examReview ? 'Make a review plan' : 'Plan our study time', text: `Help me create a ${examReview ? 'review' : 'study'} plan for this session.` },
    { label: 'Explain a concept', text: `Help me understand the key concepts in ${topic}.` },
    { label: 'Quiz me', text: `Give me one practice question about ${topic}, and wait for my answer before explaining.` },
  ];

  return <section className="card study-chat" aria-labelledby="study-chat-title">
    <header className="row-between">
      <div className="meta-row"><span className="metric-icon"><Sparkles size={22} /></span><div>
        <p className="eyebrow">A little help, a deeper understanding</p>
        <h2 id="study-chat-title">Your study partner</h2>
      </div></div>
      {messages.length > 0 && <button className="secondary" disabled={busy} onClick={() => { setMessages([]); setError(''); setDraft(''); input.current?.focus(); }}><RotateCcw size={15} /> New chat</button>}
    </header>
    <p className="subtle">Your analyzed course documents, including Dropbox imports, are sent to the study assistant with each message to help explain concepts and plan your review. Only your own private materials are used; up to 5 documents are included within the context limit.</p>
    <div className="chat-conversation" ref={conversation} role="log" aria-label="Study assistant conversation" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 && <div className="chat-welcome"><MessageCircle size={28} /><h3>Let’s figure it out together.</h3><p>What would you like to work on{topic ? ` in ${topic}` : ''}? Share a question and what you’ve tried, or choose a starting point below.</p></div>}
      {messages.map((message, index) => <article key={index} className={`chat-message ${message.role}`}><span className="chat-author">{message.role === 'user' ? 'You' : 'Study partner'}</span><p>{message.content}</p>{message.context && <small className="subtle">{message.context.sources.length ? `Course context: ${message.context.sources.join(" · ")}` : "No analyzed course documents included; this answer uses session context and general knowledge."}{message.context.omitted > 0 && ` · ${message.context.omitted} document(s) not included (analysis unavailable or context limit).`}</small>}</article>)}
      {busy && <p className="chat-thinking" role="status">Thinking through your question…</p>}
    </div>
    {messages.length === 0 && <div className="chat-prompts">{prompts.map(prompt => <button className="secondary" key={prompt.label} disabled={!isMember || busy} onClick={() => void send(prompt.text)}>{prompt.label}</button>)}</div>}
    {!isMember && <p className="notice">Join this session to chat with your study partner.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <form className="chat-composer field" onSubmit={event => { event.preventDefault(); void send(); }}>
      <label htmlFor="study-message">Your message</label>
      <textarea id="study-message" ref={input} value={draft} onChange={event => setDraft(event.target.value)} disabled={!isMember || busy} maxLength={4000} rows={3} placeholder="Paste a practice question, or tell me what you’re reviewing…" onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
      }} />
      <div className="row-between"><small className="subtle">Enter to send · Shift + Enter for a new line</small><button disabled={!isMember || busy || !draft.trim()} type="submit"><ArrowUp size={17} /> {busy ? 'Thinking…' : 'Send'}</button></div>
    </form>
    <small className="chat-footnote subtle">AI can make mistakes. Check important answers against your course materials. This chat is only shown to you and resets when you leave this page.</small>
  </section>;
}
