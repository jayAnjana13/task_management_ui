'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority } from '@/types';
import { taskService } from '@/services/taskService';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  assigneeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  task?: Task; // For editing
  projectId: string;
  members?: Array<{ 
    id?: string;
    userId?: string;
    user?: { 
      id?: string;
      firstName?: string; 
      lastName?: string;
    };
    firstName?: string;
    lastName?: string;
  }>;
}

export function TaskForm({
  isOpen,
  onClose,
  onSuccess,
  task,
  projectId,
  members = [],
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
          estimatedHours: task.estimatedHours?.toString() || '',
          assigneeId: task.assigneeId || '',
        }
      : {
          status: 'todo',
          priority: 'medium',
        },
  });

  const statusOptions = useMemo(
    () => [
      { value: 'todo', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'review', label: 'Review' },
      { value: 'done', label: 'Done' },
    ],
    []
  );

  const priorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
    []
  );

  const memberOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...members.map((m) => {
        const userId = m.userId || m.id;
        const firstName = m.user?.firstName || m.firstName || '';
        const lastName = m.user?.lastName || m.lastName || '';
        return {
          value: userId || '',
          label: `${firstName} ${lastName}`.trim(),
        };
      }),
    ],
    [members]
  );

  const onSubmit = useCallback(
    async (data: TaskFormData) => {
      setIsSubmitting(true);
      setError(null);

      try {
        let result: Task;

        if (isEditing && task) {
          const updateData: UpdateTaskInput = {
            title: data.title,
            description: data.description || null,
            status: data.status as TaskStatus,
            priority: data.priority as TaskPriority,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null,
            assigneeId: data.assigneeId || null,
          };
          result = await taskService.updateTask(task.id, updateData);
        } else {
          const createData: CreateTaskInput = {
            title: data.title,
            description: data.description,
            status: (data.status as TaskStatus) || 'todo',
            priority: (data.priority as TaskPriority) || 'medium',
            projectId,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
            estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
            assigneeId: data.assigneeId || undefined,
          };
          result = await taskService.createTask(createData);
        }

        onSuccess(result);
        reset();
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditing, task, projectId, onSuccess, reset, onClose]
  );

  const handleClose = useCallback(() => {
    reset();
    setError(null);
    onClose();
  }, [reset, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Task' : 'Create Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input
          label="Title"
          placeholder="Task title"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Description"
          placeholder="Task description (optional)"
          rows={4}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            options={statusOptions}
            error={errors.status?.message}
            {...register('status')}
          />

          <Select
            label="Priority"
            options={priorityOptions}
            error={errors.priority?.message}
            {...register('priority')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Due Date"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />

          <Input
            label="Estimated Hours"
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            error={errors.estimatedHours?.message}
            {...register('estimatedHours')}
          />
        </div>

        {members.length > 0 && (
          <Select
            label="Assignee"
            options={memberOptions}
            error={errors.assigneeId?.message}
            {...register('assigneeId')}
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
