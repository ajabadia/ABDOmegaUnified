#pragma once

#include <string>
#include <vector>

namespace Omega::Core {

    /**
     * @brief Minimalist ModSource for Era 7 Aseptic Bridge.
     */
    enum class ModSource {
        Count,
        PE1, PE2,
        ModWheel, Breath, Expression, Sustain, Ribbon
    };

    /**
     * @brief Parameter value types for UI and validation.
     */
    enum class ParamValueType {
        Continuous,
        Integer,
        Boolean,
        Enum
    };

    /**
     * @brief Option for Enum-type parameters.
     */
    struct ParameterOption {
        int value;
        std::string label;
    };

} // namespace Omega::Core
