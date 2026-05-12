'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout';
import { projectService } from '@/services/projectService';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, Button, LoadingSpinner, Alert } from '@/components/ui';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function ProjectChatPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await projectService.getProjects({ limit: 100, sortBy: 'updated_at', sortOrder: 'DESC' });
        setProjects(result.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Chat</h1>
          <p className="mt-1 text-slate-600">Select a project to open its project-specific chat.</p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-500">No projects found.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {project.description || 'No description'}
                  </p>
                  <Link href={`/projects/${project.id}?tab=chat`}>
                    <Button className="w-full" leftIcon={<MessageSquare className="h-4 w-4" />}>
                      Open Project Chat
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
