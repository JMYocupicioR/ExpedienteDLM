import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type ClinicRoom = Database['public']['Tables']['clinic_rooms']['Row'];
type ClinicRoomInsert = Database['public']['Tables']['clinic_rooms']['Insert'];
type RoomAssignment = Database['public']['Tables']['room_assignments']['Row'] & {
  clinic_rooms?: ClinicRoom | null;
  profiles?: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'email'> | null;
};

export interface ClinicRoomWithAssignments extends ClinicRoom {
  room_assignments?: RoomAssignment[];
}

let clinicRoomsTableAvailable: boolean | null = null;

export function useClinicRooms(clinicId: string | null) {
  const [rooms, setRooms] = useState<ClinicRoomWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    const clinicRoomsEnabled =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('dlm.enableClinicRooms') === '1';
    if (!clinicRoomsEnabled) {
      setRooms([]);
      setLoading(false);
      return;
    }
    if (!clinicId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    if (clinicRoomsTableAvailable === false) {
      setRooms([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('clinic_rooms')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('room_number');

      if (fetchError) throw fetchError;
      clinicRoomsTableAvailable = true;
      setRooms((data as ClinicRoomWithAssignments[]) || []);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '42P01') {
        clinicRoomsTableAvailable = false;
      }
      setError(err instanceof Error ? err.message : 'Error al cargar consultorios');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    void fetchRooms();
  }, [fetchRooms]);

  const createRoom = useCallback(
    async (payload: ClinicRoomInsert) => {
      if (!clinicId) return { error: 'Sin clínica' };
      try {
        const { data, error: insertError } = await supabase
          .from('clinic_rooms')
          .insert({ ...payload, clinic_id: clinicId })
          .select()
          .single();
        if (insertError) throw insertError;
        await fetchRooms();
        return { data, error: null };
      } catch (err: unknown) {
        return { data: null, error: err instanceof Error ? err.message : 'Error al crear consultorio' };
      }
    },
    [clinicId, fetchRooms]
  );

  const updateRoom = useCallback(
    async (roomId: string, payload: Partial<ClinicRoomInsert>) => {
      try {
        const { error: updateError } = await supabase
          .from('clinic_rooms')
          .update(payload)
          .eq('id', roomId);
        if (updateError) throw updateError;
        await fetchRooms();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al actualizar consultorio' };
      }
    },
    [fetchRooms]
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      try {
        const { error: deleteError } = await supabase.from('clinic_rooms').delete().eq('id', roomId);
        if (deleteError) throw deleteError;
        await fetchRooms();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al eliminar consultorio' };
      }
    },
    [fetchRooms]
  );

  const getRoomAssignments = useCallback(async (roomId: string) => {
    const { data, error: assignError } = await supabase
      .from('room_assignments')
      .select(`
        *,
        clinic_rooms(*),
        profiles(id, full_name, email)
      `)
      .eq('room_id', roomId);
    if (assignError) throw assignError;
    return data as RoomAssignment[];
  }, []);

  const assignStaffToRoom = useCallback(
    async (roomId: string, staffId: string, isPrimary = false) => {
      if (!clinicId) return { error: 'Sin clínica' };
      try {
        const room = rooms.find((r) => r.id === roomId);
        if (!room) return { error: 'Consultorio no encontrado' };

        const { data: currentAssignments } = await supabase
          .from('room_assignments')
          .select('staff_id')
          .eq('room_id', roomId);
        const assignedIds = (currentAssignments || []).map((a) => a.staff_id);
        const isAlreadyAssigned = assignedIds.includes(staffId);
        const atCapacity = assignedIds.length >= room.capacity;

        if (atCapacity && !isAlreadyAssigned) {
          return { error: `El consultorio tiene capacidad máxima (${room.capacity})` };
        }

        const { error: upsertError } = await supabase.from('room_assignments').upsert(
          { room_id: roomId, staff_id: staffId, clinic_id: clinicId, is_primary: isPrimary },
          { onConflict: 'room_id,staff_id' }
        );
        if (upsertError) throw upsertError;
        await fetchRooms();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al asignar personal' };
      }
    },
    [clinicId, rooms, fetchRooms]
  );

  const removeStaffFromRoom = useCallback(
    async (roomId: string, staffId: string) => {
      try {
        const { error: removeError } = await supabase
          .from('room_assignments')
          .delete()
          .eq('room_id', roomId)
          .eq('staff_id', staffId);
        if (removeError) throw removeError;
        await fetchRooms();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al quitar asignación' };
      }
    },
    [fetchRooms]
  );

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomAssignments,
    assignStaffToRoom,
    removeStaffFromRoom,
  };
}
