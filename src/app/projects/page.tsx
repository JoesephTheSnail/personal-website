import { getAllProjects } from '@/lib/projects';
import ProjectsList from '@/components/ProjectsList';

export const metadata = { title: 'Projects — Arnav Chandra' };

export default function ProjectsPage() {
  const projects = getAllProjects();
  return <ProjectsList projects={projects} />;
}
