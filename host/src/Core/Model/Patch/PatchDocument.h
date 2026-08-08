#pragma once

#include <vector>
#include <string>
#include <optional>
#include "PatchIdentifiers.h"

namespace Omega {
namespace Core {
namespace Model {

    /**
     * @brief Valor de un parámetro individual.
     */
    struct ParamValue {
        ParamId id;
        float value;
        uint32_t modulationBindingId { 0 }; // 0 = Sin modulación externa
    };

    /**
     * @brief Instancia de un módulo en el rack.
     */
    struct ModuleInstance {
        uint32_t instanceId;
        ModuleTypeId typeId;
        
        struct RackPosition {
            int16_t rack { 0 };
            int16_t slot { 0 };
            int16_t order { 0 };
        } position;

        std::vector<ParamValue> parameters;
        
        struct Flags {
            bool bypassed { false };
            bool muted { false };
            bool soloed { false };
        } flags;
    };

    /**
     * @brief Conexión entre dos puertos de módulos.
     *
     * [P1-3] Contrato de los portIds: sourcePortId/targetPortId son ÍNDICES en
     * la lista de puertos del catálogo del módulo (catalog.ports[idx].id) — así
     * los interpreta RuntimeCompiler (srcBus/dstBus y la correlación con
     * PatchbayMatrixSlot en resolveConnectionAmount). NOTA: hoy esta estructura
     * solo se puebla vía round-trip de VarSerialization (los cables reales de la
     * UI viven en patchbayMatrix con IDs por nombre "instanceId.portId"); si un
     * productor futuro usa portIds NO-índice, la correlación de amount no matchea
     * y cae al fallback 1.0 (seguro, sin ruptura).
     */
    struct PatchConnection {
        uint32_t sourceModuleId;
        uint16_t sourcePortId;
        uint32_t targetModuleId;
        uint16_t targetPortId;
        ConnectionType type;
    };

    /**
     * @brief Un slot del Patchbay Matrix (Era 7).
     * Los IDs de puerto usan el formato "instanceId.portId" (p. ej. "osc1.freq").
     */
    struct PatchbayMatrixSlot {
        std::string source;    // "instanceId.portId"
        std::string target;    // "instanceId.portId"
        float amount { 0.0f };
        std::string via;       // "instanceId.portId"
        float viaAmount { 0.0f };
        bool active { false };
        std::string color;     // Color de cable personalizado (hex "#rrggbb"); vacío = por tipo de señal
    };

    /**
     * @brief Metadatos del patch (Serialización y UI).
     */
    struct PatchMetadata {
        std::string uuid;
        std::string name;
        std::string author;
        uint64_t createdAt { 0 };
        uint64_t modifiedAt { 0 };
        std::vector<std::string> tags;
    };

    /**
     * @brief La Fuente de Verdad Única (SOT) de la Era 7.
     */
    struct PatchDocument {
        PatchMetadata metadata;
        
        // Global Settings
        float masterGainDb { 0.0f };
        int16_t globalTranspose { 0 };
        int16_t globalMidiChannel { 0 }; // 0 = Omni
        
        // El grafo de síntesis
        std::vector<ModuleInstance> modules;
        std::vector<PatchConnection> connections;
        std::vector<PatchbayMatrixSlot> patchbayMatrix;
        
        // FX Globales tratados como módulos especiales o parámetros directos
        std::vector<ParamValue> globalFxParams;

        /**
         * @brief Busca un módulo por su ID de instancia.
         */
        const ModuleInstance* findModule(uint32_t instanceId) const {
            for (const auto& m : modules) {
                if (m.instanceId == instanceId) return &m;
            }
            return nullptr;
        }
    };

    /**
     * [P0-2] Patch inicial del rack (modular puro): incluye el módulo midi_in
     * como puente de entrada del sistema. El MIDI del DAW/teclado solo entra por
     * aquí; sin este módulo el rack no recibe notas. Fuente única: usada por
     * RpcPresetController::handleNewPreset y por el arranque del plugin
     * (OmegaAudioProcessor) para que el default NO sea un rack vacío.
     */
    inline PatchDocument createDefaultPatch() {
        PatchDocument doc;
        doc.metadata.name = "Aseptic Initial Patch";
        doc.masterGainDb = 0.0f;

        ModuleInstance midiIn;
        midiIn.instanceId = 1;
        midiIn.typeId = ModuleTypeId::MidiIn;
        midiIn.position.rack = 0;
        midiIn.position.slot = 0;
        midiIn.position.order = 0;
        doc.modules.push_back(midiIn);

        return doc;
    }

    /**
     * @brief [P2-4] Patch de fábrica con nombre, para el browser de presets.
     */
    struct FactoryPreset {
        std::string name;
        PatchDocument doc;
    };

    /**
     * [P2-4] Librería de fábrica PROGRAMÁTICA (fuente única, a prueba de
     * versiones — no hay JSON en disco que pueda quedarse obsoleto).
     *
     * Diagnóstico original: el browser de la UI mostraba nombres de fábrica
     * falsos (fallback en PresetBrowser.ts) y el backend devolvía SOLO "Aseptic
     * Init Patch" hardcodeado en getBrowserData; pulsar cualquier otro nombre
     * cargaba el patch inicial en silencio (UX engañosa).
     *
     * Cada preset se construye SOLO con módulos del catálogo runtime real
     * (Resources/modules): midi_in (MidiIn) y omega_lab_monitor (TestParity,
     * catálogo "test_parity_v7"). El formato del documento es el mismo que
     * persiste PatchRepository (VarSerialization), así que cargar un preset de
     * fábrica es exactamente igual que cargar uno de usuario.
     */
    inline std::vector<FactoryPreset> createFactoryPresets() {
        std::vector<FactoryPreset> factory;

        // 1. Aseptic Init Patch — puente MIDI del sistema (rack mínimo).
        // [Revisor P2-4] createDefaultPatch() fija metadata.name = "Aseptic
        // Initial Patch"; se alinea al nombre del browser para que el wire/LCD
        // muestre el MISMO nombre tras cargar (el preset MIDI Monitor ya lo hace).
        auto initDoc = createDefaultPatch();
        initDoc.metadata.name = "Aseptic Init Patch";
        factory.push_back({ "Aseptic Init Patch", std::move(initDoc) });

        // 2. MIDI Monitor — puente MIDI + monitor de telemetría (CV/Audio).
        {
            PatchDocument doc;
            doc.metadata.name = "MIDI Monitor";
            doc.masterGainDb = 0.0f;

            ModuleInstance midiIn;
            midiIn.instanceId = 1;
            midiIn.typeId = ModuleTypeId::MidiIn;
            midiIn.position.rack = 0;
            midiIn.position.slot = 0;
            midiIn.position.order = 0;
            doc.modules.push_back(midiIn);

            ModuleInstance monitor;
            monitor.instanceId = 2;
            monitor.typeId = ModuleTypeId::TestParity;
            // [Revisor P2-4] NOTA de mapeo honesta: a día de hoy el catálogo
            // mapea omega_lab_monitor → TestParity → manifest "test_parity_v7"
            // (el WASM que se instancia en runtime es el de test_parity, no el
            // de omega_lab_monitor). Gap de paridad catalog→typeId documentado;
            // re-apuntar este preset cuando se cierre esa paridad.
            monitor.position.rack = 0;
            monitor.position.slot = 1;
            monitor.position.order = 1;
            doc.modules.push_back(monitor);

            factory.push_back({ "MIDI Monitor", std::move(doc) });
        }

        return factory;
    }

} // namespace Model
} // namespace Core
} // namespace Omega
