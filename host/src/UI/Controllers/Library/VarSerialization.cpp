#include "VarSerialization.h"

namespace Omega {
namespace UI {
namespace VarSerialization {

    juce::var patchDocumentToVar(const Core::Model::PatchDocument& doc)
    {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("masterGainDb", doc.masterGainDb);
        obj->setProperty("globalTranspose", doc.globalTranspose);
        obj->setProperty("globalMidiChannel", doc.globalMidiChannel);

        juce::DynamicObject::Ptr meta = new juce::DynamicObject();
        meta->setProperty("uuid", juce::String(doc.metadata.uuid));
        meta->setProperty("name", juce::String(doc.metadata.name));
        meta->setProperty("author", juce::String(doc.metadata.author));
        meta->setProperty("createdAt", (juce::int64)doc.metadata.createdAt);
        meta->setProperty("modifiedAt", (juce::int64)doc.metadata.modifiedAt);
        juce::Array<juce::var> tags;
        for (auto& t : doc.metadata.tags) tags.add(juce::String(t));
        meta->setProperty("tags", tags);
        obj->setProperty("metadata", juce::var(meta.get()));

        juce::Array<juce::var> modules;
        for (auto& m : doc.modules) {
            juce::DynamicObject::Ptr mo = new juce::DynamicObject();
            mo->setProperty("instanceId", (int)m.instanceId);
            mo->setProperty("typeId", (int)m.typeId);
            mo->setProperty("rack", m.position.rack);
            mo->setProperty("slot", m.position.slot);
            mo->setProperty("order", m.position.order);
            mo->setProperty("bypassed", m.flags.bypassed);
            mo->setProperty("muted", m.flags.muted);
            mo->setProperty("soloed", m.flags.soloed);
            juce::Array<juce::var> params;
            for (auto& p : m.parameters) {
                juce::DynamicObject::Ptr po = new juce::DynamicObject();
                po->setProperty("id", (int)p.id);
                po->setProperty("value", p.value);
                po->setProperty("modulationBindingId", (int)p.modulationBindingId);
                params.add(juce::var(po.get()));
            }
            mo->setProperty("parameters", params);
            modules.add(juce::var(mo.get()));
        }
        obj->setProperty("modules", modules);

        juce::Array<juce::var> conns;
        for (auto& c : doc.connections) {
            juce::DynamicObject::Ptr co = new juce::DynamicObject();
            co->setProperty("sourceModuleId", (int)c.sourceModuleId);
            co->setProperty("sourcePortId", (int)c.sourcePortId);
            co->setProperty("targetModuleId", (int)c.targetModuleId);
            co->setProperty("targetPortId", (int)c.targetPortId);
            co->setProperty("type", (int)c.type);
            conns.add(juce::var(co.get()));
        }
        obj->setProperty("connections", conns);

        juce::Array<juce::var> fxParams;
        for (auto& p : doc.globalFxParams) {
            juce::DynamicObject::Ptr fo = new juce::DynamicObject();
            fo->setProperty("id", (int)p.id);
            fo->setProperty("value", p.value);
            fo->setProperty("modulationBindingId", (int)p.modulationBindingId);
            fxParams.add(juce::var(fo.get()));
        }
        obj->setProperty("globalFxParams", fxParams);

        juce::Array<juce::var> matrixArr;
        for (auto& s : doc.patchbayMatrix) {
            juce::DynamicObject::Ptr so = new juce::DynamicObject();
            so->setProperty("source", juce::String(s.source));
            so->setProperty("target", juce::String(s.target));
            so->setProperty("amount", s.amount);
            so->setProperty("via", juce::String(s.via));
            so->setProperty("viaAmount", s.viaAmount);
            so->setProperty("color", juce::String(s.color));
            so->setProperty("active", s.active);
            matrixArr.add(juce::var(so.get()));
        }
        obj->setProperty("patchbayMatrix", matrixArr);

        return juce::var(obj.get());
    }

    Core::Model::PatchDocument varToPatchDocument(const juce::var& v)
    {
        Core::Model::PatchDocument doc;
        auto* obj = v.getDynamicObject();
        if (!obj) return doc;

        doc.masterGainDb = (float)obj->getProperty("masterGainDb");
        doc.globalTranspose = (int16_t)(int)obj->getProperty("globalTranspose");
        doc.globalMidiChannel = (int16_t)(int)obj->getProperty("globalMidiChannel");

        auto metaVar = obj->getProperty("metadata");
        if (auto* metaObj = metaVar.getDynamicObject()) {
            doc.metadata.uuid = metaObj->getProperty("uuid").toString().toStdString();
            doc.metadata.name = metaObj->getProperty("name").toString().toStdString();
            doc.metadata.author = metaObj->getProperty("author").toString().toStdString();
            doc.metadata.createdAt = (uint64_t)(juce::int64)metaObj->getProperty("createdAt");
            doc.metadata.modifiedAt = (uint64_t)(juce::int64)metaObj->getProperty("modifiedAt");
            auto tagsArr = metaObj->getProperty("tags");
            if (auto* arr = tagsArr.getArray()) {
                for (auto& t : *arr) doc.metadata.tags.push_back(t.toString().toStdString());
            }
        }

        auto modsArr = obj->getProperty("modules");
        if (auto* arr = modsArr.getArray()) {
            for (auto& mv : *arr) {
                auto* mo = mv.getDynamicObject();
                if (!mo) continue;
                Core::Model::ModuleInstance mi;
                mi.instanceId = (uint32_t)(int)mo->getProperty("instanceId");
                mi.typeId = (Core::Model::ModuleTypeId)(int)mo->getProperty("typeId");
                mi.position.rack = (int16_t)(int)mo->getProperty("rack");
                mi.position.slot = (int16_t)(int)mo->getProperty("slot");
                mi.position.order = (int16_t)(int)mo->getProperty("order");
                mi.flags.bypassed = (bool)mo->getProperty("bypassed");
                mi.flags.muted = (bool)mo->getProperty("muted");
                mi.flags.soloed = (bool)mo->getProperty("soloed");
                auto paramsArr = mo->getProperty("parameters");
                if (auto* pa = paramsArr.getArray()) {
                    for (auto& pv : *pa) {
                        auto* po = pv.getDynamicObject();
                        if (!po) continue;
                        Core::Model::ParamValue pv2;
                        pv2.id = (Core::Model::ParamId)(int)po->getProperty("id");
                        pv2.value = (float)po->getProperty("value");
                        pv2.modulationBindingId = (uint32_t)(int)po->getProperty("modulationBindingId");
                        mi.parameters.push_back(pv2);
                    }
                }
                doc.modules.push_back(mi);
            }
        }

        auto connsArr = obj->getProperty("connections");
        if (auto* ca = connsArr.getArray()) {
            for (auto& cv : *ca) {
                auto* co = cv.getDynamicObject();
                if (!co) continue;
                Core::Model::PatchConnection pc;
                pc.sourceModuleId = (uint32_t)(int)co->getProperty("sourceModuleId");
                pc.sourcePortId = (uint16_t)(int)co->getProperty("sourcePortId");
                pc.targetModuleId = (uint32_t)(int)co->getProperty("targetModuleId");
                pc.targetPortId = (uint16_t)(int)co->getProperty("targetPortId");
                pc.type = (Core::Model::ConnectionType)(int)co->getProperty("type");
                doc.connections.push_back(pc);
            }
        }

        auto fxArr = obj->getProperty("globalFxParams");
        if (auto* fa = fxArr.getArray()) {
            for (auto& fv : *fa) {
                auto* fo = fv.getDynamicObject();
                if (!fo) continue;
                Core::Model::ParamValue pv;
                pv.id = (Core::Model::ParamId)(int)fo->getProperty("id");
                pv.value = (float)fo->getProperty("value");
                pv.modulationBindingId = (uint32_t)(int)fo->getProperty("modulationBindingId");
                doc.globalFxParams.push_back(pv);
            }
        }

        auto matrixArr = obj->getProperty("patchbayMatrix");
        if (auto* ma = matrixArr.getArray()) {
            for (auto& sv : *ma) {
                auto* so = sv.getDynamicObject();
                if (!so) continue;
                Core::Model::PatchbayMatrixSlot ms;
                ms.source = so->getProperty("source").toString().toStdString();
                ms.target = so->getProperty("target").toString().toStdString();
                ms.amount = (float)so->getProperty("amount");
                ms.via = so->getProperty("via").toString().toStdString();
                ms.viaAmount = (float)so->getProperty("viaAmount");
                ms.color = so->getProperty("color").toString().toStdString();
                ms.active = (bool)so->getProperty("active");
                doc.patchbayMatrix.push_back(ms);
            }
        }

        return doc;
    }

    juce::var valueTreeToVar(const juce::ValueTree& tree) {
        if (!tree.isValid()) return juce::var();
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        for (int i = 0; i < tree.getNumProperties(); ++i) {
            obj->setProperty(tree.getPropertyName(i), tree.getProperty(tree.getPropertyName(i)));
        }
        return juce::var(obj.get());
    }

} // namespace VarSerialization
} // namespace UI
} // namespace Omega
