#include "ExportAttachments.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportAttachments {

    juce::var attachmentToVar(const Attachment& a) {
        auto ao = new juce::DynamicObject();
        ao->setProperty("type", juce::String(a.type));
        ao->setProperty("position", juce::String(a.position));
        ao->setProperty("bind", juce::String(a.bind));
        ao->setProperty("text", juce::String(a.text));
        ao->setProperty("variant", juce::String(a.variant));
        ao->setProperty("offset", a.offset);
        return juce::var(ao);
    }

    juce::var attachmentsToVar(const std::vector<Attachment>& attachments) {
        juce::Array<juce::var> arr;
        for (const auto& a : attachments)
            arr.add(attachmentToVar(a));
        return juce::var(arr);
    }

} // namespace ExportAttachments
} // namespace Ace
} // namespace Core
} // namespace Omega
