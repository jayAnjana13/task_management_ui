'use client';

import React, { useState, useCallback, useMemo, useTransition, memo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { taskService } from '@/services/taskService';
import { useDebouncedValue } from '@/hooks';
import {
  cn,
  formatDate,
  formatTaskStatus,
  formatTaskPriority,
  getStatusColor,
  getPriorityColor,
  getFullName,
} from '@/lib/utils';
import {
  Card,
  Badge,
  Avatar,
  Button,
  Input,
  Select,
  Modal,
  Pagination,
  LoadingSpinner,
} from '@/components/ui';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Clock,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusOptions: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <Card className="group p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-slate-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <div className="border-t border-slate-200 my-1" />
                <p className="px-4 py-1 text-xs text-slate-500">Change status</p>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(task, status);
                      setShowMenu(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100',
                      task.status === status && 'text-primary-600 font-medium'
                    )}
                  >
                    {task.status === status && <CheckCircle className="h-4 w-4" />}
                    <span className={task.status !== status ? 'ml-6' : ''}>
                      {formatTaskStatus(status)}
                    </span>
                  </button>
                ))}
                <div className="border-t border-slate-200 my-1" />
                <button
                  onClick={() => {
                    onDelete(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={getStatusColor(task.status)}>
          {formatTaskStatus(task.status)}
        </Badge>
        <Badge className={getPriorityColor(task.priority)}>
          {formatTaskPriority(task.priority)}
        </Badge>
        
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        
        {task.estimatedHours && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {task.estimatedHours}h
          </span>
        )}
      </div>

      {task.assignee && (
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
          <Avatar
            firstName={task.assignee.firstName}
            lastName={task.assignee.lastName}
            src={task.assignee.avatarUrl}
            size="sm"
          />
          <span className="text-sm text-slate-600">
            {getFullName(task.assignee.firstName, task.assignee.lastName)}
          </span>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
});

interface TaskListProps {
  projectId?: string;
  onCreateTask?: () => void;
}

export function TaskList({ projectId, onCreateTask }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  const [isPending, startTransition] = useTransition();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Memoized filters
  const filters = useMemo(
    () => ({
      projectId,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: 10,
    }),
    [projectId, statusFilter, priorityFilter, debouncedSearch, page]
  );

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await taskService.getTasks(filters);
      startTransition(() => {
        setTasks(response.data);
        setPagination(response.pagination);
      });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial fetch and refetch on filter change
  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (task: Task, status: TaskStatus) => {
      try {
        await taskService.updateTask(task.id, { status });
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status } : t))
        );
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    },
    []
  );

  // Handle delete
  const handleDelete = useCallback(async (task: Task) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskService.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, []);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9"
            />
          </div>
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            className="w-40"
          />
          
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={priorityOptions}
            className="w-40"
          />
        </div>

        {onCreateTask && (
          <Button onClick={onCreateTask} leftIcon={<Plus className="h-4 w-4" />}>
            Add Task
          </Button>
        )}
      </div>

      {/* Loading indicator for transitions */}
      {isPending && (
        <div className="text-center text-sm text-slate-500">Updating...</div>
      )}

      {/* Tasks grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <CheckCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery || statusFilter || priorityFilter
              ? 'Try adjusting your filters'
              : 'Get started by creating a new task'}
          </p>
          {onCreateTask && !searchQuery && !statusFilter && !priorityFilter && (
            <Button onClick={onCreateTask} className="mt-4">
              Create Task
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => {}}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
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
  );
}
