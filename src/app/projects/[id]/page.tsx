'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { api } from '@/lib/api';
import { Project, Task, CreateTaskInput, TaskStatus, TaskPriority } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  Badge,
  Textarea,
  Select,
  LoadingSpinner,
  Alert,
  Avatar,
} from '@/components/ui';
import { ChatUI } from '@/components/chat';
import {  getStatusColor, getPriorityColor, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Settings,
  Users,
  Clock,
  CheckSquare,
  Edit,
  Trash2,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const projectId = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'board' | 'chat' | 'members' | 'settings'>('board');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'board' || tab === 'chat' || tab === 'members' || tab === 'settings') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<CreateTaskInput>({
    projectId: '',
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project and tasks
  const fetchData = useCallback(async () => {
    if (!projectId || typeof projectId !== 'string') return;

    try {
      setIsLoading(true);
      const [projectData, tasksData] = await Promise.all([
        projectService.getProjectById(projectId),
        taskService.getTasks({ projectId, limit: 100 }),
      ]);
      setProject(projectData);
      setTasks(tasksData.data);
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      setError(err.response?.data?.error?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by position within each status
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  // Open create task modal
  const handleOpenCreateModal = useCallback(
    (status: TaskStatus = 'todo') => {
      setEditingTask(null);
      setTaskForm({
        projectId: projectId as string,
        title: '',
        description: '',
        status,
        priority: 'medium',
      });
      setIsTaskModalOpen(true);
    },
    [projectId]
  );

  // Open edit task modal
  const handleOpenEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    });
    setIsTaskModalOpen(true);
  }, []);

  // Save task (create or update)
  const handleSaveTask = useCallback(async () => {
    if (!taskForm.title.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingTask) {
        const updated = await taskService.updateTask(editingTask.id, {
          title: taskForm.title,
          description: taskForm.description,
          status: taskForm.status,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
        });
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        const created = await taskService.createTask(taskForm);
        setTasks((prev) => [...prev, created]);
      }
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [taskForm, editingTask]);

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

  // Move task to new status
  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

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
        console.error('Failed to move task:', err);
      }
    },
    [tasks]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout>
        <Alert variant="error">{error || 'Project not found'}</Alert>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </DashboardLayout>
    );
  }

  const isProjectOwner = project.ownerId === currentUser?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              <p className="mt-1 text-slate-600 line-clamp-1">
                {project.description || 'No description'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(project.status as any)}>
              {project.status}
            </Badge>
            <Button
              onClick={() => handleOpenCreateModal()}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Task
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'board', label: 'Board', icon: CheckSquare },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TASK_STATUSES.map((status) => (
              <TaskColumn
                key={status}
                status={status}
                label={STATUS_LABELS[status]}
                tasks={tasksByStatus[status]}
                onAddTask={() => handleOpenCreateModal(status)}
                onEditTask={handleOpenEditModal}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
              />
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <ProjectMembers
            projectId={projectId as string}
            onMembersChange={fetchData}
            canManageMembers={isProjectOwner}
          />
        )}

        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-280px)]">
            <ChatUI projectId={projectId as string} />
          </div>
        )}

        {activeTab === 'settings' && (
          <ProjectSettings
            project={project}
            onUpdate={fetchData}
            isProjectOwner={isProjectOwner}
          />
        )}
      </div>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create Task'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
          />

          <Textarea
            label="Description (optional)"
            placeholder="Task description..."
            value={taskForm.description || ''}
            onChange={(e) =>
              setTaskForm({ ...taskForm, description: e.target.value })
            }
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={taskForm.status}
              onChange={(e) =>
                setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })
              }
              options={TASK_STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              }))}
            />

            <Select
              label="Priority"
              value={taskForm.priority}
              onChange={(e) =>
                setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })
              }
              options={PRIORITY_OPTIONS}
            />
          </div>

          <Input
            label="Due Date (optional)"
            type="date"
            value={taskForm.dueDate?.split('T')[0] || ''}
            onChange={(e) =>
              setTaskForm({
                ...taskForm,
                dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} isLoading={isSubmitting}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// Task Column Component
function TaskColumn({
  status,
  label,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}) {
  const statusColor: Record<TaskStatus, string> = {
    todo: 'bg-slate-100',
    in_progress: 'bg-blue-100',
    review: 'bg-amber-100',
    done: 'bg-green-100',
  };

  return (
    <div className="flex-shrink-0 w-72">
      <div className={cn('rounded-t-lg px-4 py-3', statusColor[status])}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900">{label}</h3>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onAddTask}
            className="rounded p-1 hover:bg-white/50 transition-colors"
          >
            <Plus className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="min-h-[400px] rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.id)}
            onMove={onMoveTask}
            currentStatus={status}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
  currentStatus,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  currentStatus: TaskStatus;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const otherStatuses = TASK_STATUSES.filter((s) => s !== currentStatus);

  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 text-sm line-clamp-2">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-slate-100 transition-opacity"
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
              
              <div className="my-1 border-t border-slate-100" />
              
              <p className="px-3 py-1 text-xs text-slate-400">Move to</p>
              {otherStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onMove(task.id, status);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
          {task.priority}
        </Badge>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

// Project Members Component
function ProjectMembers({
  projectId,
  onMembersChange,
  canManageMembers,
}: {
  projectId: string;
  onMembersChange: () => void;
  canManageMembers: boolean;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchAvailableUsers = useCallback(
    async (membersList: any[]) => {
      if (!canManageMembers) return;

      try {
        setIsLoadingUsers(true);
        const response = await api.get('/users?limit=100');
        const users = response.data?.data || [];
        const memberIds = new Set(membersList.map((member: any) => member.userId));
        const availableUsers = users.filter((user: any) => !memberIds.has(user.id));
        setAllUsers(availableUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [canManageMembers]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const membersList = await projectService.getProjectMembers(projectId);
        setMembers(membersList);
        await fetchAvailableUsers(membersList);
      } catch (err) {
        console.error('Failed to fetch members:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, fetchAvailableUsers]);

  const handleOpenAddMember = async () => {
    setSelectedUserId('');
    setFilterQuery('');
    setIsAddingMember(true);
    await fetchAvailableUsers(members);
  };

  const handleAddMember = async () => {
    if (!canManageMembers) return;
    if (!selectedUserId) return;

    try {
      setIsSubmitting(true);
      await projectService.addProjectMember(projectId, selectedUserId, 'member');
      setSelectedUserId('');
      setFilterQuery('');
      setIsAddingMember(false);
      onMembersChange();

      // Refresh members
      const membersList = await projectService.getProjectMembers(projectId);
      setMembers(membersList);
      await fetchAvailableUsers(membersList);
    } catch (err: any) {
      console.error('Failed to add member:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canManageMembers) return;
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      await projectService.removeProjectMember(projectId, memberId);
      onMembersChange();

      // Refresh members
      const membersList = await projectService.getProjectMembers(projectId);
      setMembers(membersList);
      await fetchAvailableUsers(membersList);
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Filter available users
  const filteredUsers = allUsers.filter(
    (user) =>
      user.firstName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Project Members</h2>
          <p className="mt-1 text-slate-600">
            {members.length} {members.length === 1 ? 'member' : 'members'} in this project
          </p>
          {!canManageMembers && (
            <p className="mt-1 text-sm text-slate-500">
              Only the project owner can add or remove members.
            </p>
          )}
        </div>
        {canManageMembers && (
          <Button
            onClick={handleOpenAddMember}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-12">
          <Users className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-slate-500">No members yet</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={member.user?.firstName}
                      lastName={member.user?.lastName}
                      src={member.user?.avatarUrl}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.user?.firstName} {member.user?.lastName}
                      </p>
                      <p className="text-sm text-slate-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="capitalize">
                      {member.role}
                    </Badge>
                    {canManageMembers && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddingMember}
        onClose={() => {
          setIsAddingMember(false);
          setSelectedUserId('');
          setFilterQuery('');
        }}
        title="Add Members to Project"
        size="md"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search by name or email..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />

          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">
                {allUsers.length === 0
                  ? 'All users are already members of this project'
                  : 'No users found matching your search'}
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUserId(user.id);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0',
                    selectedUserId === user.id ? 'bg-primary-50' : ''
                  )}
                >
                  <Avatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    src={user.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  {selectedUserId === user.id && (
                    <div className="h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingMember(false);
                setSelectedUserId('');
                setFilterQuery('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              isLoading={isSubmitting}
              disabled={!selectedUserId}
            >
              Add to Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Project Settings Component
function ProjectSettings({
  project,
  onUpdate,
  isProjectOwner,
}: {
  project: Project;
  onUpdate: () => void;
  isProjectOwner: boolean;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await projectService.updateProject(project.id, formData);
      setSuccessMessage('Project updated successfully');
      onUpdate();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isProjectOwner) return;
    if (
      !confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await projectService.deleteProject(project.id);
      router.push('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Input
          label="Project Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={4}
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
            { value: 'completed', label: 'Completed' },
          ]}
        />

        <div className="flex justify-between pt-4 border-t border-slate-200">
          {isProjectOwner ? (
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleSave} isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
