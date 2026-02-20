// Type definitions for TypR WASM module

export interface CompileResult {
  r_code: string;
  type_annotations: string;
  generic_functions: string;
}

export interface TypeCheckResult {
  has_errors: boolean;
  errors: string;
}

export interface TypRWasmModule {
  default: () => Promise<void>;
  compile: (source: string) => CompileResult;
  typeCheck: (source: string) => TypeCheckResult;
  parse: (source: string) => string;
  transpile: (source: string) => string;
  compileMultiple: (filesJson: string) => CompileResult;
}

let wasmModule: TypRWasmModule | null = null;

export async function initTypR(): Promise<void> {
  if (wasmModule) return;
  
  // Load WASM module dynamically from public folder
  const wasmUrl = new URL('/wasm/typr_wasm.js', window.location.origin).href;
  
  // Import the ES module
  const module = await import(/* @vite-ignore */ wasmUrl) as TypRWasmModule;
  await module.default();
  
  wasmModule = module;
}

export function isTypRReady(): boolean {
  return wasmModule !== null;
}

export function compileTypR(source: string): { rCode: string; errors: string | null } {
  if (!wasmModule) {
    throw new Error('TypR compiler not initialized');
  }
  
  try {
    const result = wasmModule.compile(source);
    return { rCode: result.r_code, errors: null };
  } catch (e) {
    return { rCode: '', errors: String(e) };
  }
}

export function typeCheckTypR(source: string): { hasErrors: boolean; errors: string } {
  if (!wasmModule) {
    return { hasErrors: true, errors: 'TypR compiler not initialized' };
  }
  
  try {
    const result = wasmModule.typeCheck(source);
    return { hasErrors: result.has_errors, errors: result.errors };
  } catch (e) {
    return { hasErrors: true, errors: String(e) };
  }
}

export function parseTypR(source: string): { ast: string; error: string | null } {
  if (!wasmModule) {
    throw new Error('TypR compiler not initialized');
  }
  
  try {
    const ast = wasmModule.parse(source);
    return { ast, error: null };
  } catch (e) {
    return { ast: '', error: String(e) };
  }
}

export function transpileTypR(source: string): { rCode: string; error: string | null } {
  if (!wasmModule) {
    throw new Error('TypR compiler not initialized');
  }
  
  try {
    const rCode = wasmModule.transpile(source);
    return { rCode, error: null };
  } catch (e) {
    return { rCode: '', error: String(e) };
  }
}

// Compile multiple files
export function compileMultipleTypR(
  files: Record<string, string>
): { rCode: string; errors: string | null } {
  if (!wasmModule) {
    throw new Error('TypR compiler not initialized');
  }
  
  try {
    const result = wasmModule.compileMultiple(JSON.stringify(files));
    return { rCode: result.r_code, errors: null };
  } catch (e) {
    return { rCode: '', errors: String(e) };
  }
}
