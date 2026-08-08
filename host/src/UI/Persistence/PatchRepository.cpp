#include "PatchRepository.h"
#include "VarSerialization.h"

namespace Omega {
namespace UI {
namespace Persistence {

    namespace {

        constexpr const char* kCurrentFileName = "current.patch.json";
        constexpr const char* kPatchSuffix     = ".patch.json";

        juce::File defaultDirImpl() {
            return juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                .getChildFile("ABDOmega")
                .getChildFile("patches");
        }

    } // namespace

    PatchRepository::PatchRepository(juce::File baseDir)
        : mDir(baseDir != juce::File() ? baseDir : defaultDirImpl())
    {
    }

    juce::File PatchRepository::defaultDir() { return defaultDirImpl(); }

    juce::String PatchRepository::sanitizeName(const juce::String& name)
    {
        auto cleaned = name.trim();
        for (const auto& c : juce::String("\\/:*?\"<>|")) // NOLINT
            cleaned = cleaned.replaceCharacter(c, '_');
        cleaned = cleaned.trim();
        if (cleaned.isEmpty())
            cleaned = "UNTITLED";
        return cleaned;
    }

    juce::File PatchRepository::patchFile(const juce::String& name) const
    {
        return mDir.getChildFile(sanitizeName(name) + kPatchSuffix);
    }

    bool PatchRepository::writeDoc(const juce::File& file, const Core::Model::PatchDocument& doc)
    {
        if (file.getParentDirectory().createDirectory().failed())
            return false;

        // Round-trip completo vía VarSerialization (incl. patchbayMatrix), que
        // es exactamente el formato wire que la UI ya entiende. OJO: en este
        // JUCE, File::replaceWithText devuelve bool (no Result).
        const juce::String json = juce::JSON::toString(VarSerialization::patchDocumentToVar(doc), true);
        if (!file.replaceWithText(json))
            return false;
        return true;
    }

    bool PatchRepository::readDoc(const juce::File& file, Core::Model::PatchDocument& out)
    {
        if (!file.existsAsFile())
            return false;

        const auto parsed = juce::JSON::parse(file.loadFileAsString());
        if (parsed.isVoid() || !parsed.isObject())
            return false;

        out = VarSerialization::varToPatchDocument(parsed);
        return true;
    }

    bool PatchRepository::save(const Core::Model::PatchDocument& doc, const juce::String& name)
    {
        auto saved = doc;
        saved.metadata.name = sanitizeName(name).toStdString();
        if (saved.metadata.uuid.empty())
            saved.metadata.uuid = juce::Uuid().toDashedString().toStdString();
        if (saved.metadata.createdAt == 0)
            saved.metadata.createdAt = static_cast<uint64_t>(juce::Time::currentTimeMillis());
        saved.metadata.modifiedAt = static_cast<uint64_t>(juce::Time::currentTimeMillis());

        return writeDoc(patchFile(name), saved);
    }

    bool PatchRepository::load(const juce::String& name, Core::Model::PatchDocument& out)
    {
        return readDoc(patchFile(name), out);
    }

    bool PatchRepository::remove(const juce::String& name)
    {
        // [P2-4] deleteFile() devuelve true aunque el archivo no exista (juce):
        // fallar honestamente si el preset no está a disco para que el RPC
        // deletePreset no confunda "no existe" con "borrado".
        const auto file = patchFile(name);
        if (!file.existsAsFile())
            return false;
        return file.deleteFile();
    }

    bool PatchRepository::exists(const juce::String& name) const
    {
        return patchFile(name).existsAsFile();
    }

    std::vector<PatchInfo> PatchRepository::list() const
    {
        std::vector<PatchInfo> result;

        juce::Array<juce::File> files;
        mDir.findChildFiles(files, juce::File::findFiles, false, juce::String("*") + kPatchSuffix);
        files.sort();

        for (const auto& f : files)
        {
            if (f.getFileName() == juce::String(kCurrentFileName))
                continue; // El autosave no es un preset de usuario

            PatchInfo info;
            info.name = f.getFileNameWithoutExtension();
            info.modifiedAt = f.getLastModificationTime().toMilliseconds();

            // Leer la metadata del JSON para author (best-effort; si falla, se
            // conserva el nombre y la fecha del filesystem).
            const auto parsed = juce::JSON::parse(f.loadFileAsString());
            if (auto* metaObj = parsed.getDynamicObject())
            {
                auto metaVar = metaObj->getProperty("metadata");
                if (auto* m = metaVar.getDynamicObject())
                {
                    info.name = m->getProperty("name").toString();
                    info.author = m->getProperty("author").toString();
                    const auto modified = (juce::int64)m->getProperty("modifiedAt");
                    if (modified > 0)
                        info.modifiedAt = modified;
                }
            }

            result.push_back(info);
        }
        return result;
    }

    bool PatchRepository::saveCurrent(const Core::Model::PatchDocument& doc)
    {
        return writeDoc(currentFile(), doc);
    }

    bool PatchRepository::loadCurrent(Core::Model::PatchDocument& out)
    {
        return readDoc(currentFile(), out);
    }

} // namespace Persistence
} // namespace UI
} // namespace Omega
