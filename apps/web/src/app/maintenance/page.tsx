'use client';

import { useEffect, useState } from 'react';
import { Settings, AlertTriangle, Clock } from 'lucide-react';
import { api } from '@/lib/api/client';

export default function MaintenancePage() {
  const [message, setMessage] = useState('System is currently under maintenance. Please try again later.');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Get message from sessionStorage if available
    const storedMessage = sessionStorage.getItem('maintenanceMessage');
    if (storedMessage) {
      setMessage(storedMessage);
    }
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const response = await api.get('/api/maintenance-status');
      const data = response.data as { maintenanceMode: boolean; message: string | null };
      
      if (!data.maintenanceMode) {
        // Maintenance is over, redirect to dashboard
        sessionStorage.removeItem('maintenanceMessage');
        window.location.href = '/dashboard';
      } else {
        if (data.message) {
          setMessage(data.message);
        }
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
    } finally {
      setChecking(false);
    }
  };

  // Periodically check if maintenance is over
  useEffect(() => {
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center border border-gray-700">
          {/* Icon */}
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30">
            <Settings className="w-10 h-10 text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2">
            System Maintenance
          </h1>

          {/* Alert */}
          <div className="flex items-center justify-center gap-2 text-yellow-400 mb-6">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Temporarily Unavailable</span>
          </div>

          {/* Message */}
          <p className="text-gray-300 mb-8 leading-relaxed">
            {message}
          </p>

          {/* Info Box */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm">
                We&apos;re working to restore service as quickly as possible.
              </span>
            </div>
          </div>

          {/* Check Status Button */}
          <button
            onClick={checkStatus}
            disabled={checking}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Check Status
              </>
            )}
          </button>

          {/* Footer */}
          <p className="mt-8 text-gray-500 text-sm">
            If you need immediate assistance, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
