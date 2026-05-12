'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { TaskDetail } from '@/components/tasks';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { Task, ProjectMember } from '@/types';
import { Card, LoadingSpinner, Alert } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params?.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskAndMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!taskId) {
          setError('Task ID not found');
          return;
        }

        // Fetch task
        const taskData = await taskService.getTaskById(taskId);
        setTask(taskData);

        // Fetch project members if task has projectId
        if (taskData.projectId) {
          const members = await projectService.getProjectMembers(taskData.projectId);
          setProjectMembers(members);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task');
        console.error('Error fetching task:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) {
      fetchTaskAndMembers();
    }
  }, [taskId]);

  const handleUpdate = (updatedTask: Task) => {
    setTask(updatedTask);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Link>

          <Alert variant="error" title="Error">
            {error || 'Task not found'}
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>

        <TaskDetail
          task={task}
          projectMembers={projectMembers}
          onUpdate={handleUpdate}
        />
      </div>
    </DashboardLayout>
  );
}
