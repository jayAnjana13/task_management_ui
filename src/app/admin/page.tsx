'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { User, Project, Message } from '@/types';
import { cn, formatDate, formatRelativeTime, getFullName } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  Badge,
  Select,
  LoadingSpinner,
  Alert,
  Avatar,
  Pagination,
} from '@/components/ui';
import {
  Users,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  RefreshCw,
  FolderKanban,
  MessageSquare,
  Eye,
  CheckSquare,
  BarChart3,
} from 'lucide-react';

interface UsersResponse {
  success: boolean;
  data: User[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ProjectsResponse {
  success: boolean;
  data: (Project & { messageCount?: number })[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface MessagesResponse {
  success: boolean;
  data: Message[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

type AdminTab = 'overview' | 'users' | 'projects';

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if current user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <DashboardLayout>
        <Alert variant="error">
          You do not have permission to access this page.
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-1 text-slate-600">
            Manage users, view all projects, and monitor system activity
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'projects', label: 'Projects & Chats', icon: FolderKanban },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
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
        {activeTab === 'overview' && <AdminOverview setError={setError} />}
        {activeTab === 'users' && (
          <UsersManagement
            currentUser={currentUser}
            setError={setError}
            setSuccessMessage={setSuccessMessage}
          />
        )}
        {activeTab === 'projects' && <ProjectsManagement setError={setError} />}
      </div>
    </DashboardLayout>
  );
}

// Overview Component
function AdminOverview({ setError }: { setError: (e: string | null) => void }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [usersRes, projectsRes] = await Promise.all([
          api.get('/users?limit=1'),
          api.get('/projects/admin/all?limit=100'),
        ]);

        const projects = projectsRes.data.data || [];
        const totalMessages = projects.reduce(
          (sum: number, p: any) => sum + (p.messageCount || 0),
          0
        );

        setStats({
          totalUsers: usersRes.data.meta.pagination.total,
          totalProjects: projectsRes.data.meta.pagination.total,
          totalMessages,
        });
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [setError]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: <FolderKanban className="h-6 w-6 text-green-600" />,
      color: 'bg-green-50',
    },
    {
      title: 'Total Messages',
      value: stats.totalMessages,
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.color}`}>{stat.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Users Management Component
function UsersManagement({
  currentUser,
  setError,
  setSuccessMessage,
}: {
  currentUser: User;
  setError: (e: string | null) => void;
  setSuccessMessage: (m: string | null) => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: 'user' as 'admin' | 'user',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/users?page=${page}&limit=${limit}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (roleFilter) url += `&role=${roleFilter}`;
      if (statusFilter) url += `&isActive=${statusFilter}`;

      const response = await api.get<UsersResponse>(url);
      setUsers(response.data.data);
      setTotalPages(response.data.meta.pagination.totalPages);
      setTotal(response.data.meta.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, roleFilter, statusFilter, setError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await api.patch(`/users/${selectedUser.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
      });
      if (editForm.role !== selectedUser.role) {
        await api.patch(`/users/${selectedUser.id}/role`, { role: editForm.role });
      }
      setSuccessMessage('User updated successfully');
      setIsEditModalOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const endpoint = user.isActive
        ? `/users/${user.id}/deactivate`
        : `/users/${user.id}/activate`;
      await api.post(endpoint);
      setSuccessMessage(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/users/${selectedUser.id}`);
      setSuccessMessage('User deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">{total} users in system</p>
        <Button variant="outline" onClick={fetchUsers} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-32"
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'user', label: 'User' },
                ]}
              />
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-32"
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-slate-300" />
              <p className="mt-3 text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="md" />
                          <div>
                            <p className="font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge className={cn(user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700')}>
                          {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                          {user.role}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge className={cn(user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{formatDate(user.createdAt)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(user)} title="Edit"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)} title={user.isActive ? 'Deactivate' : 'Activate'} className={user.isActive ? 'text-yellow-600' : 'text-green-600'}>
                            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          {user.id !== currentUser.id && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setIsDeleteModalOpen(true); }} title="Delete" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            pagination={{
              page,
              limit: 10,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1,
            }}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User" size="md">
        <div className="space-y-4">
          {selectedUser && (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                <Avatar firstName={selectedUser.firstName} lastName={selectedUser.lastName} src={selectedUser.avatarUrl} size="lg" />
                <div>
                  <p className="font-medium text-slate-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
                {editForm.role === 'admin' && (
                  <p className="mt-1 text-xs text-yellow-600"><ShieldAlert className="mr-1 inline h-3 w-3" />Admin users have full system access</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveUser} isLoading={isSubmitting}>Save Changes</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete <span className="font-medium text-slate-900">{selectedUser?.firstName} {selectedUser?.lastName}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteUser} isLoading={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white">Delete User</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Projects Management Component
function ProjectsManagement({ setError }: { setError: (e: string | null) => void }) {
  const [projects, setProjects] = useState<(Project & { messageCount?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Chat modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `/projects/admin/all?page=${page}&limit=${limit}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await api.get<ProjectsResponse>(url);
      setProjects(response.data.data);
      setTotalPages(response.data.meta.pagination.totalPages);
      setTotal(response.data.meta.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, setError]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleViewChat = async (project: Project) => {
    setSelectedProject(project);
    setIsChatModalOpen(true);
    await fetchMessages(project.id);
  };

  const fetchMessages = async (projectId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await api.get<MessagesResponse>(
        `/chat/admin/projects/${projectId}/messages?limit=100`
      );
      setMessages(response.data.data.reverse()); // Oldest first
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'archived': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">{total} projects in system</p>
        <Button variant="outline" onClick={fetchProjects} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-36"
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><LoadingSpinner /></div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-slate-300" />
              <p className="mt-3 text-slate-500">No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Messages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{project.name}</p>
                          <p className="text-sm text-slate-500 truncate max-w-xs">{project.description || 'No description'}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {project.owner ? (
                          <div className="flex items-center gap-2">
                            <Avatar firstName={project.owner.firstName} lastName={project.owner.lastName} size="sm" />
                            <span className="text-sm text-slate-700">{project.owner.firstName} {project.owner.lastName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Unknown</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {project.memberCount || 0}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-4 w-4" />
                          {project.taskCount || 0}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {project.messageCount || 0}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{formatDate(project.createdAt)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewChat(project)}
                          title="View Chat"
                          className="text-primary-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Chat
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            pagination={{
              page,
              limit,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1,
            }}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Chat Modal */}
      <Modal
        isOpen={isChatModalOpen}
        onClose={() => { setIsChatModalOpen(false); setMessages([]); }}
        title={`Chat: ${selectedProject?.name || ''}`}
        size="lg"
      >
        <div className="h-[500px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-lg">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <MessageSquare className="h-12 w-12 text-slate-300" />
                <p className="mt-2">No messages in this project</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar
                    firstName={message.user?.firstName}
                    lastName={message.user?.lastName}
                    src={message.user?.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {message.user ? getFullName(message.user.firstName, message.user.lastName) : 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-500">{formatRelativeTime(message.createdAt)}</span>
                      {message.isEdited && <span className="text-xs text-slate-400">(edited)</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t mt-4 flex justify-between items-center">
            <p className="text-sm text-slate-500">
              {messages.length} messages shown (read-only view)
            </p>
            <Button variant="outline" onClick={() => setIsChatModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
