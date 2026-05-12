'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { Task, Project, ProjectMember, CreateTaskInput, TaskStatus, TaskPriority } from '@/types';
import { useDebouncedValue } from '@/hooks';
import { TaskForm } from '@/components/tasks';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Pagination,
  LoadingSpinner,
  Alert,
} from '@/components/ui';
import { getTaskStatusColor, getTaskPriorityColor, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckSquare,
  Filter,
  Clock,
  User,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ASSIGNED_FILTER_OPTIONS = [
  { value: '', label: 'All Tasks' },
  { value: 'true', label: 'Assigned to Me' },
];

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'due_date:asc', label: 'Due Date (Earliest)' },
  { value: 'due_date:desc', label: 'Due Date (Latest)' },
  { value: 'priority:desc', label: 'Priority (High to Low)' },
  { value: 'priority:asc', label: 'Priority (Low to High)' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at:desc');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Fetch projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.getProjects({ limit: 100 });
        setProjects(response.data);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch project members when project filter changes
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (projectFilter) {
        try {
          const members = await projectService.getProjectMembers(projectFilter);
          setProjectMembers(members);
        } catch (err) {
          console.error('Failed to fetch project members:', err);
        }
      } else {
        setProjectMembers([]);
      }
    };
    fetchProjectMembers();
  }, [projectFilter]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sortField, sortOrder] = sortBy.split(':');
      const filters: any = {};
      
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (projectFilter) filters.projectId = projectFilter;
      if (assignedFilter === 'true') filters.assignedToMe = true;

      const response = await taskService.getTasks({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        sortBy: sortField,
        sortOrder: sortOrder as 'asc' | 'desc' | 'ASC' | 'DESC',
        ...filters,
      });
      setTasks(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, priorityFilter, projectFilter, assignedFilter, sortBy]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, projectFilter, assignedFilter, sortBy]);

  // Open create modal
  const handleOpenCreateModal = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  // Open edit modal
  const handleOpenEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  // Handle task save (from TaskForm)
  const handleTaskSuccess = useCallback(async (task: Task) => {
    setIsModalOpen(false);
    setEditingTask(null);
    fetchTasks(); // Refresh task list
  }, [fetchTasks]);

  // Delete task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, []);

  // Update task status quickly
  const handleQuickStatusUpdate = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      try {
        await taskService.updateTask(taskId, { status: newStatus });
      } catch (err) {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        console.error('Failed to update task:', err);
      }
    },
    [tasks]
  );

  const activeFiltersCount = [statusFilter, priorityFilter, projectFilter, assignedFilter].filter(
    Boolean
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
            <p className="mt-1 text-slate-600">
              View and manage all your tasks across projects
            </p>
          </div>
          <Button
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Task
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-slate-100')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-primary-100 text-primary-700">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
              className="w-48"
            />
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={STATUS_OPTIONS}
                  />

                  <Select
                    label="Priority"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    options={PRIORITY_OPTIONS}
                  />

                  <Select
                    label="Project"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Projects' },
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />

                  <Select
                    label="Assignment"
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                    options={ASSIGNED_FILTER_OPTIONS}
                  />
                </div>

                {activeFiltersCount > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('');
                        setPriorityFilter('');
                        setProjectFilter('');
                        setAssignedFilter('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <CheckSquare className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first task'}
            </p>
            {!searchQuery && activeFiltersCount === 0 && (
              <Button onClick={handleOpenCreateModal} className="mt-4">
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={() => handleOpenEditModal(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  onStatusChange={(status) =>
                    handleQuickStatusUpdate(task.id, status)
                  }
                />
              ))}
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              className="mt-6"
            />
          </>
        )}
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSuccess={handleTaskSuccess}
        task={editingTask || undefined}
        projectId={projectFilter || (projects[0]?.id ?? '')}
        members={projectMembers}
      />
    </DashboardLayout>
  );
}

// Task Row Component
function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Status dropdown */}
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            className={cn(
              'rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer',
              getTaskStatusColor(task.status)
            )}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>

          {/* Task info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/tasks/${task.id}`}
                className="font-medium text-slate-900 hover:text-primary-600 truncate"
              >
                {task.title}
              </Link>
              {task.project && (
                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600 flex-shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  {task.project.name}
                </Link>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-slate-500 truncate">
                {task.description}
              </p>
            )}
            {/* Assignee info */}
            {task.assignee && (
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                <User className="h-3 w-3" />
                Assigned to {task.assignee.firstName} {task.assignee.lastName}
              </div>
            )}
          </div>

          {/* Priority */}
          <Badge className={cn('hidden sm:inline-flex', getTaskPriorityColor(task.priority))}>
            {task.priority}
          </Badge>

          {/* Due date */}
          {task.dueDate && (
            <span className="hidden md:flex items-center gap-1 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
