import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, User, Brain, ChevronDown, ChevronUp, Search, Filter, Trash2, Download, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'question' | 'analysis' | 'recommendation' | 'warning' | 'general';
  metadata?: {
    confidence?: number;
    source?: string;
    relatedSymptoms?: string[];
    suggestedActions?: string[];
  };
}

interface Conversation {
  id: string;
  consultation_id?: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  messages: ConversationMessage[];
  created_at: Date;
  updated_at: Date;
  patient_name?: string;
  is_starred?: boolean;
  tags?: string[];
}

interface MedicalConversationHistoryProps {
  doctorId: string;
  patientId?: string;
  consultationId?: string;
  onConversationSelect?: (conversation: Conversation) => void;
  onMessageReuse?: (message: ConversationMessage) => void;
  isVisible?: boolean;
  className?: string;
}

export default function MedicalConversationHistory({
  doctorId,
  patientId,
  consultationId,
  onConversationSelect,
  onMessageReuse,
  isVisible = true,
  className = ''
}: MedicalConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'patient' | 'starred'>('all');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    if (doctorId) {
      loadConversations();
    }
  }, [doctorId, patientId]);

  // Filter conversations based on search and filter type
  useEffect(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some(msg =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply type filter
    if (filterType === 'patient' && patientId) {
      filtered = filtered.filter(conv => conv.patient_id === patientId);
    } else if (filterType === 'starred') {
      filtered = filtered.filter(conv => conv.is_starred);
    }

    setFilteredConversations(filtered);
  }, [conversations, searchQuery, filterType, patientId]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_conversation_history')
        .select(`
          *,
          patients!inner(full_name)
        `)
        .eq('doctor_id', doctorId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedConversations: Conversation[] = (data || []).map(conv => ({
        id: conv.id,
        consultation_id: conv.consultation_id,
        patient_id: conv.patient_id,
        doctor_id: conv.doctor_id,
        title: conv.title,
        messages: JSON.parse(conv.messages || '[]').map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        created_at: new Date(conv.created_at),
        updated_at: new Date(conv.updated_at),
        patient_name: conv.patients?.full_name,
        is_starred: conv.is_starred,
        tags: conv.tags || []
      }));

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (conversation: Partial<Conversation>) => {
    try {
      const { data, error } = await supabase
        .from('medical_conversation_history')
        .upsert({
          id: conversation.id,
          consultation_id: conversation.consultation_id,
          patient_id: conversation.patient_id!,
          doctor_id: doctorId,
          title: conversation.title!,
          messages: JSON.stringify(conversation.messages),
          is_starred: conversation.is_starred || false,
          tags: conversation.tags || [],
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setConversations(prev => {
        const existing = prev.find(c => c.id === data.id);
        if (existing) {
          return prev.map(c => c.id === data.id ? { ...c, ...conversation } : c);
        } else {
          return [...prev, data as any];
        }
      });

      return data;
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('medical_conversation_history')
        .delete()
        .eq('id', conversationId)
        .eq('doctor_id', doctorId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const toggleStar = async (conversationId: string) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const { error } = await supabase
        .from('medical_conversation_history')
        .update({ is_starred: !conversation.is_starred })
        .eq('id', conversationId)
        .eq('doctor_id', doctorId);

      if (error) throw error;

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, is_starred: !c.is_starred }
            : c
        )
      );
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const exportConversation = (conversation: Conversation) => {
    const content = `Conversación Médica: ${conversation.title}
Paciente: ${conversation.patient_name}
Fecha: ${conversation.created_at.toLocaleString('es-ES')}

${conversation.messages.map(msg => `
${msg.role === 'user' ? 'Médico' : 'IA'} [${msg.timestamp.toLocaleTimeString('es-ES')}]:
${msg.content}
${msg.metadata?.confidence ? `Confianza: ${msg.metadata.confidence}%` : ''}
`).join('\n')}

Exportado el: ${new Date().toLocaleString('es-ES')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversacion_${conversation.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'analysis':
        return <Brain className="h-3 w-3 text-blue-400" />;
      case 'recommendation':
        return <MessageSquare className="h-3 w-3 text-green-400" />;
      case 'warning':
        return <MessageSquare className="h-3 w-3 text-red-400" />;
      default:
        return <MessageSquare className="h-3 w-3 text-gray-400" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Historial de Conversaciones IA
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadConversations}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Actualizar"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas</option>
            {patientId && <option value="patient">Este Paciente</option>}
            <option value="starred">Destacadas</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            Cargando conversaciones...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones guardadas'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-white truncate">
                        {conversation.title}
                      </h4>
                      {conversation.is_starred && (
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      {conversation.patient_name} • {conversation.updated_at.toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100)}...
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={() => toggleStar(conversation.id)}
                      className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      title={conversation.is_starred ? 'Quitar de destacados' : 'Destacar'}
                    >
                      <Star className={`h-3 w-3 ${conversation.is_starred ? 'fill-current text-yellow-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => exportConversation(conversation)}
                      className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                      title="Exportar conversación"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteConversation(conversation.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Eliminar conversación"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setExpandedConversation(
                        expandedConversation === conversation.id ? null : conversation.id
                      )}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedConversation === conversation.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Messages */}
                {expandedConversation === conversation.id && (
                  <div className="mt-3 pt-3 border-t border-gray-600 space-y-2 max-h-48 overflow-y-auto">
                    {conversation.messages.slice(-5).map((message, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 text-xs"
                      >
                        <div className="flex items-center space-x-1 min-w-0">
                          {message.role === 'user' ? (
                            <User className="h-3 w-3 text-blue-400" />
                          ) : (
                            getMessageTypeIcon(message.type)
                          )}
                          <span className="text-gray-400 truncate">
                            {message.role === 'user' ? 'Médico' : 'IA'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300 line-clamp-2">
                            {message.content}
                          </p>
                          {onMessageReuse && (
                            <button
                              onClick={() => onMessageReuse(message)}
                              className="mt-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Reutilizar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}