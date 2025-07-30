'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export default function DatabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [tableCount, setTableCount] = useState<number>(0)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createSupabaseClient()

        // Test basic connection by trying to select from users table
        // We only need 'error' and 'count' from the response.
        // Removed 'data' from destructuring to resolve the 'no-unused-vars' warning.
        const { error, count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });

        if (error) {
          setConnectionStatus(`❌ Connection Error: ${error.message}`);
          setTableCount(0); // Reset count on error
        } else {
          setConnectionStatus('✅ Database Connected Successfully!');
          setTableCount(count || 0);
        }
      } catch (err) { // Removed ': any' to resolve 'no-explicit-any' error
        // The type of 'err' in a catch block is 'unknown' by default in TypeScript 3.8+
        // We need to safely check its properties before using them.
        if (err instanceof Error) {
          setConnectionStatus(`❌ Connection Failed: ${err.message}`);
        } else {
          setConnectionStatus(`❌ Connection Failed: ${String(err)}`); // Fallback for non-Error objects
        }
        setTableCount(0); // Reset count on error
      }
    }
    testConnection();
  }, [])

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md mx-auto mt-8">
      <h3 className="text-lg font-semibold text-white mb-4">Database Connection Test</h3>

      <div className="space-y-2">
        <p className="text-gray-300">Status: <span className="font-mono">{connectionStatus}</span></p>
        <p className="text-gray-300">Users in database: <span className="font-mono">{tableCount}</span></p>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>✅ If you see &ldquo;Connected Successfully&rdquo;, your database is working!</p>
        <p>❌ If you see an error, we&apos;ll need to check your .env.local file</p>
      </div>
    </div>
  )
}