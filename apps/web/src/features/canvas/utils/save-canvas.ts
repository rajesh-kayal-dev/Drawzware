import type { Project } from '@drawzware/contracts';
import { useCanvasStore } from '@/features/canvas/stores/useCanvasStore';
import { useProjectStore } from '@/features/projects/stores/useProjectStore';
import { saveAsDrawzProject } from '@/features/projects/utils/file-operations';

/** Export the current offline canvas using the same .drawz path as the canvas menu. */
export function saveCurrentCanvasAsDrawz(projectId: string, projectName?: string): Promise<boolean> {
  const currentProject = useProjectStore.getState().projects.find((project) => project.id === projectId);
  const { nodes, edges, viewport, diagramType, diagramData } = useCanvasStore.getState();
  const projectToSave: Project = currentProject
    ? { ...currentProject, nodes, edges, viewport, diagramType, diagramData }
    : {
        id: projectId,
        name: projectName || 'Untitled Design',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes,
        edges,
        viewport,
        diagramType,
        diagramData,
      };

  return saveAsDrawzProject(projectToSave);
}
