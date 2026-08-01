#include "ExportUI.h"
#include "ExportControls.h"

namespace Omega {
namespace Core {
namespace Ace {
namespace ExportUI {

    juce::var uiToVar(const ComponentInfo& info) {
        // ERA 7 UI BLOCK
        auto uiObj = new juce::DynamicObject();
        uiObj->setProperty("skin", juce::String(info.uiSkin));

        auto dims = new juce::DynamicObject();
        dims->setProperty("width", info.uiWidth);
        dims->setProperty("height", info.uiHeight);
        uiObj->setProperty("dimensions", juce::var(dims));

        uiObj->setProperty("controls", ExportControls::uiItemsToVar(info.uiControls));
        uiObj->setProperty("jacks", ExportControls::uiItemsToVar(info.uiJacks));

        // ERA 7.2 LAYOUT BLOCK
        auto layoutObj = new juce::DynamicObject();
        layoutObj->setProperty("gridSnap", info.gridSnap);

        juce::Array<juce::var> containersArr;
        for (const auto& c : info.uiContainers) {
            auto co = new juce::DynamicObject();
            co->setProperty("id", juce::String(c.id));
            co->setProperty("label", juce::String(c.label));

            auto cpos = new juce::DynamicObject();
            cpos->setProperty("x", c.x);
            cpos->setProperty("y", c.y);
            co->setProperty("pos", juce::var(cpos));

            auto csize = new juce::DynamicObject();
            csize->setProperty("w", juce::String(c.width));
            csize->setProperty("h", c.height);
            co->setProperty("size", juce::var(csize));

            co->setProperty("variant", juce::String(c.variant));
            co->setProperty("tab", juce::String(c.tab));
            co->setProperty("zIndex", c.zIndex);
            co->setProperty("labelPosition", juce::String(c.labelPosition));
            containersArr.add(juce::var(co));
        }
        layoutObj->setProperty("containers", containersArr);
        uiObj->setProperty("layout", juce::var(layoutObj));

        return juce::var(uiObj);
    }

} // namespace ExportUI
} // namespace Ace
} // namespace Core
} // namespace Omega
