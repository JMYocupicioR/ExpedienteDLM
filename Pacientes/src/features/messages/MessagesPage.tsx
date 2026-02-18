import { usePatientAuth } from '@/context/PatientAuthContext';
import { supabase } from '@/lib/supabase';
import { FormEvent, useEffect, useState } from 'react';

type MessageItem = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
};

export default function MessagesPage() {
  const { profile, user } = usePatientAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    if (!profile?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: loadError } = await (supabase as any)
      .from('messages')
      .select('id,content,created_at,sender_id,is_read')
      .eq('patient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (loadError) {
      setError(loadError.message || 'No fue posible cargar mensajes.');
      setLoading(false);
      return;
    }

    setMessages((data as MessageItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadMessages();
  }, [profile?.id]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !profile?.id || !message.trim()) return;

    setSending(true);
    setError(null);

    const payload = {
      patient_id: profile.id,
      doctor_id: profile.primary_doctor_id,
      sender_id: user.id,
      recipient_id: profile.primary_doctor_id,
      clinic_id: profile.clinic_id,
      content: message.trim(),
      is_read: false,
    };

    const { error: insertError } = await (supabase as any).from('messages').insert(payload);
    if (insertError) {
      setError(insertError.message || 'No se pudo enviar el mensaje.');
      setSending(false);
      return;
    }

    setMessage('');
    setSending(false);
    await loadMessages();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-lg font-semibold">Mensajes</h1>
        <p className="mt-1 text-sm text-slate-400">Comunicacion directa con tu medico.</p>
      </section>

      <form onSubmit={submitMessage} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <label htmlFor="message" className="text-sm text-slate-300">
          Nuevo mensaje
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-2 min-h-24 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          placeholder="Escribe tu mensaje para el medico..."
        />
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="mt-3 rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-60"
        >
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      <section className="space-y-2">
        {loading ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">Cargando mensajes...</div>
        ) : null}
        {!loading && messages.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">Sin mensajes aun.</div>
        ) : null}
        {messages.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-200">{item.content}</p>
            <p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
