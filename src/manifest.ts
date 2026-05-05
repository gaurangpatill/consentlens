import type { ManifestV3Export } from "./shared/manifestTypes";

export const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "ConsentLens",
  short_name: "ConsentLens",
  version: "0.1.0",
  description:
    "A free browser extension that catches hidden consent before you click submit.",
  action: {
    default_popup: "popup.html",
    default_title: "ConsentLens"
  },
  options_page: "options.html",
  permissions: ["storage", "activeTab", "tabs", "webNavigation"],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
      run_at: "document_idle",
      all_frames: true,
      match_about_blank: true
    }
  ]
};
