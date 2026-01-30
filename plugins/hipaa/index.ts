/**
 * HIPAA Security Rule Framework Plugin
 *
 * Provides HIPAA (Health Insurance Portability and Accountability Act) Security Rule compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "hipaa",
  name: "HIPAA Security Rule",
  description: "HIPAA Security Rule compliance framework for healthcare data protection",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
