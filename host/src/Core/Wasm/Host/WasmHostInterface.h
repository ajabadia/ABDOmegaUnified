#pragma once

#include <wasm_export.h>

/**
 * @brief Global C-style Linkage for WASM host symbol registration.
 * This prevents C++ name mangling discrepancies across the Core and Plugin modules.
 */
extern "C" void omega_wasm_register_host_symbols();
