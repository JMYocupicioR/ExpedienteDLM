// Ambient types for Deno in Supabase Edge Functions
// This file is for local typechecking only. The runtime provides Deno.

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};
