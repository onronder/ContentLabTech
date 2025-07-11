/**
 * Server-side Supabase Client for Authentication
 * Uses cookies for session management in API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/database";

export async function createClient() {
  console.log("🔧 Creating server-side Supabase auth client");

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          console.log(
            `🍪 Server Auth: Getting cookie ${name}:`,
            cookie ? "found" : "not found"
          );
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            console.log(`🍪 Server Auth: Setting cookie ${name}`);
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors gracefully
            // This can happen in Server Components where cookies are read-only
            console.error(
              "Cookie set error (expected in some contexts):",
              error
            );
          }
        },
        remove(name: string, options: any) {
          try {
            console.log(`🍪 Server Auth: Removing cookie ${name}`);
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Handle cookie removal errors gracefully
            console.error(
              "Cookie remove error (expected in some contexts):",
              error
            );
          }
        },
      },
    }
  );
}
