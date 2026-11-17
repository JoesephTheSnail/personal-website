'use client';

import dynamic from 'next/dynamic';

// three.js and the scene are client-only and heavy, so they load after the
// page shell instead of being server-rendered
const Scene3D = dynamic(() => import('./Scene3D'), { ssr: false });

/** The full-viewport 3D walkthrough. Shared by the public route and the
 *  scratch preview route so there is one copy of this wrapper. */
export default function CarbonCaptureDemo() {
  return (
    <div className="native-cursor" style={{ position: 'fixed', inset: 0, background: '#dce9f2' }}>
      <Scene3D />
    </div>
  );
}
