#pragma once

#include "PatchDocument.h"

#include <algorithm>
#include <cstdlib>
#include <string>

namespace Omega {
namespace Core {
namespace Model {

    /**
     * @brief [P2-x] Sincronización estructural cables ↔ matrix (grupos de I/O).
     *
     * La matrix del patchbay es la fuente de verdad del cableado (la UI escribe
     * SOLO aquí vía updatePatchbayMatrixSlot; los cables SVG del frontal la leen
     * y renderizan). Cuando la estructura del rack cambia, los slots que
     * referencian módulos desaparecidos deben eliminarse junto con las
     * conexiones huérfanas — esto es el lado "eliminar grupos de entrada/salida"
     * de la sincronización bidireccional:
     *
     *   - crear:   drag-to-patch / modal crean slots (RPC updatePatchbayMatrixSlot)
     *   - cambiar: la UI edita source/target/amount del slot (mismo RPC)
     *   - eliminar: este helper (removeModule/clearRack) + las conexiones audio
     *               derivadas se regeneran en cada recompile del RuntimeCompiler
     *               (la matrix es SOT, nunca se persiste un grafo duplicado).
     *
     * Formato de IDs: "instanceId.portId" con instanceId numérico (convención
     * real del rack, p. ej. "1.out"). Los IDs legacy NO numéricos ("osc1.freq",
     * solo presentes en tests viejos) no se correlacionan — nunca los escribió
     * la UI.
     */
    inline void pruneOrphanedMatrixSlots(PatchDocument& doc, uint32_t removedInstanceId) {
        auto references = [removedInstanceId](const std::string& qualifiedId) {
            const size_t dot = qualifiedId.find('.');
            if (dot == std::string::npos || dot == 0) return false;
            const std::string prefix = qualifiedId.substr(0, dot);
            if (prefix.empty()) return false;
            for (char c : prefix) {
                if (c < '0' || c > '9') return false; // ID legacy no numérico → no correlaciona
            }
            return std::strtoul(prefix.c_str(), nullptr, 10) == removedInstanceId;
        };

        auto& slots = doc.patchbayMatrix;
        slots.erase(
            std::remove_if(slots.begin(), slots.end(),
                           [&](const PatchbayMatrixSlot& s) {
                               return references(s.source) || references(s.target) || references(s.via);
                           }),
            slots.end());

        auto& conns = doc.connections;
        conns.erase(
            std::remove_if(conns.begin(), conns.end(),
                           [removedInstanceId](const PatchConnection& c) {
                               return c.sourceModuleId == removedInstanceId ||
                                      c.targetModuleId == removedInstanceId;
                           }),
            conns.end());
    }

} // namespace Model
} // namespace Core
} // namespace Omega
