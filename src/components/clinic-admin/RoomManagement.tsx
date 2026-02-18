import React, { useState, useEffect } from 'react';
import { DoorOpen, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useClinicRooms, type ClinicRoomWithAssignments } from '@/hooks/useClinicRooms';
import { supabase } from '@/lib/supabase';
import RoomOccupancyDashboard from './RoomOccupancyDashboard';

interface RoomFormData {
  room_number: string;
  room_name: string;
  floor: string;
  capacity: number;
  equipment: string[];
  is_active: boolean;
}

const initialForm: RoomFormData = {
  room_number: '',
  room_name: '',
  floor: '',
  capacity: 1,
  equipment: [],
  is_active: true,
};

interface RoomManagementProps {
  clinicId: string | null;
}

export default function RoomManagement({ clinicId }: RoomManagementProps) {
  const { rooms, loading, error, createRoom, updateRoom, deleteRoom } = useClinicRooms(clinicId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RoomFormData>(initialForm);
  const [assignModalRoom, setAssignModalRoom] = useState<ClinicRoomWithAssignments | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string | null; email: string }>>([]);
  const [roomAssignments, setRoomAssignments] = useState<Record<string, Array<{ staff_id: string; full_name: string | null }>>>({});
  const [assignmentsVersion, setAssignmentsVersion] = useState(0);

  useEffect(() => {
    if (!clinicId) return;
    const loadStaff = async () => {
      const { data } = await supabase
        .from('clinic_user_relationships')
        .select('user_id')
        .eq('clinic_id', clinicId)
        .eq('status', 'approved')
        .eq('is_active', true);
      const userIds = (data || []).map((r) => (r as { user_id: string }).user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        setStaffList((profiles || []) as Array<{ id: string; full_name: string | null; email: string }>);
      }
    };
    void loadStaff();
  }, [clinicId]);

  useEffect(() => {
    const loadAssignments = async () => {
      const mapping: Record<string, Array<{ staff_id: string; full_name: string | null }>> = {};
      for (const room of rooms) {
        const { data } = await supabase
          .from('room_assignments')
          .select('staff_id, profiles(full_name)')
          .eq('room_id', room.id);
        const list = (data || []).map((a: { staff_id: string; profiles?: { full_name: string | null } }) => ({
          staff_id: a.staff_id,
          full_name: a.profiles?.full_name ?? null,
        }));
        mapping[room.id] = list;
      }
      setRoomAssignments(mapping);
    };
    if (rooms.length > 0) void loadAssignments();
    else setRoomAssignments({});
  }, [rooms, assignmentsVersion]);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formData.room_number.trim()) return;
    const payload = {
      room_number: formData.room_number.trim(),
      room_name: formData.room_name.trim() || null,
      floor: formData.floor.trim() || null,
      capacity: Math.max(1, formData.capacity),
      equipment: formData.equipment.filter(Boolean),
      is_active: formData.is_active,
    };
    if (editingId) {
      const { error: err } = await updateRoom(editingId, payload);
      if (err) alert(err);
      else resetForm();
    } else {
      const { error: err } = await createRoom(payload);
      if (err) alert(err);
      else resetForm();
    }
  };

  const handleEdit = (room: ClinicRoomWithAssignments) => {
    setFormData({
      room_number: room.room_number,
      room_name: room.room_name || '',
      floor: room.floor || '',
      capacity: room.capacity,
      equipment: room.equipment || [],
      is_active: room.is_active,
    });
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleDelete = async (room: ClinicRoomWithAssignments) => {
    if (!window.confirm(`¿Eliminar consultorio "${room.room_number}"?`)) return;
    const { error: err } = await deleteRoom(room.id);
    if (err) alert(err);
  };

  if (!clinicId) {
    return (
      <div className="text-center py-12 text-gray-400">
        <DoorOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Selecciona una clínica para gestionar consultorios</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-400">Cargando consultorios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <DoorOpen className="h-5 w-5" />
          Consultorios
        </h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
        >
          <Plus className="h-4 w-4" />
          Nuevo consultorio
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
          <h3 className="text-white font-medium">{editingId ? 'Editar consultorio' : 'Nuevo consultorio'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Número / Identificador</label>
              <input
                value={formData.room_number}
                onChange={(e) => setFormData((p) => ({ ...p, room_number: e.target.value }))}
                placeholder="Ej. Consultorio 1, Sala A"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre descriptivo (opcional)</label>
              <input
                value={formData.room_name}
                onChange={(e) => setFormData((p) => ({ ...p, room_name: e.target.value }))}
                placeholder="Ej. Consultorio de Rehabilitación"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Piso</label>
              <input
                value={formData.floor}
                onChange={(e) => setFormData((p) => ({ ...p, floor: e.target.value }))}
                placeholder="Ej. Planta Baja, 1"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Capacidad (doctores simultáneos)</label>
              <input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData((p) => ({ ...p, capacity: parseInt(e.target.value, 10) || 1 }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="room_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-cyan-500"
              />
              <label htmlFor="room_active" className="text-sm text-gray-300">Consultorio activo</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600">
              {editingId ? 'Guardar cambios' : 'Crear'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`bg-gray-800 rounded-lg p-4 border ${room.is_active ? 'border-gray-700' : 'border-gray-600 opacity-75'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-white flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-cyan-400" />
                  {room.room_number}
                  {!room.is_active && <span className="text-xs text-gray-500">(inactivo)</span>}
                </h4>
                {room.room_name && <p className="text-sm text-gray-400 mt-0.5">{room.room_name}</p>}
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  {room.floor && <span>Piso: {room.floor}</span>}
                  <span>Capacidad: {room.capacity}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setAssignModalRoom(room)}
                  className="p-1.5 rounded hover:bg-gray-700 text-cyan-400"
                  title="Asignar personal"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(room)}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(room)}
                  className="p-1.5 rounded hover:bg-gray-700 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Asignados:</p>
              {(roomAssignments[room.id] || []).length === 0 ? (
                <p className="text-sm text-gray-500 italic">Sin asignar</p>
              ) : (
                <ul className="text-sm text-gray-300 space-y-0.5">
                  {(roomAssignments[room.id] || []).map((a) => (
                    <li key={a.staff_id}>{a.full_name || a.staff_id}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-600 rounded-lg">
          <DoorOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay consultorios. Crea uno para comenzar.</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-700">
        <RoomOccupancyDashboard clinicId={clinicId} />
      </div>

      {assignModalRoom && (
        <RoomAssignModal
          room={assignModalRoom}
          staffList={staffList}
          clinicId={clinicId}
          currentAssignments={roomAssignments[assignModalRoom.id] || []}
          onClose={() => setAssignModalRoom(null)}
          onSaved={() => {
            setAssignModalRoom(null);
            setAssignmentsVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

interface RoomAssignModalProps {
  room: ClinicRoomWithAssignments;
  staffList: Array<{ id: string; full_name: string | null }>;
  clinicId: string;
  currentAssignments: Array<{ staff_id: string; full_name: string | null }>;
  onClose: () => void;
  onSaved: () => void;
}

function RoomAssignModal({ room, staffList, clinicId, currentAssignments, onClose, onSaved }: RoomAssignModalProps) {
  const { assignStaffToRoom, removeStaffFromRoom } = useClinicRooms(clinicId);
  const [loading, setLoading] = useState(false);

  const handleAssign = async (staffId: string) => {
    setLoading(true);
    const { error } = await assignStaffToRoom(room.id, staffId);
    setLoading(false);
    if (error) alert(error);
    else onSaved();
  };

  const handleRemove = async (staffId: string) => {
    setLoading(true);
    const { error } = await removeStaffFromRoom(room.id, staffId);
    setLoading(false);
    if (error) alert(error);
    else onSaved();
  };

  const assignedIds = new Set(currentAssignments.map((a) => a.staff_id));
  const availableStaff = staffList.filter((s) => !assignedIds.has(s.id));
  const atCapacity = currentAssignments.length >= room.capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-white mb-4">
          Asignar personal a {room.room_number}
        </h3>
        <div className="space-y-3 mb-4">
          <p className="text-sm text-gray-400">
            Asignados: {currentAssignments.length} / {room.capacity}
          </p>
          {currentAssignments.map((a) => (
            <div key={a.staff_id} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
              <span className="text-white">{a.full_name || a.staff_id}</span>
              <button
                type="button"
                onClick={() => handleRemove(a.staff_id)}
                disabled={loading}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        {!atCapacity && availableStaff.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Agregar:</p>
            {availableStaff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAssign(s.id)}
                disabled={loading}
                className="block w-full text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
              >
                {s.full_name || s.id}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
