import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Calendar, DoorOpen } from 'lucide-react';

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface RoomScheduleSlot {
  staff_name: string;
  start: string;
  end: string;
}

interface RoomDayData {
  [day: number]: RoomScheduleSlot[];
}

interface RoomOccupancyRow {
  room_id: string;
  room_number: string;
  room_name: string | null;
  byDay: RoomDayData;
  todayAppointments: number;
}

interface RoomOccupancyDashboardProps {
  clinicId: string | null;
}

export default function RoomOccupancyDashboard({ clinicId }: RoomOccupancyDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RoomOccupancyRow[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    if (!clinicId) return;
    loadOccupancy();
  }, [clinicId]);

  const loadOccupancy = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      const { data: rooms } = await supabase
        .from('clinic_rooms')
        .select('id, room_number, room_name')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('room_number');

      if (!rooms || rooms.length === 0) {
        setRows([]);
        setTotalRooms(0);
        setTodayTotal(0);
        return;
      }

      const roomIds = rooms.map((r) => r.id);

      const { data: assignments } = await supabase
        .from('room_assignments')
        .select('room_id, staff_id')
        .in('room_id', roomIds);

      if (!assignments || assignments.length === 0) {
        setRows(
          rooms.map((r) => ({
            room_id: r.id,
            room_number: r.room_number,
            room_name: r.room_name,
            byDay: {} as RoomDayData,
            todayAppointments: 0,
          }))
        );
        setTotalRooms(rooms.length);
        setTodayTotal(0);
        return;
      }

      const staffIds = [...new Set(assignments.map((a) => a.staff_id))];

      const { data: schedules } = await supabase
        .from('staff_schedules')
        .select('staff_id, day_of_week, start_time, end_time')
        .eq('clinic_id', clinicId)
        .in('staff_id', staffIds)
        .eq('is_available', true);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || '']));

      const staffSchedulesByStaff: Record<string, Array<{ day: number; start: string; end: string }>> = {};
      for (const s of schedules || []) {
        const staffId = (s as { staff_id: string }).staff_id;
        if (!staffSchedulesByStaff[staffId]) staffSchedulesByStaff[staffId] = [];
        staffSchedulesByStaff[staffId].push({
          day: (s as { day_of_week: number }).day_of_week,
          start: (s as { start_time: string }).start_time,
          end: (s as { end_time: string }).end_time,
        });
      }

      const roomToStaff = new Map<string, string[]>();
      for (const a of assignments) {
        const rid = (a as { room_id: string }).room_id;
        const sid = (a as { staff_id: string }).staff_id;
        if (!roomToStaff.has(rid)) roomToStaff.set(rid, []);
        roomToStaff.get(rid)!.push(sid);
      }

      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('room_id')
        .eq('clinic_id', clinicId)
        .eq('appointment_date', today)
        .in('status', ['scheduled', 'confirmed', 'confirmed_by_patient', 'in_progress']);

      const apptsByRoom = new Map<string, number>();
      for (const a of todayAppts || []) {
        const rid = (a as { room_id: string | null }).room_id;
        if (rid) apptsByRoom.set(rid, (apptsByRoom.get(rid) || 0) + 1);
      }

      const result: RoomOccupancyRow[] = rooms.map((r) => {
        const staffIdsForRoom = roomToStaff.get(r.id) || [];
        const byDay: RoomDayData = {};
        for (let d = 0; d < 7; d++) {
          byDay[d] = [];
          for (const sid of staffIdsForRoom) {
            const slots = staffSchedulesByStaff[sid] || [];
            const daySlot = slots.find((s) => s.day === d);
            if (daySlot) {
              byDay[d].push({
                staff_name: profileMap.get(sid) || 'Sin nombre',
                start: daySlot.start.slice(0, 5),
                end: daySlot.end.slice(0, 5),
              });
            }
          }
        }
        return {
          room_id: r.id,
          room_number: r.room_number,
          room_name: r.room_name,
          byDay,
          todayAppointments: apptsByRoom.get(r.id) || 0,
        };
      });

      setRows(result);
      setTotalRooms(rooms.length);
      setTodayTotal((todayAppts || []).length);
    } catch (err) {
      console.error('Error loading occupancy:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  if (!clinicId) return null;

  if (loading) {
    return <div className="text-gray-400 py-4">Cargando ocupación...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        Ocupación por Consultorio
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Consultorios activos</p>
          <p className="text-2xl font-bold text-white">{totalRooms}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Citas hoy</p>
          <p className="text-2xl font-bold text-cyan-400">{todayTotal}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-600 rounded-lg">
          <DoorOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay consultorios o no hay horarios asignados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="text-left px-4 py-3 text-gray-300 font-medium">Consultorio</th>
                {DAY_LABELS.map((_, i) => (
                  <th key={i} className="px-4 py-3 text-center text-gray-300 font-medium text-sm">
                    {DAY_LABELS[i]}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-cyan-400 font-medium text-sm">Hoy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.room_id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {row.room_number}
                      {row.room_name && <span className="text-gray-500 text-sm"> ({row.room_name})</span>}
                    </div>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <td key={day} className="px-4 py-2 text-center">
                      <div className="text-xs text-gray-400 space-y-1">
                        {(row.byDay[day] || []).map((slot, idx) => (
                          <div key={idx} className="truncate" title={`${slot.staff_name} ${slot.start}-${slot.end}`}>
                            <span className="text-cyan-300">{slot.staff_name.split(' ')[0]}</span>
                            <br />
                            <span>{slot.start}-{slot.end}</span>
                          </div>
                        ))}
                        {(row.byDay[day] || []).length === 0 && <span className="text-gray-600">-</span>}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm ${row.todayAppointments > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-500'}`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      {row.todayAppointments}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
