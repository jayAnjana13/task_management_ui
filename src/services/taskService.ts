import { api } from '@/lib/api';
import { buildQueryString } from '@/lib/utils';
import {
  Task,
  TaskStats,
  CreateTaskInput,
  UpdateTaskInput,
  QueryParams,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

interface TaskResponse {
  success: boolean;
  data: Task;
  message?: string;
}

interface TasksResponse {
  success: boolean;
  data: Task[];
  meta: {
    pagination: PaginationMeta;
  };
}

interface TaskStatsResponse {
  success: boolean;
  data: TaskStats;
}

export const taskService = {
  // Get all tasks
  async getTasks(params: QueryParams = {}): Promise<PaginatedResponse<Task>> {
    const queryString = buildQueryString(params);
    const response = await api.get<TasksResponse>(`/tasks${queryString}`);
    return {
      data: response.data.data,
      pagination: response.data.meta.pagination,
    };
  },

  // Get task by ID
  async getTaskById(id: string): Promise<Task> {
    const response = await api.get<TaskResponse>(`/tasks/${id}`);
    return response.data.data;
  },

  // Create task
  async createTask(data: CreateTaskInput): Promise<Task> {
    const response = await api.post<TaskResponse>('/tasks', data);
    return response.data.data;
  },

  // Update task
  async updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
    const response = await api.patch<TaskResponse>(`/tasks/${id}`, data);
    return response.data.data;
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  // Update task positions (for drag and drop)
  async updateTaskPositions(
    updates: Array<{ id: string; position: number; status?: string }>
  ): Promise<void> {
    await api.patch('/tasks/positions/update', { updates });
  },

  // Get task statistics for a project
  async getTaskStats(projectId: string): Promise<TaskStats> {
    const response = await api.get<TaskStatsResponse>(`/tasks/stats/${projectId}`);
    return response.data.data;
  },

  // Search tasks
  async searchTasks(
    query: string,
    projectId?: string
  ): Promise<PaginatedResponse<Task>> {
    const params: QueryParams = { search: query };
    if (projectId) params.projectId = projectId;
    return this.getTasks(params);
  },
};
