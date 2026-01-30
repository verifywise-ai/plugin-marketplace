/**
 * AI Ethics & Governance Framework Plugin
 *
 * Provides AI Ethics and Governance compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "ai-ethics",
  name: "AI Ethics & Governance",
  description: "AI Ethics and Governance framework for responsible AI development and deployment",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
