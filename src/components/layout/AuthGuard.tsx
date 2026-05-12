'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LoadingOverlay } from '@/components/ui';
import { storage } from '@/lib/utils';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, refreshUser, user } = useAuthStore();

  useEffect(() => {
    const token = storage.get('accessToken');
    
    if (token && !user) {
      refreshUser();
    } else if (!token && !isPublicRoute(pathname)) {
      router.push('/login');
    }
  }, [pathname, refreshUser, router, user]);

  if (isLoading) {
    return <LoadingOverlay message="Checking authentication..." />;
  }

  const publicRoutes = ['/login', '/register', '/forgot-password'];
  
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return <LoadingOverlay message="Redirecting..." />;
  }

  return <>{children}</>;
}

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const publicRoutes = ['/login', '/register', '/forgot-password', '/'];
  return publicRoutes.includes(pathname);
}
