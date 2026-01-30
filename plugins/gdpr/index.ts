/**
 * GDPR Compliance Framework Plugin
 *
 * Provides GDPR (General Data Protection Regulation) compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "gdpr",
  name: "GDPR Compliance",
  description: "General Data Protection Regulation (GDPR) compliance framework for EU data protection",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
