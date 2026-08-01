/**
 * @purpose Gestiona la instantiación y extracción de contratos OMEGA de módulos WASM auto-descriptivos.
 * @purpose_en Manages the instantiation and extraction of OMEGA contracts from self-descriptive WASM modules.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

/**
 * OMEGA WASM Loader Service
 * Handles instantiation and contract extraction from self-descriptive WASM modules.
 * 
 * @deprecated OmegaContract moved to @/omega-ui-core/types/contract.
 * Re-exported here for backward compatibility.
 */

import type { OmegaContract } from '@/omega-ui-core/types/contract';
export type { OmegaContract };

export class WasmLoaderService {
  /**
   * Loads a WASM file and attempts to call 'omega_get_contract'
   */
  static async extractContract(file: File): Promise<OmegaContract> {
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a robust import object using a Proxy to catch all OMEGA host functions
    const hostFunctions: Record<string, WebAssembly.ImportValue> = {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
      abort: () => console.warn('[WASM] Abort called'),
      // Standard OMEGA host functions that might be called during static init
      omega_log: (ptr: number) => console.log('[WASM LOG] Pointer:', ptr),
    };
    
    const importObject: WebAssembly.Imports = {
      env: new Proxy(hostFunctions, {
        get(target: Record<string, WebAssembly.ImportValue>, prop: string): WebAssembly.ImportValue | undefined {
          if (prop in target) return target[prop];
          
          // Return a dummy callable for any requested OMEGA host function (omega_...)
          if (prop.startsWith('omega_')) {
            console.debug(`[WASM-LINK] Providing dummy for missing host function: ${prop}`);
            return () => 0; 
          }
          
          return undefined;
        }
      })
    };

    try {
      const { instance } = await WebAssembly.instantiate(arrayBuffer, importObject);
      const exports = instance.exports as { 
        omega_get_contract?: () => number;
        memory?: WebAssembly.Memory;
      };

      if (!exports.omega_get_contract) {
        throw new Error("WASM module is not OMEGA-compliant (missing 'omega_get_contract' export).");
      }

      // Call the function to get the pointer to the JSON string
      const ptr = exports.omega_get_contract();
      
      // Read the string from WASM memory
      const memory = exports.memory || (hostFunctions.memory as WebAssembly.Memory);
      const jsonString = this.readStringFromMemory(memory, ptr);
      const raw = JSON.parse(jsonString) as Record<string, unknown>;
      const data = (raw.contract || raw) as Record<string, unknown>;

      interface RawParam { id?: string; name?: string; min?: number; max?: number; default?: number; unit?: string; }
      interface RawPort { id?: string; name?: string; type?: string; direction?: string; }

      // Normalization for Era 7.1 consistency
      const contract: OmegaContract = {
        omega_version: String(data.omega_version || data.version || "7.0"),
        id: String(data.id || 'unknown'),
        name: String(data.name || data.id || 'unknown'),
        family: String(data.family || "utility").toLowerCase(),
        parameters: ((data.parameters as RawParam[]) || []).map((p: RawParam) => ({
          id: String(p.id || p.name || '').toLowerCase(),
          name: p.name || p.id || 'unknown',
          min: p.min ?? 0,
          max: p.max ?? 1,
          default: p.default ?? 0,
          unit: p.unit
        })),
        ports: ((data.ports as RawPort[]) || []).map((p: RawPort) => ({
          id: String(p.id || p.name || '').toLowerCase(),
          type: (p.type || 'audio') as 'audio' | 'cv' | 'midi' | 'gate',
          direction: (p.direction || 'input') as 'input' | 'output'
        }))
      };

      return contract;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to extract OMEGA contract:", message);
      throw new Error(`LinkError: Binary requires host functions or is corrupted. Details: ${message}`);
    }
  }

  private static readStringFromMemory(memory: WebAssembly.Memory, ptr: number): string {
    const view = new Uint8Array(memory.buffer);
    let end = ptr;
    while (view[end] !== 0 && end < view.length) end++; // Null-terminated string
    
    const decoder = new TextDecoder();
    return decoder.decode(view.slice(ptr, end));
  }
}
