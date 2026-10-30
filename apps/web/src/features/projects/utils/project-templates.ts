import { TEMPLATES } from '@/features/canvas/templates/templates';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import type { Project } from '@/features/projects/types/project.types';
import type { SystemEdge, SystemNode } from '@/features/canvas/types/canvas.types';

/** Number of real components (excludes notes and groups). */
export function countComponents(nodes: { type?: string }[]) {
  return nodes.filter((n) => n.type === 'system').length;
}

/** Load stored projects first so a write never replaces them with an empty list. */
async function ensureLoaded() {
  const store = useProjectStore.getState();
  if (!store.loaded && !store.loading) {
    await store.loadProjects();
  }
}

/** Create a project with the given content (createProject + saveProject). */
export async function createProjectWithContent(
  name: string,
  description: string,
  nodes: SystemNode[],
  edges: SystemEdge[]
): Promise<Project> {
  await ensureLoaded();
  const { createProject, saveProject } = useProjectStore.getState();
  const project = await createProject(name, description);
  const updatedProject = { ...project, nodes, edges };
  saveProject(updatedProject);
  return updatedProject;
}

/** Create a new project seeded from an architectural template. */
export async function createFromTemplate(templateId: string): Promise<Project | null> {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  return createProjectWithContent(
    template.name,
    template.description,
    structuredClone(template.nodes),
    structuredClone(template.edges)
  );
}
