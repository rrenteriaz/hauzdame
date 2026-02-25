import { neonConfig } from "@neondatabase/serverless";

export function register() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DATABASE_URL?.includes("localhost")
  ) {
    neonConfig.wsProxy = () => "localhost:80/v1";
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineTLS = false;
    neonConfig.pipelineConnect = false;
  }
}
