/**
 * CCPA Compliance Framework Plugin
 *
 * Provides CCPA (California Consumer Privacy Act) compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "ccpa",
  name: "CCPA Compliance",
  description: "California Consumer Privacy Act compliance framework for consumer data privacy",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
