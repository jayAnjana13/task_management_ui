'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import { projectService } from '@/services/projectService';
import { Project, CreateProjectInput } from '@/types';
import { useDebouncedValue } from '@/hooks';
import {
  Card,
  CardContent,
  Button,
  Input,
  Modal,
  Textarea,
  Badge,
  Pagination,
  LoadingSpinner,
  Alert,
} from '@/components/ui';
import { getProjectStatusColor, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Plus,
  Search,
  FolderKanban,
  Users,
  CheckSquare,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    description: '',
  });

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await projectService.getProjects({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
      });
      setProjects(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = useCallback(async () => {
    if (!newProject.name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const project = await projectService.createProject(newProject);
      setProjects((prev) => [project, ...prev]);
      setIsCreateModalOpen(false);
      setNewProject({ name: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  }, [newProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will delete all associated tasks.')) {
      return;
    }

    try {
      await projectService.deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="mt-1 text-slate-600">
              Manage and organize your projects
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Project
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <LoadingSpinner />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <FolderKanban className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No projects found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Get started by creating your first project'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
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

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewProject({ name: '', description: '' });
          setError(null);
        }}
        title="Create New Project"
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Input
            label="Project Name"
            placeholder="My Awesome Project"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />

          <Textarea
            label="Description (optional)"
            placeholder="Describe your project..."
            value={newProject.description || ''}
            onChange={(e) =>
              setNewProject({ ...newProject, description: e.target.value })
            }
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewProject({ name: '', description: '' });
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} isLoading={isSubmitting}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// Project Card Component
function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <Link href={`/projects/${project.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                {project.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                {project.description || 'No description'}
              </p>
            </div>
            <Badge className={getProjectStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-4 w-4" />
              {project.taskCount || 0} tasks
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {project.memberCount || 1} members
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Created {formatDate(project.createdAt)}
          </div>
        </CardContent>
      </Link>

      {/* Actions menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-slate-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4 text-slate-500" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <Link
                href={`/projects/${project.id}`}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(project.id);
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
    </Card>
  );
}
