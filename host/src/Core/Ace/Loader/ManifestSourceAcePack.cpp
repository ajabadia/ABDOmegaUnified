#include "ManifestSourceAcePack.h"

#include "ManifestSourceZip.h"

namespace Omega {
namespace Core {
namespace Ace {

    ManifestSourceAcePack::ManifestSourceAcePack(AceCatalog& catalog)
        : mCatalog(catalog), mZip(catalog) {}

    bool ManifestSourceAcePack::loadFromAcePack(const juce::File& acePackFile) {
        if (!acePackFile.existsAsFile()) return false;
        juce::ZipFile zip(acePackFile);
        int loaded = 0;
        for (int i = 0; i < zip.getNumEntries(); ++i) {
            auto* entry = zip.getEntry(i);
            if (entry == nullptr) continue;
            juce::String name = entry->filename;
            if (name.endsWithIgnoreCase(".acemm") || name.endsWithIgnoreCase(".yaml")) {
                std::unique_ptr<juce::InputStream> stream(zip.createStreamForEntry(i));
                if (stream && mZip.loadFromArchive(*stream, name, acePackFile.getFullPathName())) {
                    loaded++;
                }
            }
        }
        return loaded > 0;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
