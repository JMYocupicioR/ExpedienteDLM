import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PatientPublicRegistration() {
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);

  const tokenLabel = useMemo(() => token || 'sin token', [token]);

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-100">
          <h1 className="text-lg font-semibold">Registro enviado</h1>
          <p className="mt-2 text-sm text-slate-300">
            Tu informacion fue enviada. Si necesitas actualizarla, solicita un nuevo enlace al medico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-slate-100">
        <h1 className="text-lg font-semibold">Registro de paciente</h1>
        <p className="mt-2 text-sm text-slate-300">Token recibido: {tokenLabel}</p>
        <p className="mt-2 text-sm text-slate-400">
          Esta vista base mantiene la ruta activa para completar el flujo de invitacion por token.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="mt-4 w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          Simular envio
        </button>
      </div>
    </div>
  );
}

