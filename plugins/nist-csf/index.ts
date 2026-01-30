/**
 * NIST Cybersecurity Framework Plugin
 *
 * Provides NIST CSF (Cybersecurity Framework) compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "nist-csf",
  name: "NIST Cybersecurity Framework",
  description: "NIST Cybersecurity Framework for managing and reducing cybersecurity risk",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
