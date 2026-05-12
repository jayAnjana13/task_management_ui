'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { projectService, taskService } from '@/services';
import { Project, TaskStats } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  LoadingSpinner,
} from '@/components/ui';
import { getProjectStatusColor, getFullName } from '@/lib/utils';
import Link from 'next/link';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch projects
      const projectsResponse = await projectService.getProjects({ limit: 5 });
      setProjects(projectsResponse.data);

      // Fetch recent tasks
      const tasksResponse = await taskService.getTasks({ limit: 5, sortBy: 'updated_at' });
      setRecentTasks(tasksResponse.data);

      // Calculate stats
      const allTasksResponse = await taskService.getTasks({ limit: 1000 });
      const allTasks = allTasksResponse.data;
      
      setStats({
        totalProjects: projectsResponse.pagination.total,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter((t: any) => t.status === 'done').length,
        pendingTasks: allTasks.filter((t: any) => t.status !== 'done').length,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const completionRate = useMemo(() => {
    if (stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  }, [stats.completedTasks, stats.totalTasks]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total Projects',
        value: stats.totalProjects,
        icon: <FolderKanban className="h-6 w-6 text-primary-600" />,
        color: 'bg-primary-50',
      },
      {
        title: 'Total Tasks',
        value: stats.totalTasks,
        icon: <CheckSquare className="h-6 w-6 text-green-600" />,
        color: 'bg-green-50',
      },
      {
        title: 'Pending Tasks',
        value: stats.pendingTasks,
        icon: <Clock className="h-6 w-6 text-yellow-600" />,
        color: 'bg-yellow-50',
      },
      {
        title: 'Completion Rate',
        value: `${completionRate}%`,
        icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
        color: 'bg-blue-50',
      },
    ],
    [stats, completionRate]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-slate-600">
            Here's what's happening with your projects today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.color}`}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FolderKanban className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No projects yet</p>
                  <Link
                    href="/projects"
                    className="mt-4 text-primary-600 hover:text-primary-700"
                  >
                    Create your first project
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-primary-300 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-slate-900 truncate">
                          {project.name}
                        </h4>
                        <p className="text-sm text-slate-500 truncate">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <Badge className={getProjectStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {project.taskCount || 0} tasks
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Tasks</CardTitle>
              <Link
                href="/tasks"
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No tasks yet</p>
                  <Link
                    href="/tasks"
                    className="mt-4 text-primary-600 hover:text-primary-700"
                  >
                    Create your first task
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div
                        className={`h-3 w-3 rounded-full ${
                          task.status === 'done'
                            ? 'bg-green-500'
                            : task.status === 'in_progress'
                            ? 'bg-blue-500'
                            : task.priority === 'urgent'
                            ? 'bg-red-500'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {task.project?.name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.priority === 'urgent'
                            ? 'danger'
                            : task.priority === 'high'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="rounded-full bg-primary-100 p-2">
                  <Plus className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">New Project</p>
                  <p className="text-sm text-slate-500">Create a new project</p>
                </div>
              </Link>

              <Link
                href="/tasks"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="rounded-full bg-green-100 p-2">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">New Task</p>
                  <p className="text-sm text-slate-500">Add a task</p>
                </div>
              </Link>

              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="rounded-full bg-blue-100 p-2">
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">View Projects</p>
                  <p className="text-sm text-slate-500">Browse all projects</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
