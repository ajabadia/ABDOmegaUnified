#pragma once

#include <juce_core/juce_core.h>
#include <vector>
#include "PatchDocument.h"

namespace Omega {
namespace UI {
namespace Persistence {

    /**
     * @brief Info mínima de un patch para el browser (getBrowserData).
     */
    struct PatchInfo {
        juce::String name;
        juce::String author;
        juce::int64 modifiedAt { 0 };
    };

    /**
     * @brief Repositorio de patches a disco (P0-3).
     *
     * Cada preset vive en su propio archivo JSON: <Nombre>.patch.json dentro de
     * %AppData%/ABDOmega/patches (ver defaultDir()). Formato: VarSerialization
     * (round-trip COMPLETO del PatchDocument — metadata, módulos, conexiones,
     * globalFxParams y patchbayMatrix 7/7; a diferencia del binario del plugin
     * que omite patchbayMatrix).
     *
     * El autosave de sesión usa current.patch.json en el mismo directorio:
     * saveCurrent()/loadCurrent(). Se excluye del listado de presets de usuario.
     */
    class PatchRepository {
    public:
        /**
         * @brief Construye el repositorio sobre un directorio.
         * @param baseDir Directorio de patches. Si es un File inválido, usa
         *        defaultDir() (datos de aplicación del usuario).
         */
        explicit PatchRepository(juce::File baseDir = juce::File());

        /** @brief Directorio por defecto: %AppData%/ABDOmega/patches. */
        static juce::File defaultDir();

        /** @brief Guarda el patch con el nombre dado (sobrescribe si existe).
         *  Actualiza metadata.name/author y modifiedAt en la copia guardada. */
        bool save(const Core::Model::PatchDocument& doc, const juce::String& name);

        /** @brief Carga un patch por nombre. false si no existe o el JSON es inválido. */
        bool load(const juce::String& name, Core::Model::PatchDocument& out);

        /** @brief Elimina un patch por nombre. false si no existe. */
        bool remove(const juce::String& name);

        /** @brief true si existe un patch con ese nombre. */
        bool exists(const juce::String& name) const;

        /** @brief Lista los presets de usuario (excluye current.patch.json). */
        std::vector<PatchInfo> list() const;

        /** @brief Autosave de sesión (current.patch.json). */
        bool saveCurrent(const Core::Model::PatchDocument& doc);
        bool loadCurrent(Core::Model::PatchDocument& out);
        juce::File currentFile() const { return mDir.getChildFile("current.patch.json"); }

        juce::File patchesDir() const { return mDir; }

    private:
        static juce::String sanitizeName(const juce::String& name);
        juce::File patchFile(const juce::String& name) const;
        bool writeDoc(const juce::File& file, const Core::Model::PatchDocument& doc);
        bool readDoc(const juce::File& file, Core::Model::PatchDocument& out);

        juce::File mDir;
    };

} // namespace Persistence
} // namespace UI
} // namespace Omega
