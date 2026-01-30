/**
 * SOC 2 Type II Framework Plugin
 *
 * Provides SOC 2 Type II compliance framework with Trust Service Criteria.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "soc2",
  name: "SOC 2 Type II",
  description: "SOC 2 Type II compliance framework based on Trust Service Criteria (TSC)",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
