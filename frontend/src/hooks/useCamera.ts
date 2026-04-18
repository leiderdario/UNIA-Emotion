import { useCallback, useEffect, useRef, useState } from 'react';

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  status: 'idle' | 'requesting' | 'active' | 'error' | 'stopped';
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    status: 'idle',
  });

  const stop = useCallback(() => {
    setState((prev) => {
      prev.stream?.getTracks().forEach((t) => t.stop());
      return { stream: null, error: null, status: 'stopped' };
    });
  }, []);

  const start = useCallback(async () => {
    setState({ stream: null, error: null, status: 'requesting' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setState({ stream, error: null, status: 'active' });
    } catch (err) {
      const msg = (err as Error).message || 'CameraError';
      setState({ stream: null, error: msg, status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (state.stream && videoRef.current) {
      videoRef.current.srcObject = state.stream;
    }
    return () => {
      if (!state.stream) return;
      state.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stream]);

  useEffect(() => {
    return () => {
      state.stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, start, stop, ...state };
}
