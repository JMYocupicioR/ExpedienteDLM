import React, { useState, useRef, useEffect } from 'react';
import { Search, User, Users, FileText, Calendar, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface SearchResult {
  id: string;
  type: 'patient' | 'consultation' | 'prescription';
  title: string;
  subtitle: string;
  href: string;
  date?: string;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onNewPatientClick: () => void;
}

export default function SearchBar({ 
  className = '', 
  placeholder = 'Buscar pacientes, consultas, recetas...',
  autoFocus = false,
  onNewPatientClick
}: SearchBarProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search patients
      if (profile?.role === 'doctor' || profile?.role === 'health_staff' || profile?.role === 'admin_staff') {
        const { data: patients } = await supabase
          .from('patients')
          .select('id, full_name, email, phone, created_at')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
          .limit(5);

        patients?.forEach(patient => {
          searchResults.push({
            id: patient.id,
            type: 'patient',
            title: patient.full_name,
            subtitle: patient.email || patient.phone || 'Sin contacto',
            href: `/expediente/${patient.id}`,
            date: patient.created_at
          });
        });
      }

      // Search consultations
      if (profile?.role === 'doctor' || profile?.role === 'health_staff') {
        const { data: consultations } = await supabase
          .from('consultations')
          .select(`
            id, diagnosis, current_condition, created_at,
            patient:patient_id(full_name)
          `)
          .or(`diagnosis.ilike.%${searchQuery}%,current_condition.ilike.%${searchQuery}%`)
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        consultations?.forEach(consultation => {
          searchResults.push({
            id: consultation.id,
            type: 'consultation',
            title: consultation.diagnosis || 'Consulta médica',
            subtitle: `Paciente: ${consultation.patient?.full_name || 'Desconocido'}`,
            href: `/consultations/${consultation.id}`,
            date: consultation.created_at
          });
        });
      }

      // Search prescriptions (if table exists)
      if (profile?.role === 'doctor') {
        // This would be implemented when prescriptions table is available
        // Similar pattern to consultations
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return <User className="h-4 w-4 text-blue-400" />;
      case 'consultation':
        return <FileText className="h-4 w-4 text-green-400" />;
      case 'prescription':
        return <FileText className="h-4 w-4 text-purple-400" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="
            w-full pl-10 pr-10 py-2 
            bg-gray-800 border border-gray-700 rounded-lg
            text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent
            transition-all duration-200
          "
          placeholder={placeholder}
          autoFocus={autoFocus}
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Clear button */}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length > 0 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {loading && query.length > 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
              <span className="ml-2 text-gray-400">Buscando...</span>
            </div>
          )}

          {!loading && query.length > 0 && query.length <= 2 && (
            <div className="px-4 py-8 text-center text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p>Escribe al menos 3 caracteres para buscar</p>
            </div>
          )}

          {!loading && query.length > 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p>No se encontraron resultados</p>
              <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors
                    ${index === selectedIndex ? 'bg-gray-700' : ''}
                    border-b border-gray-700 last:border-b-0
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getResultIcon(result.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {result.title}
                      </p>
                      <p className="text-gray-400 text-sm truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-gray-500 capitalize">
                        {result.type === 'patient' ? 'Paciente' :
                         result.type === 'consultation' ? 'Consulta' :
                         result.type === 'prescription' ? 'Receta' : ''}
                      </span>
                      {result.date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(result.date)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Quick actions */}
              <div className="border-t border-gray-700 mt-2 pt-2">
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                    Acciones rápidas
                  </p>
                  <div className="space-y-1">
                    {profile?.role === 'doctor' && (
                      <>
                        <button
                          onClick={() => {
                            onNewPatientClick();
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="w-full text-left px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          + Nuevo paciente
                        </button>
                        <button
                          onClick={() => {
                            navigate('/consultations/new');
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="w-full text-left px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          + Nueva consulta
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}