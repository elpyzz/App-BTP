import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:22',message:'setupVite function entry',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
    // Exclure les routes API du traitement Vite
    base: '/',
  };

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:29',message:'Creating Vite server',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  let vite;
  try {
    vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:36',message:'Vite logger error',data:{msg:typeof msg==='string'?msg:JSON.stringify(msg)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:48',message:'Vite server created successfully',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  } catch (err: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:51',message:'Error creating Vite server',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw err;
  }

  // Wrapper pour vite.middlewares qui ignore les routes API
  // IMPORTANT: Ce middleware doit être appelé APRÈS que toutes les routes API soient enregistrées
  const viteMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:65',message:'Vite middleware wrapper called',data:{method:req.method,url:req.originalUrl,isApi:req.originalUrl.startsWith('/api')},timestamp:Date.now(),runId:'resend-final',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Ignorer complètement les routes API - elles sont gérées par Express
    if (req.originalUrl.startsWith('/api')) {
      console.log('[Vite Middleware] Ignoring API route:', req.originalUrl);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:70',message:'Vite middleware - skipping API route',data:{url:req.originalUrl},timestamp:Date.now(),runId:'resend-final',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return next();
    }
    // Pour les autres routes, utiliser vite.middlewares
    console.log('[Vite Middleware] Processing non-API route:', req.originalUrl);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/92008ec0-4865-46b1-a863-69afada2c59a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/vite.ts:76',message:'Vite middleware - processing with vite',data:{url:req.originalUrl},timestamp:Date.now(),runId:'resend-final',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    vite.middlewares(req, res, next);
  };
  
  app.use(viteMiddleware);
  
  app.use("*", async (req, res, next) => {
    // Ignorer les routes API - elles sont gérées par Express
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // Ignorer les routes API - elles sont gérées par Express
  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
