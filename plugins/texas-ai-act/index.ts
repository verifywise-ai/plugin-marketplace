/**
 * Texas Responsible AI Governance Act (TRAIGA) Plugin
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "texas-ai-act",
  name: "Texas Responsible AI Governance Act (TRAIGA)",
  description: "Texas Responsible AI Governance Act compliance framework for organizations deploying high-risk AI systems in Texas.",
  version: "1.0.0",
  author: "VerifyWise",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
