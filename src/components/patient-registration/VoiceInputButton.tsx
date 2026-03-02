import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff } from 'lucide-react';

type VoiceInputButtonProps = {
  onAppendText: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceInputButton({ onAppendText, disabled = false }: VoiceInputButtonProps) {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  const start = async () => {
    resetTranscript();
    await SpeechRecognition.startListening({ language: 'es-MX', continuous: false });
  };

  const stop = () => {
    SpeechRecognition.stopListening();
    const clean = transcript.trim();
    if (clean) onAppendText(clean);
    resetTranscript();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={listening ? 'Detener dictado por voz' : 'Dictar por voz'}
      onClick={listening ? stop : start}
      className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm border ${
        listening
          ? 'bg-red-700 border-red-500 text-white'
          : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
      } disabled:opacity-60`}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening ? 'Detener voz' : 'Hablar'}
    </button>
  );
}

