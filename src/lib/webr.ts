// WebR integration for executing R code in the browser

import { WebR } from 'webr';

let webR: WebR | null = null;
let isInitializing = false;
let initPromise: Promise<WebR> | null = null;

export type WebRStatus = 'idle' | 'loading' | 'ready' | 'error';

export async function initWebR(onStatusChange?: (status: WebRStatus) => void): Promise<WebR> {
  if (webR) return webR;
  
  if (initPromise) return initPromise;
  
  isInitializing = true;
  onStatusChange?.('loading');
  
  initPromise = (async () => {
    try {
      const r = new WebR();
      await r.init();
      webR = r;
      onStatusChange?.('ready');
      return r;
    } catch (e) {
      onStatusChange?.('error');
      throw e;
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

export function getWebR(): WebR | null {
  return webR;
}

export function isWebRReady(): boolean {
  return webR !== null;
}

export function isWebRLoading(): boolean {
  return isInitializing;
}

export interface RExecutionResult {
  output: string;
  error: string | null;
}

export async function executeR(code: string): Promise<RExecutionResult> {
  if (!webR) {
    throw new Error('WebR not initialized');
  }
  
  try {
    // Capture output using capture.output
    const wrappedCode = `
      .output <- capture.output({
        .result <- tryCatch({
          ${code}
        }, error = function(e) {
          cat("Error:", conditionMessage(e), "\\n")
          NULL
        })
        if (!is.null(.result)) {
          print(.result)
        }
      })
      paste(.output, collapse = "\\n")
    `;
    
    const result = await webR.evalR(wrappedCode);
    const output = await result.toJs() as { values: string[] };
    
    // Clean up
    await webR.evalR('rm(.output, .result)');
    
    return {
      output: Array.isArray(output.values) ? output.values.join('\n') : String(output.values || ''),
      error: null,
    };
  } catch (e) {
    return {
      output: '',
      error: String(e),
    };
  }
}

// Execute R code and return just the result, handling print output nicely
export async function runR(code: string): Promise<RExecutionResult> {
  if (!webR) {
    throw new Error('WebR not initialized');
  }
  
  try {
    const shelter = await new webR.Shelter();
    
    try {
      // Wrap the code to use capture.output which properly captures print() output
      // with newlines preserved
      const wrappedCode = `
        .typr_output <- capture.output({
          ${code}
        })
        cat(.typr_output, sep = "\\n")
      `;
      
      // Execute the code and capture output
      const result = await shelter.captureR(wrappedCode, {
        withAutoprint: false,
        captureStreams: true,
        captureConditions: false,
      });
      
      // Collect output
      const outputParts: string[] = [];
      for (const event of result.output) {
        if (event.type === 'stdout') {
          outputParts.push(event.data);
        }
      }
      
      // Join the parts with newlines to preserve line breaks between output events
      const output = outputParts.join('\n');
      
      // Clean up
      await shelter.evalR('rm(.typr_output)').catch(() => {});
      
      return {
        output: output.trimEnd(),
        error: null,
      };
    } finally {
      await shelter.purge();
    }
  } catch (e) {
    return {
      output: '',
      error: String(e),
    };
  }
}
