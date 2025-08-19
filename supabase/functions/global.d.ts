// Ambient types for Deno in Supabase Edge Functions
// This file is for local typechecking only. The runtime provides Deno.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};
