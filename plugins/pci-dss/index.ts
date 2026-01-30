/**
 * PCI-DSS Framework Plugin
 *
 * Provides PCI-DSS (Payment Card Industry Data Security Standard) compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "pci-dss",
  name: "PCI-DSS",
  description: "Payment Card Industry Data Security Standard compliance framework",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
