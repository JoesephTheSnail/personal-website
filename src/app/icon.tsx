import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D0D0D',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 4,
          paddingBottom: 6,
        }}
      >
        <div style={{ width: 6, height: 10, background: '#34d399', borderRadius: 2 }} />
        <div style={{ width: 6, height: 16, background: '#fbbf24', borderRadius: 2 }} />
        <div style={{ width: 6, height: 22, background: '#818cf8', borderRadius: 2 }} />
      </div>
    ),
    { ...size }
  );
}
