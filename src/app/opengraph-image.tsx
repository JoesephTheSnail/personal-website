import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  const photoPath = path.join(process.cwd(), 'public', 'profile.jpg');
  const photoData = fs.readFileSync(photoPath);
  const photoSrc = `data:image/jpeg;base64,${photoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D0D0D',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '80px',
          gap: '60px',
          fontFamily: '-apple-system, "Segoe UI", sans-serif',
        }}
      >
        {/* Profile photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt="Arnav Chandra"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}
        />

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', flex: 1 }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '20px',
              letterSpacing: '0.08em',
              marginBottom: '20px',
            }}
          >
            arnavchandra.com
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '76px',
              fontWeight: '700',
              letterSpacing: '-0.02em',
              lineHeight: '1',
              marginBottom: '22px',
            }}
          >
            Arnav Chandra
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '26px',
              fontWeight: '400',
              letterSpacing: '0.01em',
            }}
          >
            Writer · Student · Builder
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
