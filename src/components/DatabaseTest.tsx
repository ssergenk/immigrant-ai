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
        const { data, error, count } = await supabase // Added 'count' to destructuring
          .from('users')
          .select('id', { count: 'exact', head: true }); // Changed to 'id' (or any other column)

        if (error) {
          setConnectionStatus(`❌ Connection Error: ${error.message}`);
          setTableCount(0); // Reset count on error
        } else {
          setConnectionStatus('✅ Database Connected Successfully!');
          // The fix: Use the 'count' property returned directly by Supabase,
          // which is available when `count: 'exact'` is used in the options.
          setTableCount(count || 0);
        }
      } catch (err: any) { // Type 'err' as any for more flexible error handling
        setConnectionStatus(`❌ Connection Failed: ${err.message || String(err)}`); // Use String(err) for non-Error objects
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