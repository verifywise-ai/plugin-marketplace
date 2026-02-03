/**
 * ALTAI - Assessment List for Trustworthy AI Plugin
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "altai",
  name: "ALTAI - Assessment List for Trustworthy AI",
  description: "EU Commission's Assessment List for Trustworthy Artificial Intelligence based on the Ethics Guidelines for Trustworthy AI.",
  version: "1.0.0",
  author: "VerifyWise",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
