import { supabase } from '@/lib/supabase';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message || 'No fue posible iniciar sesion.');
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Portal del paciente</h1>
          <p className="text-sm text-slate-400">Inicia sesion para consultar pendientes, citas y avances.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-300" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-500 focus:ring-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="text-xs text-slate-400">
          Si todavia no tienes cuenta, completa primero tu expediente desde el enlace del medico.
        </p>
      </div>
    </div>
  );
}
