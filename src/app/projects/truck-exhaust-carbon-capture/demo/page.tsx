import type { Metadata } from 'next';
import CarbonCaptureDemo from '@/components/carbon-capture/CarbonCaptureDemo';

export const metadata: Metadata = {
  title: 'Truck Exhaust Carbon Capture: 3D walkthrough',
  description:
    'An interactive 3D walkthrough of a carbon capture system mounted on a diesel truck. Orbit, zoom, and step through each part.',
  alternates: { canonical: 'https://arnavchandra.com/projects/truck-exhaust-carbon-capture/demo' },
};

export default function TruckExhaustCarbonCaptureDemoPage() {
  return <CarbonCaptureDemo />;
}
