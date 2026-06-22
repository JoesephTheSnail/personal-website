import { getAllProjects } from '@/lib/projects';
import ProjectsList from '@/components/ProjectsList';

export const metadata = {
  title: 'Projects',
  description:
    'Projects by Arnav Chandra — apps, pitch decks, and experiments at the intersection of health and technology, including MindSet.',
  alternates: { canonical: 'https://arnavchandra.com/projects' },
};

export default function ProjectsPage() {
  const projects = getAllProjects();
  return <ProjectsList projects={projects} />;
}
