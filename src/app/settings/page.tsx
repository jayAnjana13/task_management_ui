'use client';

import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Alert,
} from '@/components/ui';
import { User, Lock, Bell, Palette, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [activeSection, setActiveSection] = useState<
    'profile' | 'password' | 'notifications' | 'appearance'
  >('profile');

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-slate-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}

            <div className="my-4 border-t border-slate-200" />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeSection === 'profile' && (
              <ProfileSection user={user} />
            )}
            {activeSection === 'password' && <PasswordSection />}
            {activeSection === 'notifications' && <NotificationsSection />}
            {activeSection === 'appearance' && <AppearanceSection />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Profile Section
function ProfileSection({
  user,
}: {
  user: any;
}) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.put(`/users/${user.id}`, formData);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your account profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-semibold text-primary-700">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <Button variant="outline" size="sm">
              Change Avatar
            </Button>
            <p className="mt-1 text-xs text-slate-500">
              JPG, GIF or PNG. Max size 2MB.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role
          </label>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600 capitalize">
              {user?.role || 'member'}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={handleSave} isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Password Section
function PasswordSection() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess('Password changed successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || 'Failed to change password'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Input
          label="Current Password"
          type="password"
          value={formData.currentPassword}
          onChange={(e) =>
            setFormData({ ...formData, currentPassword: e.target.value })
          }
        />

        <Input
          label="New Password"
          type="password"
          value={formData.newPassword}
          onChange={(e) =>
            setFormData({ ...formData, newPassword: e.target.value })
          }
        />
        <p className="text-xs text-slate-500">At least 8 characters</p>

        <Input
          label="Confirm New Password"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
        />

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={handleChangePassword} isLoading={isSubmitting}>
            Update Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Notifications Section
function NotificationsSection() {
  const [settings, setSettings] = useState({
    emailTaskAssigned: true,
    emailTaskDue: true,
    emailProjectUpdates: false,
    emailWeeklyDigest: true,
    pushNotifications: true,
    pushTaskUpdates: true,
    pushChatMessages: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how and when you want to be notified
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-4">
            Email Notifications
          </h4>
          <div className="space-y-3">
            <NotificationToggle
              label="Task assigned to me"
              description="Get notified when you're assigned a task"
              checked={settings.emailTaskAssigned}
              onChange={() => toggleSetting('emailTaskAssigned')}
            />
            <NotificationToggle
              label="Task due soon"
              description="Remind me about tasks that are due within 24 hours"
              checked={settings.emailTaskDue}
              onChange={() => toggleSetting('emailTaskDue')}
            />
            <NotificationToggle
              label="Project updates"
              description="Get notified about project changes and comments"
              checked={settings.emailProjectUpdates}
              onChange={() => toggleSetting('emailProjectUpdates')}
            />
            <NotificationToggle
              label="Weekly digest"
              description="Receive a weekly summary of your tasks and activity"
              checked={settings.emailWeeklyDigest}
              onChange={() => toggleSetting('emailWeeklyDigest')}
            />
          </div>
        </div>

        {/* Push Notifications */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-900 mb-4">
            Push Notifications
          </h4>
          <div className="space-y-3">
            <NotificationToggle
              label="Enable push notifications"
              description="Allow browser notifications"
              checked={settings.pushNotifications}
              onChange={() => toggleSetting('pushNotifications')}
            />
            <NotificationToggle
              label="Task updates"
              description="When tasks you're watching are updated"
              checked={settings.pushTaskUpdates}
              onChange={() => toggleSetting('pushTaskUpdates')}
              disabled={!settings.pushNotifications}
            />
            <NotificationToggle
              label="Chat messages"
              description="When you receive new messages in project chats"
              checked={settings.pushChatMessages}
              onChange={() => toggleSetting('pushChatMessages')}
              disabled={!settings.pushNotifications}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between py-2 ${
        disabled ? 'opacity-50' : 'cursor-pointer'
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

// Appearance Section
function AppearanceSection() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how TaskFlow looks on your device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">Theme</h4>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  theme === t
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mx-auto mb-2 h-8 w-12 rounded ${
                    t === 'dark'
                      ? 'bg-slate-800'
                      : t === 'light'
                      ? 'bg-slate-100'
                      : 'bg-gradient-to-r from-slate-100 to-slate-800'
                  }`}
                />
                <span className="text-sm font-medium capitalize text-slate-900">
                  {t}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Font Size</h4>
          <div className="flex gap-3">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`flex-1 rounded-lg border-2 py-3 text-center transition-colors ${
                  fontSize === size
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className={`font-medium text-slate-900 ${
                    size === 'small'
                      ? 'text-sm'
                      : size === 'large'
                      ? 'text-lg'
                      : 'text-base'
                  }`}
                >
                  Aa
                </span>
                <p className="text-xs text-slate-500 mt-1 capitalize">{size}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button>Save Preferences</Button>
        </div>
      </CardContent>
    </Card>
  );
}
