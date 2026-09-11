import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* values to browser code. Load unprefixed
  // provider secrets into the Node server process instead.
  const environment = loadEnv(mode, process.cwd(), "");
  for (const name of [
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_SITE_MODEL",
    "OPENAI_SITE_FALLBACK_MODEL",
    "PEXELS_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_LAUNCH",
    "STRIPE_PRICE_GROWTH",
    "STRIPE_PRICE_PROFESSIONAL",
    "UPVERO_APP_URL",
  ] as const) {
    if (environment[name]) process.env[name] = environment[name];
  }

  return {
    plugins: [
      tanstackStart({ server: { entry: "server" } }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
  };
});
