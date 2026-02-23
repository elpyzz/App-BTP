import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import path from "path";
// #region agent log
fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:4',message:'Checking OPENAI_API_KEY after dotenv',data:{hasApiKey:!!process.env.OPENAI_API_KEY,apiKeyLength:process.env.OPENAI_API_KEY?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const app = express();

// Middleware de traçage GLOBAL - le premier middleware, capture TOUTES les requêtes
app.use((req, res, next) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:12',message:'GLOBAL middleware - ALL requests',data:{method:req.method,url:req.originalUrl,path:req.path,isApi:req.originalUrl.startsWith('/api')},timestamp:Date.now(),runId:'resend-final',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log('[GLOBAL] Request:', req.method, req.originalUrl, 'isApi:', req.originalUrl.startsWith('/api'));
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // #region agent log
  const pkgJsonPath = path.resolve(import.meta.dirname, '..', 'package.json');
  let hasSupabaseInPackageJson = false;
  try {
    const pkgJsonContent = fs.readFileSync(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonContent);
    hasSupabaseInPackageJson = !!(pkgJson.dependencies?.['@supabase/supabase-js'] || pkgJson.devDependencies?.['@supabase/supabase-js']);
  } catch (e) {
    // Ignore
  }
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:51',message:'Starting server initialization',data:{nodeEnv:process.env.NODE_ENV,port:process.env.PORT,hasDatabaseUrl:!!process.env.DATABASE_URL,hasSupabaseInPackageJson},timestamp:Date.now(),runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  let server;
  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:43',message:'Calling registerRoutes',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    server = await registerRoutes(app);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:46',message:'registerRoutes completed successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  } catch (err: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:49',message:'Error in registerRoutes',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    throw err;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Middleware CRITIQUE : Intercepter TOUTES les routes API avant Vite
  // Ce middleware garantit que les routes API ne passent jamais par Vite
  app.use('/api', (req, res, next) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:105',message:'Pre-Vite API middleware',data:{method:req.method,url:req.originalUrl},timestamp:Date.now(),runId:'resend-final',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.log('[Pre-Vite API Middleware] Intercepting API route:', req.method, req.originalUrl);
    // Les routes API sont déjà enregistrées par registerRoutes
    // On laisse Express les gérer, on ne passe JAMAIS à Vite pour /api
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:103',message:'Setting up Vite in development mode',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      await setupVite(app, server);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:66',message:'setupVite completed successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:69',message:'Error in setupVite',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw err;
    }
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Ensure port is 5000 if not explicitly set or if invalid
  const finalPort = (isNaN(port) || port <= 0) ? 5000 : port;

  // On Windows, use localhost instead of 0.0.0.0 to avoid ENOTSUP errors
  // On Linux, use 0.0.0.0 for network access
  const host = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:77',message:'Preparing to listen on port',data:{finalPort,host,platform:process.platform},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // Build listen options
  const listenOptions: any = {
    port: finalPort,
    host: host,
  };

  // Only enable reusePort on Linux where it's supported
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  // Handle server errors gracefully
  server.on("error", (err: any) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:95',message:'Server error event',data:{errorCode:err?.code,errorMessage:err?.message},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (err.code === "EADDRINUSE") {
      log(`Port ${finalPort} is already in use`, "server");
    } else {
      log(`server listen error: ${err?.code || err?.message}`, "server");
    }
    process.exit(1);
  });

  server.listen(listenOptions, () => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.ts:105',message:'Server listening successfully',data:{host,finalPort},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    log(`serving on http://${host}:${finalPort}`);
  });
})();
