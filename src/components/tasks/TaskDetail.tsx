"use client";

import React, { useState } from "react";
import { Task, UpdateTaskInput } from "@/types";
import { taskService } from "@/services/taskService";
import {
  formatDate,
  getStatusColor,
  getPriorityColor,
  getFullName,
  cn,
} from "@/lib/utils";
import { Card, Badge, Button, Textarea, Select, Input } from "@/components/ui";
import { Calendar, User, Clock, AlertCircle, Edit, X } from "lucide-react";

interface TaskDetailProps {
  task: Task;
  projectMembers?: any[];
  onUpdate?: (task: Task) => void;
  onClose?: () => void;
  isEditing?: boolean;
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  projectMembers = [],
  onUpdate,
  onClose,
  isEditing: initialIsEditing = false,
}) => {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateTaskInput>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    tags: task.tags,
  });

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const updatedTask = await taskService.updateTask(task.id, editData);
      onUpdate?.(updatedTask);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createdDate = new Date(task.createdAt);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  if (isEditing) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Edit Task</h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title
            </label>
            <Input
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <Textarea
              value={editData.description || ""}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              placeholder="Task description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <Select
                value={editData.status}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value as any })
                }
                options={STATUS_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <Select
                value={editData.priority}
                onChange={(e) =>
                  setEditData({ ...editData, priority: e.target.value as any })
                }
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign to
            </label>
            <Select
              value={editData.assigneeId || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  assigneeId:
                    (e.target as HTMLSelectElement).value || undefined,
                })
              }
            >
              <option value="">Unassigned</option>
              {projectMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {getFullName(member.user?.firstName, member.user?.lastName)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Due Date
            </label>
            <Input
              type="datetime-local"
              value={
                editData.dueDate
                  ? new Date(editData.dueDate).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                setEditData({
                  ...editData,
                  dueDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Estimated Hours
            </label>
            <Input
              type="number"
              step="0.5"
              value={editData.estimatedHours || ""}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  estimatedHours: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              placeholder="0.0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {task.title}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Badge className={cn("text-white", getStatusColor(task.status))}>
                {task.status === "in_progress" ? "In Progress" : task.status}
              </Badge>
              <Badge
                className={cn("text-white", getPriorityColor(task.priority))}
              >
                {task.priority}
              </Badge>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Description
            </h3>
            <p className="text-slate-600 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reporter */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Created By
            </h3>
            {task.reporter ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                  {task.reporter.firstName?.[0]}
                  {task.reporter.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {getFullName(
                      task.reporter.firstName,
                      task.reporter.lastName,
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.reporter.email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unknown</p>
            )}
          </div>

          {/* Assignee */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Assigned To
            </h3>
            {task.assignee ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                  {task.assignee.firstName?.[0]}
                  {task.assignee.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {getFullName(
                      task.assignee.firstName,
                      task.assignee.lastName,
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.assignee.email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Unassigned</p>
            )}
          </div>

          {/* Created Date */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created Date
            </h3>
            <p className="text-sm text-slate-600">{formatDate(createdDate)}</p>
          </div>

          {/* Due Date */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </h3>
            {dueDate ? (
              <p className="text-sm text-slate-600">{formatDate(dueDate)}</p>
            ) : (
              <p className="text-sm text-slate-500">Not set</p>
            )}
          </div>

          {/* Estimated Hours */}
          {task.estimatedHours && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Estimated Hours
              </h3>
              <p className="text-sm text-slate-600">
                {task.estimatedHours} hours
              </p>
            </div>
          )}

          {/* Actual Hours */}
          {task.actualHours && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Actual Hours
              </h3>
              <p className="text-sm text-slate-600">{task.actualHours} hours</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Edit Button */}
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Task
          </Button>
        </div>
      </div>
    </Card>
  );
};
