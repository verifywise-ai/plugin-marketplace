/**
 * DORA Compliance Framework Plugin
 *
 * Provides DORA (Digital Operational Resilience Act) compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "dora",
  name: "DORA Compliance",
  description: "Digital Operational Resilience Act compliance framework for financial services",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
