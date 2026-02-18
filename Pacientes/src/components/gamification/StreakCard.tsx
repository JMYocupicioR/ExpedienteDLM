type Props = {
  streakDays: number;
  completedToday: number;
  totalToday: number;
};

export default function StreakCard({ streakDays, completedToday, totalToday }: Props) {
  const ratio = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <section className="rounded-lg border border-slate-800 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 p-4">
      <h2 className="text-sm font-semibold text-cyan-200">Racha de adherencia</h2>
      <p className="mt-1 text-2xl font-bold text-white">{streakDays} dias</p>
      <p className="mt-2 text-sm text-slate-300">
        Completaste {completedToday}/{totalToday} tareas hoy ({ratio}%).
      </p>
    </section>
  );
}
