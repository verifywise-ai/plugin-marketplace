/**
 * OECD AI Principles Plugin
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "oecd-ai-principles",
  name: "OECD AI Principles",
  description: "OECD Principles on Artificial Intelligence for responsible stewardship of trustworthy AI that respects human rights and democratic values.",
  version: "1.0.0",
  author: "VerifyWise",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
