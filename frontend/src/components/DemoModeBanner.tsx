'use client';

import { useEffect, useState } from 'react';

interface SystemStatus {
  blockchain: {
    mode: 'real' | 'mock';
    isDemo: boolean;
    message: string;
  };
}

export function DemoModeBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/v1/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStatus(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (isLoading || !status?.blockchain.isDemo) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2 text-yellow-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">
            <span className="font-semibold">DEMO MODE:</span> Blockchain operations are simulated for demonstration purposes.
            {' '}
            <span className="text-xs opacity-75">
              Configure Digital Evidence API credentials to enable real blockchain anchoring.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
