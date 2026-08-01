#include <juce_core/juce_core.h>
#include <iostream>
#include <fstream>
#include "AceCatalog.h"

/**
 * @brief Standalone OMEGA Aseptic Schema Tool.
 * [ERA 6.3]: Now acts as a thin wrapper around Omega::Core::Ace::AceCatalog.
 * Centralizing the schema definition ensures 100% sync between the engine and the editor.
 */
int main(int argc, char* argv[])
{
    juce::StringArray args;
    for (int i = 1; i < argc; ++i)
        args.add(argv[i]);

    juce::String outputPath = "";
    juce::String contractsPath = "";
    juce::String modulesPath = "";

    for (int i = 0; i < args.size(); ++i)
    {
        if (args[i] == "--output" && i + 1 < args.size())
            outputPath = args[i + 1];
        if (args[i] == "--export-contracts" && i + 1 < args.size())
            contractsPath = args[i + 1];
        if (args[i] == "--modules" && i + 1 < args.size())
            modulesPath = args[i + 1];
    }

    Omega::Core::Ace::AceCatalog catalog;
    
    // Load modules if path provided
    if (modulesPath.isNotEmpty()) {
        juce::File modDir(modulesPath);
        if (modDir.isDirectory()) {
            std::cout << "[INFO] Loading modules from: " << modulesPath << std::endl;
            catalog.loadFromModulesDirectory(modDir);
        }
    }

    // Command 1: Generate Schema
    if (outputPath.isNotEmpty() || (contractsPath.isEmpty() && modulesPath.isEmpty())) {
        juce::var schemaVar = catalog.generateSchema();
        juce::String jsonResult = juce::JSON::toString(schemaVar, false);

        if (outputPath.isNotEmpty())
        {
            juce::File outFile(outputPath);
            outFile.replaceWithText(jsonResult);
            std::cout << "[SUCCESS] Aseptic Schema generated at: " << outputPath << std::endl;
        }
        else if (contractsPath.isEmpty())
        {
            std::cout << jsonResult << std::endl;
        }
    }

    // Command 2: Export Contracts
    if (contractsPath.isNotEmpty()) {
        juce::File outDir(contractsPath);
        std::cout << "[INFO] Exporting contracts to: " << contractsPath << std::endl;
        catalog.exportAllContracts(outDir);
        std::cout << "[SUCCESS] Contracts exported." << std::endl;
    }

    return 0;
}
