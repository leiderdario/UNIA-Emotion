import { forwardRef } from 'react';

interface Props {
  className?: string;
  mirrored?: boolean;
}

export const CameraFeed = forwardRef<HTMLVideoElement, Props>(function CameraFeed(
  { className = '', mirrored = true },
  ref
) {
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={className}
      style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
    />
  );
});
