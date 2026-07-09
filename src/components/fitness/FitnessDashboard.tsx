'use client';

import { useState } from 'react';
import { FaChartBar, FaCalendarAlt } from 'react-icons/fa';
import type { OverviewData, PlanData } from '@/lib/fitness/types';
import { TabBar, type FitnessTab } from './ui';
import PlanSection from './PlanSection';
import OverviewSection from './OverviewSection';

const TABS: FitnessTab[] = [
  { key: 'overview', label: 'Overview', icon: FaChartBar },
  { key: 'plan',     label: 'Plan',     icon: FaCalendarAlt },
];

interface Props {
  overview: OverviewData;
  plan: PlanData;
}

export default function FitnessDashboard({ overview, plan }: Props) {
  const [active, setActive] = useState('overview');

  return (
    <div>
      <TabBar tabs={TABS} active={active} onChange={setActive} />
      {active === 'overview' && <OverviewSection data={overview} />}
      {active === 'plan' && <PlanSection data={plan} />}
    </div>
  );
}
