# ===================================================================================
#  ui_stage.cmake — Staging script for the EMBEDDED Web UI (self-contained standalone)
#
#  The standalone no longer reads the interface from a hardcoded disk path
#  (previously "d:\desarrollos\ABDOmega\ui", which no longer exists). Instead, the
#  runtime files are staged here and packed into a ZIP that gets embedded in the
#  binary via juce_add_binary_data. The WebBrowserComponent resource provider then
#  serves every request from memory (juce::ZipFile over the embedded bytes).
#
#  Required -D vars:
#    UI_SRC     : host/ui                          (source of the web UI)
#    CORE_SRC   : web/src/omega-ui-core            (resolved omega-ui-core CSS/fonts)
#    STAGE_DIR  : build staging directory (ephemeral)
#    ZIP_OUT    : output .zip path (embedded)
#
#  NOTE: only the files actually referenced at runtime are embedded. The 61MB
#  omega-ui-core TS source tree and the full Inter/Outfit font families are NOT
#  included — only the CSS files imported by index.css/fonts.css and the 9 font
#  files referenced by fonts.css / css/*.css.
# ===================================================================================

if (NOT DEFINED UI_SRC OR NOT DEFINED CORE_SRC OR NOT DEFINED STAGE_DIR OR NOT DEFINED ZIP_OUT)
    message (FATAL_ERROR "ui_stage.cmake requires UI_SRC, CORE_SRC, STAGE_DIR and ZIP_OUT")
endif()

# Resolve canonical absolute paths. The build invokes this script with paths
# that still contain ".." components (src/Plugin/../ui); file(COPY) on Windows
# fails on those chains (classic "cannot find ... File exists"), and the
# omega-ui-core/fonts dirs are junctions. REALPATH resolves all of it.
get_filename_component (UI_SRC    "${UI_SRC}"    REALPATH)
get_filename_component (CORE_SRC  "${CORE_SRC}"  REALPATH)
get_filename_component (STAGE_DIR "${STAGE_DIR}" ABSOLUTE)
get_filename_component (ZIP_OUT   "${ZIP_OUT}"   ABSOLUTE)

file (REMOVE_RECURSE "${STAGE_DIR}")
file (MAKE_DIRECTORY "${STAGE_DIR}")

# --- entry documents -----------------------------------------------------------
file (COPY "${UI_SRC}/index.html" DESTINATION "${STAGE_DIR}")
file (COPY "${UI_SRC}/bundle.js"  DESTINATION "${STAGE_DIR}")

# --- css tree (styles + inline images) -----------------------------------------
file (COPY "${UI_SRC}/css" DESTINATION "${STAGE_DIR}")

# --- assets (rack rails, power bus, textures) ----------------------------------
file (COPY "${UI_SRC}/assets" DESTINATION "${STAGE_DIR}")

# --- omega-ui-core CSS (resolved from web/src/omega-ui-core) -------------------
file (MAKE_DIRECTORY "${STAGE_DIR}/omega-ui-core"
                     "${STAGE_DIR}/omega-ui-core/tokens"
                     "${STAGE_DIR}/omega-ui-core/layout"
                     "${STAGE_DIR}/omega-ui-core/primitives"
                     "${STAGE_DIR}/omega-ui-core/typography")
file (COPY "${CORE_SRC}/index.css"          DESTINATION "${STAGE_DIR}/omega-ui-core")
file (COPY "${CORE_SRC}/tokens"             DESTINATION "${STAGE_DIR}/omega-ui-core")
file (COPY "${CORE_SRC}/layout"             DESTINATION "${STAGE_DIR}/omega-ui-core")
file (COPY "${CORE_SRC}/primitives"         DESTINATION "${STAGE_DIR}/omega-ui-core")
file (COPY "${CORE_SRC}/typography/fonts.css" DESTINATION "${STAGE_DIR}/omega-ui-core/typography")

# --- fonts referenced by fonts.css / css/*.css (only the 9 used files) ----------
file (MAKE_DIRECTORY "${STAGE_DIR}/fonts/Inter" "${STAGE_DIR}/fonts/Outfit")
file (COPY
      "${CORE_SRC}/typography/fonts/Inter/Inter-Regular.woff2"
      "${CORE_SRC}/typography/fonts/Inter/Inter-Medium.woff2"
      "${CORE_SRC}/typography/fonts/Inter/Inter-Bold.woff2"
      "${CORE_SRC}/typography/fonts/Inter/Inter-Black.woff2"
      DESTINATION "${STAGE_DIR}/fonts/Inter")
file (COPY
      "${CORE_SRC}/typography/fonts/Outfit/Outfit-Regular.ttf"
      "${CORE_SRC}/typography/fonts/Outfit/Outfit-Bold.ttf"
      "${CORE_SRC}/typography/fonts/Outfit/Outfit-Black.ttf"
      DESTINATION "${STAGE_DIR}/fonts/Outfit")
file (COPY
      "${CORE_SRC}/typography/fonts/SevenSegment.ttf"
      "${CORE_SRC}/typography/fonts/microgrammanormal.ttf"
      DESTINATION "${STAGE_DIR}/fonts")

# --- pack the ZIP (entries relative to STAGE_DIR) ------------------------------
execute_process (
    COMMAND "${CMAKE_COMMAND}" -E tar "cf" "${ZIP_OUT}" --format=zip --
            index.html bundle.js css assets omega-ui-core fonts
    WORKING_DIRECTORY "${STAGE_DIR}"
    RESULT_VARIABLE _tar_result)
if (NOT _tar_result EQUAL 0)
    message (FATAL_ERROR "ui_stage: cmake -E tar failed with exit ${_tar_result}")
endif()

# --- sanity check: critical entries must be present ----------------------------
execute_process (
    COMMAND "${CMAKE_COMMAND}" -E tar "tf" "${ZIP_OUT}"
    OUTPUT_VARIABLE _entries
    RESULT_VARIABLE _list_result)
if (_list_result EQUAL 0)
    foreach (_required IN ITEMS "index.html" "bundle.js" "css/base.css" "omega-ui-core/index.css")
        string (FIND "${_entries}" "${_required}" _found)
        if (_found EQUAL -1)
            message (FATAL_ERROR "ui_stage: '${_required}' missing from ${ZIP_OUT}")
        endif()
    endforeach()
    string (REPLACE "\n" " " _entry_summary "${_entries}")
    message (STATUS "ui_stage: embedded UI zip ready (${_entry_summary})")
else()
    message (WARNING "ui_stage: could not list zip contents")
endif()
