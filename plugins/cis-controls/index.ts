/**
 * CIS Controls v8 Framework Plugin
 *
 * Provides CIS (Center for Internet Security) Controls v8 compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "cis-controls",
  name: "CIS Controls v8",
  description: "CIS Critical Security Controls v8 for cyber defense best practices",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
