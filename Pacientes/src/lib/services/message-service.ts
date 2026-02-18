import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/lib/types/app';

export const messageService = {
  async getConversations(patientId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw error;

    const conversations = (data || []) as Conversation[];
    const doctorIds = Array.from(new Set(conversations.map((conversation) => conversation.doctor_id)));

    if (doctorIds.length === 0) {
      return conversations;
    }

    const { data: doctors } = await supabase.from('profiles').select('id, full_name').in('id', doctorIds);
    const doctorNameById = new Map((doctors || []).map((doctor) => [doctor.id, doctor.full_name]));

    return conversations.map((conversation) => ({
      ...conversation,
      doctor_name: doctorNameById.get(conversation.doctor_id) || null,
    }));
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as Message[];
  },

  async sendMessage(payload: {
    conversation_id: string;
    sender_id: string;
    patient_id: string;
    doctor_id: string;
    content: string;
  }) {
    const { error } = await supabase.from('messages').insert({
      ...payload,
      sender_type: 'patient',
      message_type: 'text',
    });
    if (error) throw error;
  },

  subscribeToConversation(conversationId: string, onChange: () => void) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
