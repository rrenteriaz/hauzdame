const { neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = false;
neonConfig.wsProxy = () => "localhost:80/v1";
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;
