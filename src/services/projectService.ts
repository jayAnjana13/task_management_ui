import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/utils';
import {
  Project,
  ProjectMember,
  CreateProjectInput,
  UpdateProjectInput,
  QueryParams,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

interface ProjectResponse {
  success: boolean;
  data: Project;
  message?: string;
}

interface ProjectsResponse {
  success: boolean;
  data: Project[];
  meta: {
    pagination: PaginationMeta;
  };
}

interface MembersResponse {
  success: boolean;
  data: ProjectMember[];
}

export const projectService = {
  // Get all projects
  async getProjects(params: QueryParams = {}): Promise<PaginatedResponse<Project>> {
    const queryString = buildQueryString(params);
    const response = await api.get<ProjectsResponse>(`/projects${queryString}`);
    return {
      data: response.data.data,
      pagination: response.data.meta.pagination,
    };
  },

  // Get project by ID
  async getProjectById(id: string): Promise<Project> {
    const response = await api.get<ProjectResponse>(`/projects/${id}`);
    return response.data.data;
  },

  // Create project
  async createProject(data: CreateProjectInput): Promise<Project> {
    const response = await api.post<ProjectResponse>('/projects', data);
    return response.data.data;
  },

  // Update project
  async updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    const response = await api.patch<ProjectResponse>(`/projects/${id}`, data);
    return response.data.data;
  },

  // Delete project
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  // Get project members
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await api.get<MembersResponse>(`/projects/${projectId}/members`);
    return response.data.data;
  },

  // Add member to project
  async addProjectMember(
    projectId: string,
    userId: string,
    role: string = 'member'
  ): Promise<ProjectMember> {
    const response = await api.post<{ data: ProjectMember }>(
      `/projects/${projectId}/members`,
      { userId, role }
    );
    return response.data.data;
  },

  // Remove member from project
  async removeProjectMember(projectId: string, memberId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },
};
