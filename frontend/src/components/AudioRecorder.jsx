import { useState, useRef, useCallback, useEffect } from 'react';

export default function AudioRecorder({ onRecorded, label, required = false, onReadyChange }) {
  const [state, setState] = useState('idle'); // idle | recording | done
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  // Notify parent whenever ready state changes
  useEffect(() => {
    onReadyChange?.(state === 'done');
  }, [state, onReadyChange]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('done');
        stream.getTracks().forEach((t) => t.stop());
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        onRecorded(file);
      };

      recorder.start();
      setState('recording');
    } catch {
      alert('Microphone access denied. Please allow microphone access to record audio.');
    }
  }, [onRecorded]);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setAudioUrl(null);
    setState('idle');
    onRecorded(null);
  }, [onRecorded]);

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-600 mb-2">
        {label ?? 'Record spoken translation'}
        {required ? <span className="text-red-500 ml-0.5">*</span> : <span className="text-gray-400"> (optional)</span>}
      </p>

      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <button type="button" onClick={start}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Record
          </button>
        )}
        {state === 'recording' && (
          <button type="button" onClick={stop}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
            <span className="w-2 h-2 rounded bg-white" />
            Stop
          </button>
        )}
        {state === 'done' && (
          <button type="button" onClick={reset}
            className="text-xs text-gray-500 hover:text-red-600 underline">
            Remove recording
          </button>
        )}
      </div>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full mt-2 rounded" />
      )}
    </div>
  );
}
