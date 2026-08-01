#include "ExportControls.h"
#include "ExportAttachments.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportControls {

    juce::var uiItemsToVar(const std::vector<UIItem>& items) {
        juce::Array<juce::var> arr;
        for (const auto& item : items) {
            auto o = new juce::DynamicObject();
            o->setProperty("bind", juce::String(item.bind));
            o->setProperty("type", juce::String(item.type));
            o->setProperty("label", juce::String(item.label));

            auto pos = new juce::DynamicObject();
            pos->setProperty("x", item.x);
            pos->setProperty("y", item.y);
            o->setProperty("pos", juce::var(pos));

            auto pres = new juce::DynamicObject();
            pres->setProperty("tab", juce::String(item.tab));
            pres->setProperty("container", juce::String(item.container));
            pres->setProperty("group", juce::String(item.group));
            pres->setProperty("component", juce::String(item.component));
            pres->setProperty("variant", juce::String(item.variant));

            pres->setProperty("attachments", ExportAttachments::attachmentsToVar(item.attachments));
            o->setProperty("presentation", juce::var(pres));

            arr.add(juce::var(o));
        }
        return juce::var(arr);
    }

} // namespace ExportControls
} // namespace Ace
} // namespace Core
} // namespace Omega
