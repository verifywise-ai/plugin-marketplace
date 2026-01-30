/**
 * ISO 27001 Starter Framework Plugin
 *
 * Provides ISO 27001 information security management system starter framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "iso27001",
  name: "ISO 27001 Starter",
  description: "ISO 27001 starter framework for information security management systems",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
