import React from 'react';
import { useLocation } from 'react-router-dom';
import AppErrorBoundary from '@/components/AppErrorBoundary';

export default function RouteErrorBoundary({ children, compact = false }) {
  const location = useLocation();

  return (
    <AppErrorBoundary compact={compact} key={`${location.pathname}${location.search}`}>
      {children}
    </AppErrorBoundary>
  );
}
