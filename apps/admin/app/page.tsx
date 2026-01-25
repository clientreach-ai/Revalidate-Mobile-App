'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/src/services/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    if (token) {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Redirecting...</div>
    </div>
  );
}
