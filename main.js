const { Plugin, Modal, PluginSettingTab, Setting, Notice, TFolder, MarkdownView } = require("obsidian");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath } = require("url");
let electronWebUtils = null;
try {
  electronWebUtils = require("electron").webUtils;
} catch (error) {
  electronWebUtils = null;
}

const DEFAULT_SETTINGS = {
  pythonPath: "",
  defaultDest: "00_Inbox/Imports",
  recursiveFolders: true,
  insertLinksOnEditorDrop: true,
  revealAfterImport: true,
  overwrite: false
};

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".xlsm",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".htm",
  ".txt",
  ".md",
  ".rtf",
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".bmp",
  ".gif",
  ".webp",
  ".wav",
  ".mp3",
  ".m4a",
  ".flac",
  ".ogg",
  ".aac",
  ".zip"
]);

const ACCEPT_EXTENSIONS = Array.from(SUPPORTED_EXTENSIONS).join(",");
const IS_WINDOWS = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const BUNDLED_RUNTIME_FILES = {
  "converter_bridge.py": "IyEvdXNyL2Jpbi9lbnYgcHl0aG9uMwoiIiJFeHRlbmRlZCBNYXJrSXREb3duIGJyaWRnZSBmb3IgdGhlIE9ic2lkaWFuIHBsdWdpbi4iIiIKCmZyb20gX19mdXR1cmVfXyBpbXBvcnQgYW5ub3RhdGlvbnMKCmltcG9ydCBhcmdwYXJzZQppbXBvcnQganNvbgppbXBvcnQgb3MKaW1wb3J0IHJlCmltcG9ydCBzaHV0aWwKaW1wb3J0IHN1YnByb2Nlc3MKaW1wb3J0IHN5cwppbXBvcnQgdGVtcGZpbGUKaW1wb3J0IHdhcm5pbmdzCmltcG9ydCB6aXBmaWxlCmZyb20gZGF0ZXRpbWUgaW1wb3J0IGRhdGV0aW1lLCB0aW1lem9uZQpmcm9tIHBhdGhsaWIgaW1wb3J0IFBhdGgKZnJvbSB1cmxsaWIucGFyc2UgaW1wb3J0IHVybHBhcnNlCgoKU1VQUE9SVEVEX0VYVEVOU0lPTlMgPSB7CiAgICAiLnBkZiIsCiAgICAiLmRvYyIsCiAgICAiLmRvY3giLAogICAgIi5wcHQiLAogICAgIi5wcHR4IiwKICAgICIueGxzIiwKICAgICIueGxzeCIsCiAgICAiLnhsc20iLAogICAgIi5jc3YiLAogICAgIi5qc29uIiwKICAgICIueG1sIiwKICAgICIuaHRtbCIsCiAgICAiLmh0bSIsCiAgICAiLnR4dCIsCiAgICAiLm1kIiwKICAgICIucnRmIiwKICAgICIucG5nIiwKICAgICIuanBnIiwKICAgICIuanBlZyIsCiAgICAiLnRpZiIsCiAgICAiLnRpZmYiLAogICAgIi5ibXAiLAogICAgIi5naWYiLAogICAgIi53ZWJwIiwKICAgICIud2F2IiwKICAgICIubXAzIiwKICAgICIubTRhIiwKICAgICIuZmxhYyIsCiAgICAiLm9nZyIsCiAgICAiLmFhYyIsCiAgICAiLnppcCIsCn0KSU1BR0VfRVhURU5TSU9OUyA9IHsiLnBuZyIsICIuanBnIiwgIi5qcGVnIiwgIi50aWYiLCAiLnRpZmYiLCAiLmJtcCIsICIuZ2lmIiwgIi53ZWJwIn0KWklQX0VYVEVOU0lPTlMgPSB7Ii56aXAifQoKCmRlZiBjb25maWd1cmVfYnVuZGxlZF9mZm1wZWcoKSAtPiBzdHIgfCBOb25lOgogICAgd2FybmluZ3MuZmlsdGVyd2FybmluZ3MoCiAgICAgICAgImlnbm9yZSIsCiAgICAgICAgbWVzc2FnZT0iQ291bGRuJ3QgZmluZCBmZm1wZWcgb3IgYXZjb252LioiLAogICAgICAgIGNhdGVnb3J5PVJ1bnRpbWVXYXJuaW5nLAogICAgKQogICAgdHJ5OgogICAgICAgIGltcG9ydCBpbWFnZWlvX2ZmbXBlZwogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICByZXR1cm4gTm9uZQoKICAgIHRyeToKICAgICAgICBmZm1wZWdfcGF0aCA9IFBhdGgoaW1hZ2Vpb19mZm1wZWcuZ2V0X2ZmbXBlZ19leGUoKSkucmVzb2x2ZSgpCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIHJldHVybiBOb25lCgogICAgaWYgbm90IGZmbXBlZ19wYXRoLmV4aXN0cygpOgogICAgICAgIHJldHVybiBOb25lCgogICAgb3MuZW52aXJvblsiUEFUSCJdID0gZiJ7ZmZtcGVnX3BhdGgucGFyZW50fXtvcy5wYXRoc2VwfXtvcy5lbnZpcm9uLmdldCgnUEFUSCcsICcnKX0iCiAgICBvcy5lbnZpcm9uLnNldGRlZmF1bHQoIklNQUdFSU9fRkZNUEVHX0VYRSIsIHN0cihmZm1wZWdfcGF0aCkpCiAgICB0cnk6CiAgICAgICAgZnJvbSBweWR1YiBpbXBvcnQgQXVkaW9TZWdtZW50CgogICAgICAgIEF1ZGlvU2VnbWVudC5jb252ZXJ0ZXIgPSBzdHIoZmZtcGVnX3BhdGgpCiAgICAgICAgQXVkaW9TZWdtZW50LmZmbXBlZyA9IHN0cihmZm1wZWdfcGF0aCkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgcGFzcwoKICAgIHJldHVybiBzdHIoZmZtcGVnX3BhdGgpCgoKZGVmIHNhZmVfbm90ZV9uYW1lKG5hbWU6IHN0cikgLT4gc3RyOgogICAgY2xlYW5lZCA9IHJlLnN1YihyJ1tcXC86Kj8iPD58XSsnLCAiLSIsIG5hbWUpLnN0cmlwKCkKICAgIGNsZWFuZWQgPSByZS5zdWIociJccysiLCAiICIsIGNsZWFuZWQpCiAgICByZXR1cm4gY2xlYW5lZCBvciAiVW50aXRsZWQiCgoKZGVmIHVuaXF1ZV9vdXRwdXRfcGF0aChkaXJlY3Rvcnk6IFBhdGgsIHN0ZW06IHN0ciwgb3ZlcndyaXRlOiBib29sKSAtPiBQYXRoOgogICAgb3V0cHV0ID0gZGlyZWN0b3J5IC8gZiJ7c3RlbX0ubWQiCiAgICBpZiBvdmVyd3JpdGUgb3Igbm90IG91dHB1dC5leGlzdHMoKToKICAgICAgICByZXR1cm4gb3V0cHV0CiAgICBpbmRleCA9IDIKICAgIHdoaWxlIFRydWU6CiAgICAgICAgY2FuZGlkYXRlID0gZGlyZWN0b3J5IC8gZiJ7c3RlbX0te2luZGV4fS5tZCIKICAgICAgICBpZiBub3QgY2FuZGlkYXRlLmV4aXN0cygpOgogICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlCiAgICAgICAgaW5kZXggKz0gMQoKCmRlZiBhc3NlcnRfaW5zaWRlX3ZhdWx0KHBhdGg6IFBhdGgsIHZhdWx0OiBQYXRoKSAtPiBOb25lOgogICAgdHJ5OgogICAgICAgIHBhdGgucmVsYXRpdmVfdG8odmF1bHQpCiAgICBleGNlcHQgVmFsdWVFcnJvciBhcyBleGM6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcihmIk91dHB1dCBkaXJlY3RvcnkgbXVzdCBiZSBpbnNpZGUgdGhlIHZhdWx0OiB7dmF1bHR9IikgZnJvbSBleGMKCgpkZWYgaXNfdXJsKHZhbHVlOiBzdHIpIC0+IGJvb2w6CiAgICBwYXJzZWQgPSB1cmxwYXJzZSh2YWx1ZSkKICAgIHJldHVybiBwYXJzZWQuc2NoZW1lIGluIHsiaHR0cCIsICJodHRwcyJ9IGFuZCBib29sKHBhcnNlZC5uZXRsb2MpCgoKZGVmIG5vdGVfc3RlbV9mb3Jfc291cmNlKHNvdXJjZTogc3RyIHwgUGF0aCkgLT4gc3RyOgogICAgcmF3ID0gc3RyKHNvdXJjZSkKICAgIGlmIGlzX3VybChyYXcpOgogICAgICAgIHBhcnNlZCA9IHVybHBhcnNlKHJhdykKICAgICAgICB0YWlsID0gcGFyc2VkLnBhdGgucnN0cmlwKCIvIikuc3BsaXQoIi8iKVstMV0gb3IgcGFyc2VkLm5ldGxvYwogICAgICAgIHJldHVybiBzYWZlX25vdGVfbmFtZSh0YWlsKQogICAgcmV0dXJuIHNhZmVfbm90ZV9uYW1lKFBhdGgocmF3KS5zdGVtKQoKCmRlZiBmcm9udG1hdHRlcl9mb3Ioc291cmNlOiBzdHIgfCBQYXRoLCBjb252ZXJ0ZXI6IHN0cikgLT4gc3RyOgogICAgY29udmVydGVkX2F0ID0gZGF0ZXRpbWUubm93KHRpbWV6b25lLnV0YykuYXN0aW1lem9uZSgpLmlzb2Zvcm1hdCh0aW1lc3BlYz0ic2Vjb25kcyIpCiAgICBsaW5lcyA9IFsKICAgICAgICAiLS0tIiwKICAgICAgICAidGFnczoiLAogICAgICAgICIgIC0gaW1wb3J0ZWQiLAogICAgICAgICIgIC0gbWFya2l0ZG93biIsCiAgICAgICAgZiJzb3VyY2VfZmlsZToge2pzb24uZHVtcHMoc3RyKHNvdXJjZSksIGVuc3VyZV9hc2NpaT1GYWxzZSl9IiwKICAgICAgICBmImNvbnZlcnRlZF9hdDoge2pzb24uZHVtcHMoY29udmVydGVkX2F0LCBlbnN1cmVfYXNjaWk9RmFsc2UpfSIsCiAgICAgICAgZiJjb252ZXJ0ZXI6IHtqc29uLmR1bXBzKGNvbnZlcnRlciwgZW5zdXJlX2FzY2lpPUZhbHNlKX0iLAogICAgICAgICItLS0iLAogICAgICAgICIiLAogICAgXQogICAgcmV0dXJuICJcbiIuam9pbihsaW5lcykKCgpkZWYgbWFya2l0ZG93bigpIC0+IG9iamVjdDoKICAgIHdhcm5pbmdzLmZpbHRlcndhcm5pbmdzKAogICAgICAgICJpZ25vcmUiLAogICAgICAgIG1lc3NhZ2U9IkNvdWxkbid0IGZpbmQgZmZtcGVnIG9yIGF2Y29udi4qIiwKICAgICAgICBjYXRlZ29yeT1SdW50aW1lV2FybmluZywKICAgICkKICAgIGNvbmZpZ3VyZV9idW5kbGVkX2ZmbXBlZygpCiAgICBmcm9tIG1hcmtpdGRvd24gaW1wb3J0IE1hcmtJdERvd24KCiAgICB0cnk6CiAgICAgICAgcmV0dXJuIE1hcmtJdERvd24oZW5hYmxlX3BsdWdpbnM9RmFsc2UpCiAgICBleGNlcHQgVHlwZUVycm9yOgogICAgICAgIHJldHVybiBNYXJrSXREb3duKCkKCgpkZWYgY29udmVydF93aXRoX21hcmtpdGRvd24oc291cmNlOiBQYXRoIHwgc3RyKSAtPiBzdHI6CiAgICBtZCA9IG1hcmtpdGRvd24oKQogICAgaWYgaXNpbnN0YW5jZShzb3VyY2UsIHN0cikgYW5kIGlzX3VybChzb3VyY2UpOgogICAgICAgIHJlc3VsdCA9IG1kLmNvbnZlcnRfdXJsKHNvdXJjZSkKICAgIGVsc2U6CiAgICAgICAgcmVzdWx0ID0gbWQuY29udmVydChzdHIoc291cmNlKSkKICAgIHJldHVybiByZXN1bHQudGV4dF9jb250ZW50LnN0cmlwKCkKCgpkZWYgZXh0cmFjdF9sZWdhY3lfcHB0KHNvdXJjZTogUGF0aCwgdG9vbHNfZGlyOiBQYXRoIHwgTm9uZSkgLT4gc3RyIHwgTm9uZToKICAgIGlmIG5vdCB0b29sc19kaXI6CiAgICAgICAgcmV0dXJuIGV4dHJhY3RfbGVnYWN5X3BwdF90ZXh0KHNvdXJjZSkKICAgIHN5cy5wYXRoLmluc2VydCgwLCBzdHIodG9vbHNfZGlyKSkKICAgIHRyeToKICAgICAgICBmcm9tIG1hcmtpdGRvd25fdG9fb2JzaWRpYW4gaW1wb3J0IGNvbnZlcnRfZmlsZQoKICAgICAgICByZXR1cm4gY29udmVydF9maWxlKHNvdXJjZSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgcmV0dXJuIGV4dHJhY3RfbGVnYWN5X3BwdF90ZXh0KHNvdXJjZSkKICAgIGZpbmFsbHk6CiAgICAgICAgdHJ5OgogICAgICAgICAgICBzeXMucGF0aC5yZW1vdmUoc3RyKHRvb2xzX2RpcikpCiAgICAgICAgZXhjZXB0IFZhbHVlRXJyb3I6CiAgICAgICAgICAgIHBhc3MKCgpkZWYgY2xlYW5fZXh0cmFjdGVkX3RleHQodGV4dDogc3RyKSAtPiBzdHI6CiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKCJcclxuIiwgIlxuIikucmVwbGFjZSgiXHIiLCAiXG4iKS5yZXBsYWNlKCJceDBiIiwgIlxuIikKICAgIHRleHQgPSByZS5zdWIociJbXHgwMC1ceDA4XHgwY1x4MGUtXHgxZl0iLCAiIiwgdGV4dCkKICAgIHRleHQgPSByZS5zdWIociJbIFx0XStcbiIsICJcbiIsIHRleHQpCiAgICB0ZXh0ID0gcmUuc3ViKHIiXG57Myx9IiwgIlxuXG4iLCB0ZXh0KQogICAgcmV0dXJuIHRleHQuc3RyaXAoKQoKCmRlZiBsb29rc19saWtlX3NsaWRlX3RleHQodGV4dDogc3RyKSAtPiBib29sOgogICAgaWYgbGVuKHRleHQpIDwgMjoKICAgICAgICByZXR1cm4gRmFsc2UKICAgIGlmIHRleHQuc3RhcnRzd2l0aCgoIkM6XFwiLCAiX18iLCAiX19fIikpOgogICAgICAgIHJldHVybiBGYWxzZQogICAgaWYgIuWNleWHu+atpOWkhOe8lui+keavjeeJiCIgaW4gdGV4dDoKICAgICAgICByZXR1cm4gRmFsc2UKICAgIGlmIHJlLmZ1bGxtYXRjaChyIltcV19dKyIsIHRleHQpOgogICAgICAgIHJldHVybiBGYWxzZQogICAgcmV0dXJuIFRydWUKCgpkZWYgZXh0cmFjdF9sZWdhY3lfcHB0X3RleHQoc291cmNlOiBQYXRoKSAtPiBzdHIgfCBOb25lOgogICAgdHJ5OgogICAgICAgIGltcG9ydCBvbGVmaWxlCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIHJldHVybiBOb25lCgogICAgdHJ5OgogICAgICAgIHdpdGggb2xlZmlsZS5PbGVGaWxlSU8oc3RyKHNvdXJjZSkpIGFzIG9sZToKICAgICAgICAgICAgc3RyZWFtX25hbWUgPSBuZXh0KAogICAgICAgICAgICAgICAgKAogICAgICAgICAgICAgICAgICAgIGVudHJ5CiAgICAgICAgICAgICAgICAgICAgZm9yIGVudHJ5IGluIG9sZS5saXN0ZGlyKHN0cmVhbXM9VHJ1ZSwgc3RvcmFnZXM9RmFsc2UpCiAgICAgICAgICAgICAgICAgICAgaWYgZW50cnkgYW5kIGVudHJ5Wy0xXSA9PSAiUG93ZXJQb2ludCBEb2N1bWVudCIKICAgICAgICAgICAgICAgICksCiAgICAgICAgICAgICAgICBOb25lLAogICAgICAgICAgICApCiAgICAgICAgICAgIGlmIHN0cmVhbV9uYW1lIGlzIE5vbmU6CiAgICAgICAgICAgICAgICByZXR1cm4gTm9uZQogICAgICAgICAgICBkYXRhID0gb2xlLm9wZW5zdHJlYW0oc3RyZWFtX25hbWUpLnJlYWQoKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICByZXR1cm4gTm9uZQoKICAgIGNodW5rczogbGlzdFtzdHJdID0gW10KICAgIHNlZW46IHNldFtzdHJdID0gc2V0KCkKCiAgICBkZWYgYWRkX3RleHQodGV4dDogc3RyKSAtPiBOb25lOgogICAgICAgIGNsZWFuZWQgPSBjbGVhbl9leHRyYWN0ZWRfdGV4dCh0ZXh0KQogICAgICAgIGlmIG5vdCBjbGVhbmVkIG9yIG5vdCBsb29rc19saWtlX3NsaWRlX3RleHQoY2xlYW5lZCkgb3IgY2xlYW5lZCBpbiBzZWVuOgogICAgICAgICAgICByZXR1cm4KICAgICAgICBzZWVuLmFkZChjbGVhbmVkKQogICAgICAgIGNodW5rcy5hcHBlbmQoY2xlYW5lZCkKCiAgICBkZWYgd2Fsa19yZWNvcmRzKHN0YXJ0OiBpbnQsIGVuZDogaW50KSAtPiBOb25lOgogICAgICAgIHBvc2l0aW9uID0gc3RhcnQKICAgICAgICB3aGlsZSBwb3NpdGlvbiArIDggPD0gZW5kOgogICAgICAgICAgICByZWNvcmRfdmVyc2lvbiA9IGRhdGFbcG9zaXRpb25dICYgMHgwRgogICAgICAgICAgICByZWNvcmRfdHlwZSA9IGludC5mcm9tX2J5dGVzKGRhdGFbcG9zaXRpb24gKyAyIDogcG9zaXRpb24gKyA0XSwgImxpdHRsZSIpCiAgICAgICAgICAgIHJlY29yZF9sZW4gPSBpbnQuZnJvbV9ieXRlcyhkYXRhW3Bvc2l0aW9uICsgNCA6IHBvc2l0aW9uICsgOF0sICJsaXR0bGUiKQogICAgICAgICAgICBwYXlsb2FkX3N0YXJ0ID0gcG9zaXRpb24gKyA4CiAgICAgICAgICAgIHBheWxvYWRfZW5kID0gcGF5bG9hZF9zdGFydCArIHJlY29yZF9sZW4KCiAgICAgICAgICAgIGlmIHBheWxvYWRfZW5kID4gZW5kOgogICAgICAgICAgICAgICAgcmV0dXJuCgogICAgICAgICAgICBwYXlsb2FkID0gZGF0YVtwYXlsb2FkX3N0YXJ0OnBheWxvYWRfZW5kXQogICAgICAgICAgICBpZiByZWNvcmRfdHlwZSA9PSA0MDAwOgogICAgICAgICAgICAgICAgYWRkX3RleHQocGF5bG9hZC5kZWNvZGUoInV0Zi0xNmxlIiwgZXJyb3JzPSJpZ25vcmUiKSkKICAgICAgICAgICAgZWxpZiByZWNvcmRfdHlwZSA9PSA0MDA4OgogICAgICAgICAgICAgICAgYWRkX3RleHQocGF5bG9hZC5kZWNvZGUoImdiayIsIGVycm9ycz0iaWdub3JlIikpCgogICAgICAgICAgICBpZiByZWNvcmRfdmVyc2lvbiA9PSAweDBGIGFuZCByZWNvcmRfbGVuOgogICAgICAgICAgICAgICAgd2Fsa19yZWNvcmRzKHBheWxvYWRfc3RhcnQsIHBheWxvYWRfZW5kKQoKICAgICAgICAgICAgcG9zaXRpb24gPSBwYXlsb2FkX2VuZCBpZiByZWNvcmRfbGVuIGVsc2UgcG9zaXRpb24gKyA4CgogICAgd2Fsa19yZWNvcmRzKDAsIGxlbihkYXRhKSkKICAgIGlmIG5vdCBjaHVua3M6CiAgICAgICAgcmV0dXJuIE5vbmUKCiAgICBib2R5ID0gIlxuXG4tLS1cblxuIi5qb2luKGNodW5rcykKICAgIHJldHVybiAoCiAgICAgICAgIj4gTGVnYWN5IC5wcHQgZmFsbGJhY2sgZXh0cmFjdGlvbiB3YXMgdXNlZCBiZWNhdXNlIE1hcmtJdERvd24gY291bGQgbm90IGNvbnZlcnQgdGhpcyBmaWxlIGRpcmVjdGx5LlxuXG4iCiAgICAgICAgZiJ7Ym9keX0iCiAgICApCgoKZGVmIHJ1bl9tYWNvc19vY3IoaW1hZ2U6IFBhdGgsIG9jcl9zY3JpcHQ6IFBhdGgpIC0+IHN0ciB8IE5vbmU6CiAgICBpZiBub3Qgb2NyX3NjcmlwdC5leGlzdHMoKSBvciBub3Qgc2h1dGlsLndoaWNoKCJzd2lmdCIpOgogICAgICAgIHJldHVybiBOb25lCiAgICByZXN1bHQgPSBzdWJwcm9jZXNzLnJ1bigKICAgICAgICBbInN3aWZ0Iiwgc3RyKG9jcl9zY3JpcHQpLCBzdHIoaW1hZ2UpXSwKICAgICAgICBjYXB0dXJlX291dHB1dD1UcnVlLAogICAgICAgIHRleHQ9VHJ1ZSwKICAgICAgICB0aW1lb3V0PTEyMCwKICAgICAgICBjaGVjaz1GYWxzZSwKICAgICkKICAgIHRleHQgPSByZXN1bHQuc3Rkb3V0LnN0cmlwKCkKICAgIGlmIHJlc3VsdC5yZXR1cm5jb2RlID09IDAgYW5kIHRleHQ6CiAgICAgICAgcmV0dXJuIHRleHQKICAgIHJldHVybiBOb25lCgoKZGVmIHJ1bl90ZXNzZXJhY3Rfb2NyKGltYWdlOiBQYXRoKSAtPiBzdHIgfCBOb25lOgogICAgdHJ5OgogICAgICAgIGltcG9ydCBweXRlc3NlcmFjdAogICAgICAgIGZyb20gUElMIGltcG9ydCBJbWFnZQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICByZXR1cm4gTm9uZQoKICAgIHRyeToKICAgICAgICB0ZXh0ID0gcHl0ZXNzZXJhY3QuaW1hZ2VfdG9fc3RyaW5nKEltYWdlLm9wZW4oaW1hZ2UpLCBsYW5nPSJjaGlfc2ltK2NoaV90cmErZW5nIikKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgdHJ5OgogICAgICAgICAgICB0ZXh0ID0gcHl0ZXNzZXJhY3QuaW1hZ2VfdG9fc3RyaW5nKEltYWdlLm9wZW4oaW1hZ2UpKQogICAgICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgICAgIHJldHVybiBOb25lCgogICAgdGV4dCA9IHRleHQuc3RyaXAoKQogICAgcmV0dXJuIHRleHQgb3IgTm9uZQoKCmRlZiBjb252ZXJ0X2ltYWdlKHNvdXJjZTogUGF0aCwgb2NyX3NjcmlwdDogUGF0aCkgLT4gdHVwbGVbc3RyLCBzdHJdOgogICAgb2NyX3RleHQgPSBydW5fbWFjb3Nfb2NyKHNvdXJjZSwgb2NyX3NjcmlwdCkKICAgIGlmIG9jcl90ZXh0OgogICAgICAgIHJldHVybiBvY3JfdGV4dCwgIm1hY09TIFZpc2lvbiBPQ1IiCiAgICBvY3JfdGV4dCA9IHJ1bl90ZXNzZXJhY3Rfb2NyKHNvdXJjZSkKICAgIGlmIG9jcl90ZXh0OgogICAgICAgIHJldHVybiBvY3JfdGV4dCwgIlRlc3NlcmFjdCBPQ1IiCiAgICByZXR1cm4gY29udmVydF93aXRoX21hcmtpdGRvd24oc291cmNlKSwgIm1hcmtpdGRvd24iCgoKZGVmIGNvbnZlcnRfY29udGVudChzb3VyY2U6IFBhdGggfCBzdHIsIHRvb2xzX2RpcjogUGF0aCB8IE5vbmUsIG9jcl9zY3JpcHQ6IFBhdGgpIC0+IHR1cGxlW3N0ciwgc3RyXToKICAgIGlmIGlzaW5zdGFuY2Uoc291cmNlLCBzdHIpIGFuZCBpc191cmwoc291cmNlKToKICAgICAgICByZXR1cm4gY29udmVydF93aXRoX21hcmtpdGRvd24oc291cmNlKSwgIm1hcmtpdGRvd24iCgogICAgcGF0aCA9IFBhdGgoc291cmNlKQogICAgc3VmZml4ID0gcGF0aC5zdWZmaXgubG93ZXIoKQogICAgaWYgc3VmZml4ID09ICIucHB0IjoKICAgICAgICBsZWdhY3lfdGV4dCA9IGV4dHJhY3RfbGVnYWN5X3BwdChwYXRoLCB0b29sc19kaXIpCiAgICAgICAgaWYgbGVnYWN5X3RleHQ6CiAgICAgICAgICAgIHJldHVybiBsZWdhY3lfdGV4dCwgIm1hcmtpdGRvd24gKyBsZWdhY3kgcHB0IGZhbGxiYWNrIgogICAgaWYgc3VmZml4IGluIElNQUdFX0VYVEVOU0lPTlM6CiAgICAgICAgcmV0dXJuIGNvbnZlcnRfaW1hZ2UocGF0aCwgb2NyX3NjcmlwdCkKICAgIHJldHVybiBjb252ZXJ0X3dpdGhfbWFya2l0ZG93bihwYXRoKSwgIm1hcmtpdGRvd24iCgoKZGVmIHdyaXRlX25vdGUoc291cmNlOiBzdHIgfCBQYXRoLCBtYXJrZG93bjogc3RyLCBvdXRwdXRfZGlyOiBQYXRoLCBvdmVyd3JpdGU6IGJvb2wsIGNvbnZlcnRlcjogc3RyKSAtPiBQYXRoOgogICAgc3RlbSA9IG5vdGVfc3RlbV9mb3Jfc291cmNlKHNvdXJjZSkKICAgIG91dHB1dCA9IHVuaXF1ZV9vdXRwdXRfcGF0aChvdXRwdXRfZGlyLCBzdGVtLCBvdmVyd3JpdGUpCiAgICBvdXRwdXQud3JpdGVfdGV4dCgKICAgICAgICBmcm9udG1hdHRlcl9mb3Ioc291cmNlLCBjb252ZXJ0ZXIpICsgZiIjIHtzdGVtfVxuXG4iICsgbWFya2Rvd24uc3RyaXAoKSArICJcbiIsCiAgICAgICAgZW5jb2Rpbmc9InV0Zi04IiwKICAgICkKICAgIHJldHVybiBvdXRwdXQKCgpkZWYgY29udmVydF96aXAoc291cmNlOiBQYXRoLCB0b29sc19kaXI6IFBhdGggfCBOb25lLCBvY3Jfc2NyaXB0OiBQYXRoKSAtPiB0dXBsZVtzdHIsIHN0cl06CiAgICBzZWN0aW9uczogbGlzdFtzdHJdID0gW10KICAgIHdpdGggdGVtcGZpbGUuVGVtcG9yYXJ5RGlyZWN0b3J5KHByZWZpeD0ibWFya2l0ZG93bi16aXAtIikgYXMgdGVtcF9kaXI6CiAgICAgICAgdGVtcF9yb290ID0gUGF0aCh0ZW1wX2RpcikKICAgICAgICB3aXRoIHppcGZpbGUuWmlwRmlsZShzb3VyY2UpIGFzIGFyY2hpdmU6CiAgICAgICAgICAgIGFyY2hpdmUuZXh0cmFjdGFsbCh0ZW1wX3Jvb3QpCiAgICAgICAgZm9yIGNoaWxkIGluIHNvcnRlZCh0ZW1wX3Jvb3Qucmdsb2IoIioiKSk6CiAgICAgICAgICAgIGlmIG5vdCBjaGlsZC5pc19maWxlKCkgb3IgY2hpbGQuc3VmZml4Lmxvd2VyKCkgbm90IGluIFNVUFBPUlRFRF9FWFRFTlNJT05TIC0gWklQX0VYVEVOU0lPTlM6CiAgICAgICAgICAgICAgICBjb250aW51ZQogICAgICAgICAgICB0cnk6CiAgICAgICAgICAgICAgICBtYXJrZG93biwgY29udmVydGVyID0gY29udmVydF9jb250ZW50KGNoaWxkLCB0b29sc19kaXIsIG9jcl9zY3JpcHQpCiAgICAgICAgICAgICAgICByZWxhdGl2ZSA9IGNoaWxkLnJlbGF0aXZlX3RvKHRlbXBfcm9vdCkuYXNfcG9zaXgoKQogICAgICAgICAgICAgICAgc2VjdGlvbnMuYXBwZW5kKGYiIyMge3JlbGF0aXZlfVxuXG57bWFya2Rvd259XG5cbjwhLS0gY29udmVydGVyOiB7Y29udmVydGVyfSAtLT4iKQogICAgICAgICAgICBleGNlcHQgRXhjZXB0aW9uIGFzIGV4YzoKICAgICAgICAgICAgICAgIHJlbGF0aXZlID0gY2hpbGQucmVsYXRpdmVfdG8odGVtcF9yb290KS5hc19wb3NpeCgpCiAgICAgICAgICAgICAgICBzZWN0aW9ucy5hcHBlbmQoZiIjIyB7cmVsYXRpdmV9XG5cbj4gQ29udmVyc2lvbiBmYWlsZWQ6IHtleGN9IikKICAgIGlmIG5vdCBzZWN0aW9uczoKICAgICAgICByYWlzZSBSdW50aW1lRXJyb3IoIk5vIHN1cHBvcnRlZCBmaWxlcyB3ZXJlIGZvdW5kIGluc2lkZSB0aGUgWklQIGFyY2hpdmUuIikKICAgIHJldHVybiAiXG5cbi0tLVxuXG4iLmpvaW4oc2VjdGlvbnMpLCAiemlwIHJlY3Vyc2l2ZSBicmlkZ2UiCgoKZGVmIGl0ZXJfZGlyZWN0b3J5X2ZpbGVzKGRpcmVjdG9yeTogUGF0aCwgcmVjdXJzaXZlOiBib29sKSAtPiBsaXN0W1BhdGhdOgogICAgaXRlcmF0b3IgPSBkaXJlY3Rvcnkucmdsb2IoIioiKSBpZiByZWN1cnNpdmUgZWxzZSBkaXJlY3RvcnkuZ2xvYigiKiIpCiAgICByZXR1cm4gc29ydGVkKAogICAgICAgIHBhdGgKICAgICAgICBmb3IgcGF0aCBpbiBpdGVyYXRvcgogICAgICAgIGlmIHBhdGguaXNfZmlsZSgpIGFuZCBwYXRoLnN1ZmZpeC5sb3dlcigpIGluIFNVUFBPUlRFRF9FWFRFTlNJT05TCiAgICApCgoKZGVmIGNvbnZlcnRfb25lKAogICAgc291cmNlOiBzdHIsCiAgICBvdXRwdXRfZGlyOiBQYXRoLAogICAgb3ZlcndyaXRlOiBib29sLAogICAgcmVjdXJzaXZlOiBib29sLAogICAgdG9vbHNfZGlyOiBQYXRoIHwgTm9uZSwKICAgIG9jcl9zY3JpcHQ6IFBhdGgsCikgLT4gbGlzdFtkaWN0W3N0ciwgb2JqZWN0XV06CiAgICBpZiBpc191cmwoc291cmNlKToKICAgICAgICBtYXJrZG93biwgY29udmVydGVyID0gY29udmVydF9jb250ZW50KHNvdXJjZSwgdG9vbHNfZGlyLCBvY3Jfc2NyaXB0KQogICAgICAgIG91dHB1dCA9IHdyaXRlX25vdGUoc291cmNlLCBtYXJrZG93biwgb3V0cHV0X2Rpciwgb3ZlcndyaXRlLCBjb252ZXJ0ZXIpCiAgICAgICAgcmV0dXJuIFt7Im9rIjogVHJ1ZSwgInNvdXJjZSI6IHNvdXJjZSwgIm91dHB1dCI6IHN0cihvdXRwdXQpfV0KCiAgICBwYXRoID0gUGF0aChzb3VyY2UpLmV4cGFuZHVzZXIoKS5yZXNvbHZlKCkKICAgIGlmIHBhdGguaXNfZGlyKCk6CiAgICAgICAgcmVzdWx0czogbGlzdFtkaWN0W3N0ciwgb2JqZWN0XV0gPSBbXQogICAgICAgIGZpbGVzID0gaXRlcl9kaXJlY3RvcnlfZmlsZXMocGF0aCwgcmVjdXJzaXZlKQogICAgICAgIGlmIG5vdCBmaWxlczoKICAgICAgICAgICAgcmV0dXJuIFt7Im9rIjogRmFsc2UsICJzb3VyY2UiOiBzdHIocGF0aCksICJlcnJvciI6ICJObyBzdXBwb3J0ZWQgZmlsZXMgZm91bmQgaW4gdGhpcyBmb2xkZXIuIn1dCiAgICAgICAgZm9yIGNoaWxkIGluIGZpbGVzOgogICAgICAgICAgICByZXN1bHRzLmV4dGVuZChjb252ZXJ0X29uZShzdHIoY2hpbGQpLCBvdXRwdXRfZGlyLCBvdmVyd3JpdGUsIHJlY3Vyc2l2ZSwgdG9vbHNfZGlyLCBvY3Jfc2NyaXB0KSkKICAgICAgICByZXR1cm4gcmVzdWx0cwoKICAgIGlmIG5vdCBwYXRoLmlzX2ZpbGUoKToKICAgICAgICByZXR1cm4gW3sib2siOiBGYWxzZSwgInNvdXJjZSI6IHNvdXJjZSwgImVycm9yIjogIlNvdXJjZSBkb2VzIG5vdCBleGlzdC4ifV0KCiAgICBpZiBwYXRoLnN1ZmZpeC5sb3dlcigpIG5vdCBpbiBTVVBQT1JURURfRVhURU5TSU9OUzoKICAgICAgICByZXR1cm4gW3sib2siOiBGYWxzZSwgInNvdXJjZSI6IHN0cihwYXRoKSwgImVycm9yIjogZiJVbnN1cHBvcnRlZCBmaWxlIHR5cGU6IHtwYXRoLnN1ZmZpeCBvciAnbm9uZSd9In1dCgogICAgaWYgcGF0aC5zdWZmaXgubG93ZXIoKSBpbiBaSVBfRVhURU5TSU9OUzoKICAgICAgICBtYXJrZG93biwgY29udmVydGVyID0gY29udmVydF96aXAocGF0aCwgdG9vbHNfZGlyLCBvY3Jfc2NyaXB0KQogICAgZWxzZToKICAgICAgICBtYXJrZG93biwgY29udmVydGVyID0gY29udmVydF9jb250ZW50KHBhdGgsIHRvb2xzX2Rpciwgb2NyX3NjcmlwdCkKICAgIG91dHB1dCA9IHdyaXRlX25vdGUocGF0aCwgbWFya2Rvd24sIG91dHB1dF9kaXIsIG92ZXJ3cml0ZSwgY29udmVydGVyKQogICAgcmV0dXJuIFt7Im9rIjogVHJ1ZSwgInNvdXJjZSI6IHN0cihwYXRoKSwgIm91dHB1dCI6IHN0cihvdXRwdXQpfV0KCgpkZWYgcGFyc2VfYXJncygpIC0+IGFyZ3BhcnNlLk5hbWVzcGFjZToKICAgIHBhcnNlciA9IGFyZ3BhcnNlLkFyZ3VtZW50UGFyc2VyKGRlc2NyaXB0aW9uPSJFeHRlbmRlZCBNYXJrSXREb3duIGJyaWRnZSBmb3IgT2JzaWRpYW4uIikKICAgIHBhcnNlci5hZGRfYXJndW1lbnQoIi0tdmF1bHQiLCByZXF1aXJlZD1UcnVlLCB0eXBlPVBhdGgpCiAgICBwYXJzZXIuYWRkX2FyZ3VtZW50KCItLWRlc3QiLCByZXF1aXJlZD1UcnVlKQogICAgcGFyc2VyLmFkZF9hcmd1bWVudCgiLS1zb3VyY2UiLCBhY3Rpb249ImFwcGVuZCIsIGRlZmF1bHQ9W10pCiAgICBwYXJzZXIuYWRkX2FyZ3VtZW50KCItLW92ZXJ3cml0ZSIsIGFjdGlvbj0ic3RvcmVfdHJ1ZSIpCiAgICBwYXJzZXIuYWRkX2FyZ3VtZW50KCItLXJlY3Vyc2l2ZSIsIGFjdGlvbj0ic3RvcmVfdHJ1ZSIpCiAgICBwYXJzZXIuYWRkX2FyZ3VtZW50KCItLXRvb2xzLWRpciIsIHR5cGU9UGF0aCwgZGVmYXVsdD1Ob25lKQogICAgcGFyc2VyLmFkZF9hcmd1bWVudCgiLS1vY3Itc2NyaXB0IiwgdHlwZT1QYXRoLCByZXF1aXJlZD1UcnVlKQogICAgcGFyc2VyLmFkZF9hcmd1bWVudCgiLS1yZXN1bHQtZmlsZSIsIHR5cGU9UGF0aCwgZGVmYXVsdD1Ob25lKQogICAgcmV0dXJuIHBhcnNlci5wYXJzZV9hcmdzKCkKCgpkZWYgZW1pdF9yZXN1bHQocGF5bG9hZDogZGljdFtzdHIsIG9iamVjdF0sIHJlc3VsdF9maWxlOiBQYXRoIHwgTm9uZSkgLT4gTm9uZToKICAgIHRleHQgPSBqc29uLmR1bXBzKHBheWxvYWQsIGVuc3VyZV9hc2NpaT1GYWxzZSkKICAgIGlmIHJlc3VsdF9maWxlOgogICAgICAgIHJlc3VsdF9maWxlLnBhcmVudC5ta2RpcihwYXJlbnRzPVRydWUsIGV4aXN0X29rPVRydWUpCiAgICAgICAgcmVzdWx0X2ZpbGUud3JpdGVfdGV4dCh0ZXh0LCBlbmNvZGluZz0idXRmLTgiKQogICAgZWxzZToKICAgICAgICB0cnk6CiAgICAgICAgICAgIHN5cy5zdGRvdXQucmVjb25maWd1cmUoZW5jb2Rpbmc9InV0Zi04IikKICAgICAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgICAgICBwYXNzCiAgICAgICAgcHJpbnQodGV4dCkKCgpkZWYgbWFpbigpIC0+IGludDoKICAgIGFyZ3MgPSBwYXJzZV9hcmdzKCkKICAgIHZhdWx0ID0gYXJncy52YXVsdC5leHBhbmR1c2VyKCkucmVzb2x2ZSgpCiAgICBvdXRwdXRfZGlyID0gKHZhdWx0IC8gYXJncy5kZXN0KS5yZXNvbHZlKCkKICAgIHJlc3VsdHM6IGxpc3RbZGljdFtzdHIsIG9iamVjdF1dID0gW10KCiAgICB0cnk6CiAgICAgICAgYXNzZXJ0X2luc2lkZV92YXVsdChvdXRwdXRfZGlyLCB2YXVsdCkKICAgICAgICBvdXRwdXRfZGlyLm1rZGlyKHBhcmVudHM9VHJ1ZSwgZXhpc3Rfb2s9VHJ1ZSkKICAgIGV4Y2VwdCBFeGNlcHRpb24gYXMgZXhjOgogICAgICAgIGVtaXRfcmVzdWx0KHsicmVzdWx0cyI6IFt7Im9rIjogRmFsc2UsICJzb3VyY2UiOiBhcmdzLmRlc3QsICJlcnJvciI6IHN0cihleGMpfV19LCBhcmdzLnJlc3VsdF9maWxlKQogICAgICAgIHJldHVybiAxCgogICAgZm9yIHNvdXJjZSBpbiBhcmdzLnNvdXJjZToKICAgICAgICB0cnk6CiAgICAgICAgICAgIHJlc3VsdHMuZXh0ZW5kKAogICAgICAgICAgICAgICAgY29udmVydF9vbmUoCiAgICAgICAgICAgICAgICAgICAgc291cmNlLAogICAgICAgICAgICAgICAgICAgIG91dHB1dF9kaXIsCiAgICAgICAgICAgICAgICAgICAgYXJncy5vdmVyd3JpdGUsCiAgICAgICAgICAgICAgICAgICAgYXJncy5yZWN1cnNpdmUsCiAgICAgICAgICAgICAgICAgICAgYXJncy50b29sc19kaXIuZXhwYW5kdXNlcigpLnJlc29sdmUoKSBpZiBhcmdzLnRvb2xzX2RpciBlbHNlIE5vbmUsCiAgICAgICAgICAgICAgICAgICAgYXJncy5vY3Jfc2NyaXB0LmV4cGFuZHVzZXIoKS5yZXNvbHZlKCksCiAgICAgICAgICAgICAgICApCiAgICAgICAgICAgICkKICAgICAgICBleGNlcHQgRXhjZXB0aW9uIGFzIGV4YzoKICAgICAgICAgICAgcmVzdWx0cy5hcHBlbmQoeyJvayI6IEZhbHNlLCAic291cmNlIjogc291cmNlLCAiZXJyb3IiOiBzdHIoZXhjKX0pCgogICAgZW1pdF9yZXN1bHQoeyJyZXN1bHRzIjogcmVzdWx0c30sIGFyZ3MucmVzdWx0X2ZpbGUpCiAgICByZXR1cm4gMCBpZiBhbGwocmVzdWx0LmdldCgib2siKSBmb3IgcmVzdWx0IGluIHJlc3VsdHMpIGVsc2UgMQoKCmlmIF9fbmFtZV9fID09ICJfX21haW5fXyI6CiAgICByYWlzZSBTeXN0ZW1FeGl0KG1haW4oKSkK",
  "macos_ocr.swift": "aW1wb3J0IEFwcEtpdAppbXBvcnQgRm91bmRhdGlvbgppbXBvcnQgVmlzaW9uCgppZiBDb21tYW5kTGluZS5hcmd1bWVudHMuY291bnQgPCAyIHsKICAgIGZwdXRzKCJVc2FnZTogbWFjb3Nfb2NyLnN3aWZ0IC9wYXRoL3RvL2ltYWdlXG4iLCBzdGRlcnIpCiAgICBleGl0KDIpCn0KCmxldCB1cmwgPSBVUkwoZmlsZVVSTFdpdGhQYXRoOiBDb21tYW5kTGluZS5hcmd1bWVudHNbMV0pCmd1YXJkIGxldCBpbWFnZSA9IE5TSW1hZ2UoY29udGVudHNPZjogdXJsKSwKICAgICAgbGV0IGNnSW1hZ2UgPSBpbWFnZS5jZ0ltYWdlKGZvclByb3Bvc2VkUmVjdDogbmlsLCBjb250ZXh0OiBuaWwsIGhpbnRzOiBuaWwpIGVsc2UgewogICAgZnB1dHMoIkNvdWxkIG5vdCBsb2FkIGltYWdlXG4iLCBzdGRlcnIpCiAgICBleGl0KDEpCn0KCmxldCByZXF1ZXN0ID0gVk5SZWNvZ25pemVUZXh0UmVxdWVzdCgpCnJlcXVlc3QucmVjb2duaXRpb25MZXZlbCA9IC5hY2N1cmF0ZQpyZXF1ZXN0LnVzZXNMYW5ndWFnZUNvcnJlY3Rpb24gPSB0cnVlCnJlcXVlc3QucmVjb2duaXRpb25MYW5ndWFnZXMgPSBbInpoLUhhbnMiLCAiemgtSGFudCIsICJlbi1VUyJdCgpsZXQgaGFuZGxlciA9IFZOSW1hZ2VSZXF1ZXN0SGFuZGxlcihjZ0ltYWdlOiBjZ0ltYWdlLCBvcHRpb25zOiBbOl0pCmRvIHsKICAgIHRyeSBoYW5kbGVyLnBlcmZvcm0oW3JlcXVlc3RdKQogICAgbGV0IHRleHQgPSAocmVxdWVzdC5yZXN1bHRzID8/IFtdKQogICAgICAgIC5jb21wYWN0TWFwIHsgJDAudG9wQ2FuZGlkYXRlcygxKS5maXJzdD8uc3RyaW5nIH0KICAgICAgICAuam9pbmVkKHNlcGFyYXRvcjogIlxuIikKICAgIHByaW50KHRleHQpCn0gY2F0Y2ggewogICAgZnB1dHMoZXJyb3IubG9jYWxpemVkRGVzY3JpcHRpb24gKyAiXG4iLCBzdGRlcnIpCiAgICBleGl0KDEpCn0K"
};

module.exports = class MarkItDownImporterPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.ensureBundledRuntimeFiles();

    this.addRibbonIcon("upload", "MarkItDown 导入", () => {
      new MarkItDownImportModal(this).open();
    });

    this.addCommand({
      id: "open-markitdown-importer",
      name: "打开 MarkItDown 导入器",
      callback: () => new MarkItDownImportModal(this).open()
    });

    this.registerDomEvent(
      document,
      "drop",
      (event) => this.handleEditorDrop(event),
      true
    );

    this.addSettingTab(new MarkItDownImporterSettingTab(this.app, this));
  }

  getVaultPath() {
    return this.app.vault.adapter.getBasePath?.() || "";
  }

  getPluginPath() {
    return path.join(this.getVaultPath(), ".obsidian", "plugins", this.manifest.id);
  }

  getBridgeScript() {
    return path.join(this.getPluginPath(), "converter_bridge.py");
  }

  getOcrScript() {
    return path.join(this.getPluginPath(), "macos_ocr.swift");
  }

  getToolsDir() {
    return path.join(this.getVaultPath(), "tools");
  }

  getDefaultPythonPath() {
    return IS_WINDOWS
      ? path.join(this.getVaultPath(), ".venv", "Scripts", "python.exe")
      : path.join(this.getVaultPath(), ".venv", "bin", "python");
  }

  getPythonPath() {
    return this.settings.pythonPath || this.getDefaultPythonPath();
  }

  ensureBundledRuntimeFiles() {
    const pluginPath = this.getPluginPath();
    fs.mkdirSync(pluginPath, { recursive: true });

    for (const [filename, encoded] of Object.entries(BUNDLED_RUNTIME_FILES)) {
      if (!encoded) {
        continue;
      }
      const outputPath = path.join(pluginPath, filename);
      const content = Buffer.from(encoded, "base64");
      const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath) : null;
      if (!existing || !existing.equals(content)) {
        fs.writeFileSync(outputPath, content);
      }
    }
  }

  async runImport(sources, dest, options = {}) {
    const normalizedSources = Array.from(new Set(sources.filter(Boolean)));
    if (!normalizedSources.length) {
      return [];
    }
    return runBridge(this, normalizedSources, dest, options);
  }

  async handleEditorDrop(event) {
    if (!this.settings.insertLinksOnEditorDrop) {
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !event.target?.closest?.(".cm-editor")) {
      return;
    }

    const sources = getSourcesFromDataTransfer(event.dataTransfer);
    if (!sources.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const dest = normalizeDest(this.settings.defaultDest);
    new Notice(`MarkItDown 正在转换 ${sources.length} 个来源...`);

    try {
      const results = await this.runImport(sources, dest, { recursive: this.settings.recursiveFolders });
      const successes = results.filter((result) => result.ok && result.output);
      const failures = results.filter((result) => !result.ok);

      if (successes.length) {
        const links = successes.map((result) => outputToWikiLink(this, result.output));
        view.editor.replaceSelection(`${links.join("\n")}\n`);
      }

      for (const failure of failures) {
        new Notice(`转换失败：${failure.source || ""} ${failure.error || ""}`);
      }
      new Notice(`MarkItDown 完成 ${successes.length} 个转换`);
    } catch (error) {
      new Notice(`MarkItDown 导入失败：${error.message}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class MarkItDownImportModal extends Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.selectedDest = plugin.settings.defaultDest;
    this.isBusy = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl?.addClass("markitdown-importer-shell");
    contentEl.addClass("markitdown-importer-modal");

    const header = contentEl.createDiv({ cls: "markitdown-importer-header" });
    header.createEl("h2", { text: "MarkItDown 导入" });
    header.createEl("p", {
      text: "选择写入目录，拖入文件/文件夹，或粘贴网页与 YouTube 链接。"
    });
    this.installDragHandle(header);

    const controls = contentEl.createDiv({ cls: "markitdown-importer-controls" });
    const folderWrap = controls.createDiv({ cls: "markitdown-importer-field" });
    folderWrap.createEl("label", { text: "目录选项" });
    this.folderSelect = folderWrap.createEl("select");

    const destWrap = controls.createDiv({ cls: "markitdown-importer-field" });
    destWrap.createEl("label", { text: "写入目录" });
    this.destInput = destWrap.createEl("input", {
      type: "text",
      value: this.selectedDest
    });

    const refreshButton = controls.createEl("button", { text: "刷新目录" });
    refreshButton.type = "button";
    refreshButton.addEventListener("click", () => this.refreshFolders());

    const urlRow = contentEl.createDiv({ cls: "markitdown-importer-url-row" });
    this.urlInput = urlRow.createEl("textarea", {
      attr: {
        placeholder: "粘贴网页或 YouTube 链接；多个链接可换行"
      }
    });
    const convertUrlButton = urlRow.createEl("button", { text: "转换链接" });
    convertUrlButton.type = "button";
    convertUrlButton.addEventListener("click", () => this.importUrls());

    this.dropzone = contentEl.createDiv({ cls: "markitdown-importer-dropzone" });
    this.dropzone.createDiv({ cls: "markitdown-importer-drop-title", text: "拖入文件或文件夹后自动转换" });
    this.dropzone.createDiv({
      cls: "markitdown-importer-drop-copy",
      text: "支持 PDF、Office、Excel、图片 OCR、音频转录、HTML、CSV/JSON/XML、ZIP、网页和 YouTube 字幕"
    });

    const buttonRow = this.dropzone.createDiv({ cls: "markitdown-importer-button-row" });
    const chooseButton = buttonRow.createEl("button", { text: "选择文件" });
    chooseButton.type = "button";
    const chooseFolderButton = buttonRow.createEl("button", { text: "选择文件夹" });
    chooseFolderButton.type = "button";

    this.fileInput = this.dropzone.createEl("input", {
      type: "file",
      attr: {
        multiple: true,
        accept: ACCEPT_EXTENSIONS
      }
    });
    this.folderInput = this.dropzone.createEl("input", {
      type: "file",
      attr: {
        multiple: true,
        webkitdirectory: true
      }
    });

    this.statusEl = contentEl.createDiv({
      cls: "markitdown-importer-status",
      text: "等待来源"
    });
    this.resultsEl = contentEl.createDiv({ cls: "markitdown-importer-results" });

    chooseButton.addEventListener("click", () => this.fileInput.click());
    chooseFolderButton.addEventListener("click", () => this.folderInput.click());
    this.fileInput.addEventListener("change", () => {
      this.importFiles(Array.from(this.fileInput.files || []));
      this.fileInput.value = "";
    });
    this.folderInput.addEventListener("change", () => {
      this.importFiles(Array.from(this.folderInput.files || []));
      this.folderInput.value = "";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dropzone.addClass("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        this.dropzone.removeClass("is-dragging");
      });
    });

    this.dropzone.addEventListener("drop", (event) => {
      const sources = getSourcesFromDataTransfer(event.dataTransfer);
      this.importSources(sources);
    });

    this.folderSelect.addEventListener("change", () => {
      if (this.folderSelect.value === "__custom__") {
        this.destInput.focus();
        return;
      }
      this.destInput.value = this.folderSelect.value;
      this.selectedDest = this.folderSelect.value;
    });

    this.destInput.addEventListener("input", () => {
      this.selectedDest = this.destInput.value.trim();
      this.syncFolderSelect();
    });

    this.refreshFolders();
  }

  onClose() {
    this.removeDragHandle?.();
    this.modalEl?.removeClass("markitdown-importer-shell");
  }

  installDragHandle(handle) {
    const modal = this.modalEl;
    if (!modal) {
      return;
    }

    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    const moveModal = (event) => {
      if (!dragging) {
        return;
      }
      const width = modal.offsetWidth;
      const height = modal.offsetHeight;
      const maxLeft = Math.max(0, window.innerWidth - width);
      const maxTop = Math.max(0, window.innerHeight - height);
      const left = Math.min(Math.max(0, event.clientX - offsetX), maxLeft);
      const top = Math.min(Math.max(0, event.clientY - offsetY), maxTop);
      modal.style.left = `${left}px`;
      modal.style.top = `${top}px`;
    };

    const stopDrag = () => {
      dragging = false;
      document.body.classList.remove("markitdown-importer-dragging");
    };

    const startDrag = (event) => {
      if (event.button !== 0 || event.target.closest("button, input, textarea, select, a")) {
        return;
      }
      const rect = modal.getBoundingClientRect();
      modal.style.position = "fixed";
      modal.style.left = `${rect.left}px`;
      modal.style.top = `${rect.top}px`;
      modal.style.transform = "none";
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      dragging = true;
      document.body.classList.add("markitdown-importer-dragging");
      event.preventDefault();
    };

    handle.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", moveModal);
    window.addEventListener("mouseup", stopDrag);

    this.removeDragHandle = () => {
      handle.removeEventListener("mousedown", startDrag);
      window.removeEventListener("mousemove", moveModal);
      window.removeEventListener("mouseup", stopDrag);
      document.body.classList.remove("markitdown-importer-dragging");
    };
  }

  getFolders() {
    const folders = ["."];
    for (const file of this.app.vault.getAllLoadedFiles()) {
      if (file instanceof TFolder && file.path) {
        folders.push(file.path);
      }
    }
    return Array.from(new Set(folders)).sort((a, b) => {
      const depth = a.split("/").length - b.split("/").length;
      return depth || a.localeCompare(b);
    });
  }

  refreshFolders() {
    const folders = this.getFolders();
    this.folderSelect.empty();
    for (const folder of folders) {
      const option = document.createElement("option");
      option.value = folder;
      option.textContent = folder === "." ? "Vault 根目录" : folder;
      this.folderSelect.appendChild(option);
    }

    const custom = document.createElement("option");
    custom.value = "__custom__";
    custom.textContent = "自定义目录...";
    this.folderSelect.appendChild(custom);
    this.syncFolderSelect();
  }

  syncFolderSelect() {
    const value = normalizeDest(this.destInput.value || this.plugin.settings.defaultDest);
    const hasOption = Array.from(this.folderSelect.options).some((option) => option.value === value);
    this.folderSelect.value = hasOption ? value : "__custom__";
  }

  importFiles(files) {
    const sources = files.map(getPathForFile).filter(Boolean);
    if (!sources.length && files.length) {
      this.addResult("失败", "文件读取", "Obsidian 没有提供这些文件的本地路径。请重新拖入文件，或使用桌面版 Obsidian。", true);
      new Notice("没有读取到文件路径");
      return;
    }
    this.importSources(sources);
  }

  importUrls() {
    const urls = this.urlInput.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(isUrl);
    this.importSources(urls);
  }

  async importSources(sources) {
    if (this.isBusy || !sources.length) {
      return;
    }

    const dest = normalizeDest(this.destInput.value || this.plugin.settings.defaultDest);
    if (!isSafeVaultPath(dest)) {
      new Notice("写入目录不能是绝对路径，也不能包含 ..");
      return;
    }

    const unsupported = sources.filter((source) => !isSupportedSource(source));
    const supported = sources.filter(isSupportedSource);
    for (const source of unsupported) {
      this.addResult("失败", source, "不支持的来源类型。", true);
    }
    if (!supported.length) {
      this.setStatus("没有可转换的来源");
      return;
    }

    this.isBusy = true;
    this.setStatus(`正在转换 ${supported.length} 个来源...`);

    try {
      const results = await this.plugin.runImport(supported, dest, {
        recursive: this.plugin.settings.recursiveFolders,
        overwrite: this.plugin.settings.overwrite
      });
      const successes = results.filter((result) => result.ok);
      const failures = results.filter((result) => !result.ok);

      for (const result of successes) {
        this.addResult("完成", path.basename(result.output), result.output, false);
      }
      for (const result of failures) {
        this.addResult("失败", result.source || "转换请求", result.error || "未知错误", true);
      }

      this.setStatus(`已完成 ${successes.length} / ${results.length} 个来源`);
      new Notice(`MarkItDown 完成 ${successes.length} 个转换`);

      if (this.plugin.settings.revealAfterImport && successes[0]?.output) {
        await this.openImportedNote(successes[0].output);
      }
    } catch (error) {
      this.addResult("失败", "转换请求", error.message, true);
      this.setStatus("转换失败");
      new Notice("MarkItDown 导入失败");
    } finally {
      this.isBusy = false;
    }
  }

  async openImportedNote(outputPath) {
    const relativePath = outputToVaultRelativePath(this.plugin, outputPath);
    if (!relativePath) {
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(relativePath);
    if (file) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
  }

  setStatus(text) {
    this.statusEl.setText(text);
  }

  addResult(status, name, detail, isError) {
    const item = this.resultsEl.createDiv({ cls: "markitdown-importer-result" });
    item.createDiv({
      cls: `markitdown-importer-badge ${isError ? "is-error" : ""}`,
      text: status
    });
    const body = item.createDiv();
    body.createDiv({ cls: "markitdown-importer-result-name", text: name });
    body.createDiv({ cls: "markitdown-importer-result-detail", text: detail });
    this.resultsEl.prepend(item);
  }
}

class MarkItDownImporterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "MarkItDown Importer" });

    this.renderEnvironmentSection(containerEl);

    new Setting(containerEl)
      .setName("Python 路径")
      .setDesc("用于运行插件自带 converter_bridge.py 的 Python。留空时自动使用当前 vault 的 .venv。")
      .addText((text) => {
        text
          .setPlaceholder(this.plugin.getDefaultPythonPath())
          .setValue(this.plugin.settings.pythonPath)
          .onChange(async (value) => {
            this.plugin.settings.pythonPath = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("默认写入目录")
      .setDesc("相对于当前 Obsidian vault 的目录；不存在时会自动创建。")
      .addText((text) => {
        text
          .setPlaceholder("00_Inbox/Imports")
          .setValue(this.plugin.settings.defaultDest)
          .onChange(async (value) => {
            this.plugin.settings.defaultDest = normalizeDest(value || DEFAULT_SETTINGS.defaultDest);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("递归转换文件夹")
      .setDesc("拖入或选择文件夹时，递归处理所有支持的文件。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.recursiveFolders).onChange(async (value) => {
          this.plugin.settings.recursiveFolders = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("拖到编辑器时插入链接")
      .setDesc("将文件、文件夹或 URL 拖到 Markdown 编辑器中时，转换后在当前位置插入 wiki 链接。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.insertLinksOnEditorDrop).onChange(async (value) => {
          this.plugin.settings.insertLinksOnEditorDrop = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("导入后打开第一篇笔记")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.revealAfterImport).onChange(async (value) => {
          this.plugin.settings.revealAfterImport = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("覆盖同名笔记")
      .setDesc("关闭时，同名文件会自动生成 -2、-3 后缀。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.overwrite).onChange(async (value) => {
          this.plugin.settings.overwrite = value;
          await this.plugin.saveSettings();
        });
      });
  }

  renderEnvironmentSection(containerEl) {
    containerEl.createEl("h3", { text: "环境工具" });
    containerEl.createEl("p", {
      cls: "markitdown-importer-setting-note",
      text: "首次安装或复制给其他用户后，可以在这里检查并安装运行转换所需的本地环境。"
    });

    this.envStatusEl = containerEl.createDiv({
      cls: "markitdown-importer-env-status",
      text: "尚未检查环境"
    });

    new Setting(containerEl)
      .setName("检查环境")
      .setDesc("检查 Python、MarkItDown、桥接脚本、OCR 和 ffmpeg。")
      .addButton((button) => {
        button.setButtonText("检查环境").onClick(async () => {
          await this.checkEnvironment();
        });
      });

    new Setting(containerEl)
      .setName("安装/更新 Python 环境")
      .setDesc("在当前 vault 创建 .venv，并安装 markitdown[all] 及相关依赖。")
      .addButton((button) => {
        button.setButtonText("安装环境").setCta().onClick(async () => {
          await this.installPythonEnvironment(button.buttonEl);
        });
      });

    new Setting(containerEl)
      .setName("使用当前 vault 的 .venv")
      .setDesc("将 Python 路径设置为当前 vault 下的跨平台 .venv Python。")
      .addButton((button) => {
        button.setButtonText("使用 .venv").onClick(async () => {
          this.plugin.settings.pythonPath = this.plugin.getDefaultPythonPath();
          await this.plugin.saveSettings();
          new Notice("已设置为当前 vault 的 .venv Python");
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("安装 ffmpeg（可选）")
      .setDesc("音频转录常需要 ffmpeg。此按钮会安装到当前 vault 的 Python 环境中，不需要 Homebrew。")
      .addButton((button) => {
        button.setButtonText("安装 ffmpeg").onClick(async () => {
          await this.installFfmpeg(button.buttonEl);
        });
      });
  }

  setEnvironmentStatus(lines, isError = false) {
    if (!this.envStatusEl) {
      return;
    }
    this.envStatusEl.empty();
    this.envStatusEl.classList.toggle("is-error", isError);
    for (const line of lines) {
      this.envStatusEl.createDiv({ text: line });
    }
  }

  async checkEnvironment() {
    const pythonPath = this.plugin.getPythonPath();
    const lines = [
      `Platform: ${process.platform}`,
      `Vault: ${this.plugin.getVaultPath()}`,
      `Python: ${pythonPath}`
    ];

    lines.push(fs.existsSync(pythonPath) ? "Python 文件：已找到" : "Python 文件：未找到");
    lines.push(fs.existsSync(this.plugin.getBridgeScript()) ? "桥接脚本：已找到" : "桥接脚本：未找到");
    if (IS_MAC) {
      lines.push(fs.existsSync(this.plugin.getOcrScript()) ? "macOS OCR 脚本：已找到" : "macOS OCR 脚本：未找到");
      lines.push(fs.existsSync("/usr/bin/swift") ? "macOS OCR 运行时：已找到 Swift" : "macOS OCR 运行时：未找到 Swift");
    } else {
      lines.push("OCR：当前平台使用可选 Tesseract；未安装时图片会退回 MarkItDown 默认处理。");
    }

    if (fs.existsSync(pythonPath)) {
      try {
        await execFilePromise(pythonPath, ["-c", "from markitdown import MarkItDown; print('ok')"], { timeout: 30000 });
        lines.push("MarkItDown：已安装");
      } catch (error) {
          lines.push(`MarkItDown：未就绪（${error.message}）`);
      }
      if (!IS_MAC) {
        try {
          await execFilePromise(pythonPath, ["-c", "import pytesseract; print('ok')"], { timeout: 30000 });
          lines.push("pytesseract：已安装（仍需系统 Tesseract 可执行文件）");
        } catch (error) {
          lines.push("pytesseract：未安装（仅影响图片 OCR）");
        }
      }
    }

    try {
      await execFilePromise("ffmpeg", ["-version"], { timeout: 10000 });
      lines.push("ffmpeg：已安装");
    } catch (error) {
      if (fs.existsSync(pythonPath)) {
        try {
          const result = await execFilePromise(
            pythonPath,
            ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
            { timeout: 30000 }
          );
          lines.push(`ffmpeg：已安装在 Python 环境中（${result.stdout}）`);
        } catch (ffmpegError) {
          lines.push("ffmpeg：未找到（仅影响部分音频格式）");
        }
      } else {
        lines.push("ffmpeg：未找到（仅影响部分音频格式）");
      }
    }

    this.setEnvironmentStatus(lines);
    new Notice("环境检查完成");
  }

  async installPythonEnvironment(buttonEl) {
    const previousText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = "安装中...";

    const vaultPath = this.plugin.getVaultPath();
    const venvDir = path.join(vaultPath, ".venv");
    const venvPython = this.plugin.getDefaultPythonPath();

    this.setEnvironmentStatus(["正在创建 .venv...", `位置：${venvDir}`]);
    try {
      const installerPython = await this.findPythonForVenv();
      if (!installerPython) {
        throw new Error("未找到 Python 3.10 或更新版本。请先安装 Python 3.10+，然后再次点击安装。Windows 用户可安装 Python.org 版本并勾选 Add python.exe to PATH。");
      }
      this.setEnvironmentStatus([
        "正在创建 .venv...",
        `使用 Python: ${installerPython.label}`,
        `位置：${venvDir}`
      ]);
      await execFilePromise(installerPython.command, [...installerPython.args, "-m", "venv", venvDir], { timeout: 120000 });
      this.setEnvironmentStatus(["正在升级 pip..."]);
      await execFilePromise(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { timeout: 180000 });
      this.setEnvironmentStatus(["正在安装 MarkItDown 依赖...", "这一步可能需要几分钟。"]);
      await execFilePromise(venvPython, ["-m", "pip", "install", "markitdown[all]"], {
        timeout: 20 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 20
      });
      this.setEnvironmentStatus(["正在安装音频转换工具 imageio-ffmpeg..."]);
      await execFilePromise(venvPython, ["-m", "pip", "install", "imageio-ffmpeg"], {
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 20
      });
      if (!IS_MAC) {
        this.setEnvironmentStatus(["正在安装可选图片 OCR Python 包 pytesseract..."]);
        await execFilePromise(venvPython, ["-m", "pip", "install", "pytesseract"], {
          timeout: 10 * 60 * 1000,
          maxBuffer: 1024 * 1024 * 20
        });
      }

      this.plugin.settings.pythonPath = venvPython;
      await this.plugin.saveSettings();
      this.setEnvironmentStatus([
        "安装完成",
        `Python: ${venvPython}`,
        "MarkItDown：已安装",
        "ffmpeg：已安装在 Python 环境中",
        IS_MAC ? "OCR：macOS Vision 可用时自动启用" : "OCR：已安装 pytesseract；如需 OCR 还需系统安装 Tesseract"
      ]);
      new Notice("MarkItDown 环境安装完成");
      this.display();
    } catch (error) {
      this.setEnvironmentStatus(["安装失败", error.message], true);
      new Notice("环境安装失败，请查看设置页状态");
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = previousText;
    }
  }

  async findPythonForVenv() {
    const configured = this.plugin.settings.pythonPath
      ? [{ command: this.plugin.settings.pythonPath, args: [], label: this.plugin.settings.pythonPath }]
      : [];
    const windowsCandidates = [
      { command: "py", args: ["-3.13"], label: "py -3.13" },
      { command: "py", args: ["-3.12"], label: "py -3.12" },
      { command: "py", args: ["-3.11"], label: "py -3.11" },
      { command: "py", args: ["-3.10"], label: "py -3.10" },
      { command: "python", args: [], label: "python" },
      { command: "python3", args: [], label: "python3" }
    ];
    const unixCandidates = [
      this.plugin.settings.pythonPath ? { command: this.plugin.settings.pythonPath, args: [], label: this.plugin.settings.pythonPath } : null,
      { command: "/opt/homebrew/bin/python3.13", args: [], label: "/opt/homebrew/bin/python3.13" },
      { command: "/opt/homebrew/bin/python3.12", args: [], label: "/opt/homebrew/bin/python3.12" },
      { command: "/opt/homebrew/bin/python3.11", args: [], label: "/opt/homebrew/bin/python3.11" },
      { command: "/opt/homebrew/bin/python3.10", args: [], label: "/opt/homebrew/bin/python3.10" },
      { command: "/usr/local/bin/python3.13", args: [], label: "/usr/local/bin/python3.13" },
      { command: "/usr/local/bin/python3.12", args: [], label: "/usr/local/bin/python3.12" },
      { command: "/usr/local/bin/python3.11", args: [], label: "/usr/local/bin/python3.11" },
      { command: "/usr/local/bin/python3.10", args: [], label: "/usr/local/bin/python3.10" },
      { command: "python3.13", args: [], label: "python3.13" },
      { command: "python3.12", args: [], label: "python3.12" },
      { command: "python3.11", args: [], label: "python3.11" },
      { command: "python3.10", args: [], label: "python3.10" },
      { command: "python3", args: [], label: "python3" },
      { command: "/usr/bin/python3", args: [], label: "/usr/bin/python3" }
    ].filter(Boolean);
    const candidates = [...configured, ...(IS_WINDOWS ? windowsCandidates : unixCandidates)];

    for (const candidate of candidates) {
      try {
        const result = await execFilePromise(
          candidate.command,
          [...candidate.args, "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
          { timeout: 10000 }
        );
        const [major, minor] = result.stdout.split(".").map((part) => Number(part));
        if (major > 3 || (major === 3 && minor >= 10)) {
          return candidate;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  async installFfmpeg(buttonEl) {
    const previousText = buttonEl.textContent;
    buttonEl.disabled = true;
    buttonEl.textContent = "安装中...";

    const pythonPath = this.plugin.getPythonPath();
    try {
      if (!fs.existsSync(pythonPath)) {
        throw new Error("Python 环境不存在。请先点击“安装环境”，或设置正确的 Python 路径。");
      }
      this.setEnvironmentStatus(["正在安装 Python 内置 ffmpeg 工具...", "将安装 imageio-ffmpeg，不需要 Homebrew。"]);
      await execFilePromise(pythonPath, ["-m", "pip", "install", "--upgrade", "imageio-ffmpeg"], {
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 20
      });
      const result = await execFilePromise(
        pythonPath,
        ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
        { timeout: 30000 }
      );
      this.setEnvironmentStatus(["ffmpeg 安装完成", `位置：${result.stdout}`]);
      new Notice("ffmpeg 安装完成");
    } catch (error) {
      this.setEnvironmentStatus(["ffmpeg 安装失败", error.message], true);
      new Notice("ffmpeg 安装失败");
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = previousText;
    }
  }
}

function execFilePromise(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      const cleanStdout = String(stdout || "").trim();
      const cleanStderr = String(stderr || "").trim();
      if (error) {
        reject(new Error(cleanStderr || error.message));
        return;
      }
      resolve({ stdout: cleanStdout, stderr: cleanStderr });
    });
  });
}

function runBridge(plugin, sources, dest, options) {
  return new Promise((resolve, reject) => {
    const pythonPath = plugin.getPythonPath();
    const bridgeScript = plugin.getBridgeScript();
    const resultFile = path.join(
      os.tmpdir(),
      `markitdown-importer-result-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
    );

    if (!pythonPath || !fs.existsSync(pythonPath)) {
      reject(new Error(`Python 不存在：${pythonPath}`));
      return;
    }
    if (!fs.existsSync(bridgeScript)) {
      reject(new Error(`桥接脚本不存在：${bridgeScript}`));
      return;
    }

    const args = [
      bridgeScript,
      "--vault",
      plugin.getVaultPath(),
      "--dest",
      dest,
      "--tools-dir",
      plugin.getToolsDir(),
      "--ocr-script",
      plugin.getOcrScript(),
      "--result-file",
      resultFile
    ];
    if (options.recursive) args.push("--recursive");
    if (options.overwrite) args.push("--overwrite");
    for (const source of sources) {
      args.push("--source", source);
    }

    execFile(pythonPath, args, { timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      const cleanStdout = stdout.trim();
      const cleanStderr = stderr.trim();
      let payload = null;
      try {
        if (fs.existsSync(resultFile)) {
          payload = JSON.parse(fs.readFileSync(resultFile, "utf8"));
        } else {
          payload = cleanStdout ? JSON.parse(cleanStdout) : null;
        }
      } catch (parseError) {
        reject(new Error(cleanStderr || cleanStdout || parseError.message));
        return;
      } finally {
        try {
          fs.unlinkSync(resultFile);
        } catch (unlinkError) {
          // Ignore cleanup failures for temp result files.
        }
      }

      if (payload?.results) {
        resolve(payload.results);
        return;
      }
      if (error) {
        reject(new Error(cleanStderr || error.message));
        return;
      }
      resolve([]);
    });
  });
}

function getSourcesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) {
    return [];
  }
  const sources = [];
  for (const item of Array.from(dataTransfer.items || [])) {
    if (item.kind === "file") {
      const file = item.getAsFile?.();
      const filePath = getPathForFile(file);
      if (filePath) {
        sources.push(filePath);
      }
    }
  }
  for (const file of Array.from(dataTransfer.files || [])) {
    const filePath = getPathForFile(file);
    if (filePath) {
      sources.push(filePath);
    }
  }
  const text = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain") || "";
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (isUrl(trimmed)) {
      sources.push(trimmed);
    } else if (/^file:\/\//i.test(trimmed)) {
      sources.push(decodeFileUrl(trimmed));
    }
  }
  return Array.from(new Set(sources));
}

function getPathForFile(file) {
  if (!file) {
    return "";
  }
  if (file.path) {
    return file.path;
  }
  try {
    return electronWebUtils?.getPathForFile?.(file) || "";
  } catch (error) {
    return "";
  }
}

function decodeFileUrl(value) {
  try {
    return fileURLToPath(value);
  } catch (error) {
    return value;
  }
}

function isSupportedSource(source) {
  if (isUrl(source)) {
    return true;
  }
  try {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return SUPPORTED_EXTENSIONS.has(path.extname(source).toLowerCase());
}

function normalizeDest(value) {
  const cleaned = String(value || DEFAULT_SETTINGS.defaultDest)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
  return cleaned || DEFAULT_SETTINGS.defaultDest;
}

function isSafeVaultPath(value) {
  if (path.isAbsolute(value)) {
    return false;
  }
  return !value.split("/").some((part) => part === "..");
}

function isUrl(value) {
  return /^https?:\/\/\S+/i.test(String(value || "").trim());
}

function outputToVaultRelativePath(plugin, outputPath) {
  const vaultPath = plugin.getVaultPath();
  if (!vaultPath || !outputPath) {
    return "";
  }
  return path.relative(vaultPath, outputPath).split(path.sep).join("/");
}

function outputToWikiLink(plugin, outputPath) {
  const relativePath = outputToVaultRelativePath(plugin, outputPath);
  if (!relativePath) {
    return "";
  }
  const withoutExt = relativePath.replace(/\.md$/i, "");
  const basename = path.basename(withoutExt);
  return `[[${withoutExt}|${basename}]]`;
}
