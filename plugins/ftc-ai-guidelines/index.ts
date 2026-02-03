/**
 * FTC AI Guidelines Plugin
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "ftc-ai-guidelines",
  name: "FTC AI Guidelines",
  description: "US Federal Trade Commission guidelines for responsible AI use, covering truth in advertising, fairness, transparency, and consumer protection.",
  version: "1.0.0",
  author: "VerifyWise",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
