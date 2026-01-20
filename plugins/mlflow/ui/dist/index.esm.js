import { jsxs as n, jsx as e } from "react/jsx-runtime";
import { forwardRef as H, createElement as F, useState as C, useMemo as D, useEffect as X, useCallback as R } from "react";
import { Box as s, CircularProgress as Z, Typography as a, Alert as G, Button as P, Card as k, CardContent as S, TableContainer as J, Table as K, TableHead as Q, TableRow as I, TableCell as b, TableBody as Y, Chip as A, Tooltip as ee, IconButton as j, TableFooter as te, TablePagination as ne, Grid as w, Stack as re, FormControl as ae, Select as oe, MenuItem as ie, FormControlLabel as le, Checkbox as se, TextField as ce } from "@mui/material";
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var de = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const he = (x) => x.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().trim(), M = (x, y) => {
  const u = H(
    ({ color: v = "currentColor", size: d = 24, strokeWidth: i = 2, absoluteStrokeWidth: f, className: h = "", children: g, ...m }, r) => F(
      "svg",
      {
        ref: r,
        ...de,
        width: d,
        height: d,
        stroke: v,
        strokeWidth: f ? Number(i) * 24 / Number(d) : i,
        className: ["lucide", `lucide-${he(x)}`, h].join(" "),
        ...m
      },
      [
        ...y.map(([c, p]) => F(c, p)),
        ...Array.isArray(g) ? g : [g]
      ]
    )
  );
  return u.displayName = `${x}`, u;
};
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pe = M("ChevronsUpDown", [
  ["path", { d: "m7 15 5 5 5-5", key: "1hf1tw" }],
  ["path", { d: "m7 9 5-5 5 5", key: "sgt6xg" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ge = M("Eye", [
  ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z", key: "rwhkz3" }],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xe = M("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ue = M("XCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
]), fe = (x) => /* @__PURE__ */ e(pe, { size: 16, ...x }), ve = ({ apiServices: x }) => {
  const [y, u] = C(!1), [v, d] = C(null), [i, f] = C(null), [h, g] = C([]), [m, r] = C(0), [c, p] = C(10), T = x || {
    get: async (t) => ({ data: await (await fetch(`/api${t}`)).json() }),
    post: async (t, o) => ({ data: await (await fetch(`/api${t}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o)
    })).json() })
  }, z = D(() => {
    const t = h.reduce(
      (l, q) => {
        const _ = (q.lifecycle_stage || "").toLowerCase();
        return _ === "production" ? l.active += 1 : _ === "staging" ? l.staging += 1 : _ === "archived" && (l.archived += 1), l;
      },
      { active: 0, staging: 0, archived: 0 }
    ), o = new Set(
      h.map((l) => l.experiment_id).filter(Boolean)
    ).size;
    return {
      total: h.length,
      active: t.active,
      staging: t.staging,
      archived: t.archived,
      experiments: o
    };
  }, [h]), L = (t) => new Date(t).toLocaleDateString(), W = async () => {
    var t;
    u(!0), d(null);
    try {
      const o = await T.get("/plugins/mlflow/models");
      if ((t = o.data) != null && t.data) {
        const l = o.data.data;
        "models" in l && Array.isArray(l.models) ? (l.configured ? l.connected === !1 ? d(l.message || "MLFlow server is not reachable.") : l.error && d(l.error) : d("Configure the MLFlow plugin to start syncing live data."), g(l.models)) : g([]);
      } else
        g([]);
    } catch {
      d("Unable to reach the MLFlow backend."), g([]);
    } finally {
      u(!1);
    }
  };
  X(() => {
    W();
  }, []);
  const E = async () => {
    var t, o;
    u(!0), d(null);
    try {
      await T.post("/plugins/mlflow/sync"), await W();
    } catch (l) {
      console.error("Error syncing MLflow data:", l), await W(), (o = (t = l.response) == null ? void 0 : t.data) != null && o.message ? d(`Sync failed: ${l.response.data.message}`) : d("Failed to sync with MLflow server. Showing cached data.");
    }
  }, B = (t) => {
    f(t);
  }, $ = () => {
    f(null);
  }, N = R((t, o) => {
    r(o);
  }, []), O = R((t) => {
    p(parseInt(t.target.value, 10)), r(0);
  }, []), U = D(() => {
    if (!h.length)
      return "0 - 0";
    const t = m * c + 1, o = Math.min(m * c + c, h.length);
    return `${t} - ${o}`;
  }, [m, c, h.length]), V = h.slice(m * c, m * c + c);
  return y ? /* @__PURE__ */ n(s, { sx: { display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }, children: [
    /* @__PURE__ */ e(Z, {}),
    /* @__PURE__ */ e(a, { variant: "body2", sx: { ml: 2 }, children: "Loading MLFlow data..." })
  ] }) : /* @__PURE__ */ n(s, { sx: { p: 3, maxWidth: "100%", overflowX: "hidden" }, children: [
    v && /* @__PURE__ */ e(G, { severity: "warning", sx: { mb: 3 }, children: v }),
    /* @__PURE__ */ e(s, { sx: { mb: 2, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, width: "100%" }, children: /* @__PURE__ */ e(
      P,
      {
        variant: "outlined",
        startIcon: /* @__PURE__ */ e(xe, { size: 16 }),
        onClick: E,
        disabled: y,
        children: "Sync"
      }
    ) }),
    /* @__PURE__ */ n(s, { sx: { display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ e(k, { sx: { flex: "1 1 200px", minWidth: 150 }, children: /* @__PURE__ */ n(S, { children: [
        /* @__PURE__ */ e(a, { variant: "body2", color: "text.secondary", children: "Models" }),
        /* @__PURE__ */ e(a, { variant: "h4", fontWeight: 600, children: z.total })
      ] }) }),
      /* @__PURE__ */ e(k, { sx: { flex: "1 1 200px", minWidth: 150 }, children: /* @__PURE__ */ n(S, { children: [
        /* @__PURE__ */ e(a, { variant: "body2", color: "text.secondary", children: "Active" }),
        /* @__PURE__ */ e(a, { variant: "h4", fontWeight: 600, children: z.active })
      ] }) }),
      /* @__PURE__ */ e(k, { sx: { flex: "1 1 200px", minWidth: 150 }, children: /* @__PURE__ */ n(S, { children: [
        /* @__PURE__ */ e(a, { variant: "body2", color: "text.secondary", children: "Staging" }),
        /* @__PURE__ */ e(a, { variant: "h4", fontWeight: 600, children: z.staging })
      ] }) }),
      /* @__PURE__ */ e(k, { sx: { flex: "1 1 200px", minWidth: 150 }, children: /* @__PURE__ */ n(S, { children: [
        /* @__PURE__ */ e(a, { variant: "body2", color: "text.secondary", children: "Experiments" }),
        /* @__PURE__ */ e(a, { variant: "h4", fontWeight: 600, children: z.experiments })
      ] }) })
    ] }),
    /* @__PURE__ */ e(s, { sx: { mt: 4, mb: 2 }, children: h.length === 0 && !y ? /* @__PURE__ */ e(s, { sx: { textAlign: "center", py: 4, color: "text.secondary" }, children: /* @__PURE__ */ e(a, { children: "No MLFlow runs have been synced yet. Configure the integration and click Sync to pull the latest models." }) }) : /* @__PURE__ */ e(J, { sx: { border: "1px solid #d0d5dd", borderRadius: "8px" }, children: /* @__PURE__ */ n(K, { sx: { minWidth: 800 }, children: [
      /* @__PURE__ */ e(Q, { sx: { backgroundColor: "#f9fafb" }, children: /* @__PURE__ */ e(I, { children: ["Model Name", "Version", "Status", "Created", "Last Updated", "Description", "Actions"].map((t) => /* @__PURE__ */ e(
        b,
        {
          sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" },
          children: t
        },
        t
      )) }) }),
      /* @__PURE__ */ e(Y, { children: V.map((t) => /* @__PURE__ */ n(
        I,
        {
          sx: { "&:hover": { backgroundColor: "#f9fafb" }, cursor: "pointer" },
          onClick: () => B(t),
          children: [
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px" }, children: t.model_name }),
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px" }, children: t.version }),
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px" }, children: /* @__PURE__ */ e(
              A,
              {
                label: t.lifecycle_stage,
                size: "small",
                sx: {
                  borderRadius: "4px",
                  fontSize: "11px",
                  backgroundColor: t.lifecycle_stage.toLowerCase() === "production" ? "rgba(34, 197, 94, 0.1)" : t.lifecycle_stage.toLowerCase() === "staging" ? "rgba(234, 179, 8, 0.1)" : "rgba(107, 114, 128, 0.1)",
                  color: t.lifecycle_stage.toLowerCase() === "production" ? "#16a34a" : t.lifecycle_stage.toLowerCase() === "staging" ? "#ca8a04" : "#4b5563"
                }
              }
            ) }),
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px" }, children: L(t.creation_timestamp) }),
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px" }, children: L(t.last_updated_timestamp) }),
            /* @__PURE__ */ e(b, { sx: { fontSize: "13px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }, children: t.description || "No description" }),
            /* @__PURE__ */ e(b, { children: /* @__PURE__ */ e(s, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: /* @__PURE__ */ e(ee, { title: "View details", children: /* @__PURE__ */ e(j, { size: "small", sx: { mr: 1 }, children: /* @__PURE__ */ e(ge, { size: 16 }) }) }) }) })
          ]
        },
        t.id
      )) }),
      h.length > 0 && /* @__PURE__ */ e(te, { children: /* @__PURE__ */ n(I, { children: [
        /* @__PURE__ */ n(b, { sx: { fontSize: "13px", color: "#667085" }, children: [
          "Showing ",
          U,
          " of ",
          h.length,
          " model(s)"
        ] }),
        /* @__PURE__ */ e(
          ne,
          {
            count: h.length,
            page: m,
            onPageChange: N,
            rowsPerPage: c,
            rowsPerPageOptions: [5, 10, 15, 25],
            onRowsPerPageChange: O,
            labelRowsPerPage: "Rows per page",
            labelDisplayedRows: ({ page: t, count: o }) => `Page ${t + 1} of ${Math.max(1, Math.ceil(o / c))}`,
            slotProps: {
              select: {
                IconComponent: fe
              }
            },
            sx: { fontSize: "13px" }
          }
        )
      ] }) })
    ] }) }) }),
    i && /* @__PURE__ */ e(
      s,
      {
        sx: {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        },
        children: /* @__PURE__ */ e(k, { sx: { maxWidth: 600, width: "90%", maxHeight: "80vh", overflow: "auto" }, children: /* @__PURE__ */ n(S, { children: [
          /* @__PURE__ */ n(s, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
            /* @__PURE__ */ e(a, { variant: "h6", sx: { fontWeight: 600, fontSize: "15px" }, children: i.model_name }),
            /* @__PURE__ */ e(j, { onClick: $, children: /* @__PURE__ */ e(ue, { size: 20 }) })
          ] }),
          /* @__PURE__ */ n(w, { container: !0, spacing: 2, children: [
            /* @__PURE__ */ n(w, { item: !0, xs: 12, sm: 6, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Basic Information" }),
              /* @__PURE__ */ n(s, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: [
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Version:" }),
                  " ",
                  i.version
                ] }),
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Status:" }),
                  " ",
                  i.status || i.lifecycle_stage
                ] }),
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Run ID:" }),
                  " ",
                  i.run_id
                ] }),
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Created:" }),
                  " ",
                  L(i.creation_timestamp)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ n(w, { item: !0, xs: 12, sm: 6, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Description" }),
              /* @__PURE__ */ e(a, { variant: "body2", children: i.description || "No description available" })
            ] }),
            /* @__PURE__ */ n(w, { item: !0, xs: 12, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Tags" }),
              /* @__PURE__ */ e(s, { sx: { display: "flex", flexWrap: "wrap", gap: 1 }, children: Object.entries(i.tags || {}).map(([t, o]) => /* @__PURE__ */ e(
                A,
                {
                  label: `${t}: ${o}`,
                  size: "small",
                  sx: {
                    backgroundColor: "#E0EAFF",
                    color: "#0F172A",
                    borderRadius: "4px"
                  }
                },
                t
              )) })
            ] }),
            /* @__PURE__ */ n(w, { item: !0, xs: 12, sm: 6, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Metrics" }),
              /* @__PURE__ */ e(s, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: Object.entries(i.metrics || {}).map(([t, o]) => /* @__PURE__ */ n(a, { variant: "body2", children: [
                /* @__PURE__ */ n("strong", { children: [
                  t,
                  ":"
                ] }),
                " ",
                typeof o == "number" ? o.toFixed(4) : o
              ] }, t)) })
            ] }),
            /* @__PURE__ */ n(w, { item: !0, xs: 12, sm: 6, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Parameters" }),
              /* @__PURE__ */ e(s, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: Object.entries(i.parameters || {}).map(([t, o]) => /* @__PURE__ */ n(a, { variant: "body2", children: [
                /* @__PURE__ */ n("strong", { children: [
                  t,
                  ":"
                ] }),
                " ",
                String(o)
              ] }, t)) })
            ] }),
            /* @__PURE__ */ n(w, { item: !0, xs: 12, children: [
              /* @__PURE__ */ e(a, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1 }, children: "Experiment Information" }),
              /* @__PURE__ */ n(s, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: [
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Experiment ID:" }),
                  " ",
                  i.experiment_id
                ] }),
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Experiment Name:" }),
                  " ",
                  i.experiment_name
                ] }),
                /* @__PURE__ */ n(a, { variant: "body2", children: [
                  /* @__PURE__ */ e("strong", { children: "Artifact Location:" }),
                  " ",
                  i.artifact_location
                ] })
              ] })
            ] })
          ] })
        ] }) })
      }
    )
  ] });
}, we = ({
  configData: x = {},
  onConfigChange: y,
  onSaveConfiguration: u,
  onTestConnection: v,
  isSavingConfig: d = !1,
  isTestingConnection: i = !1
}) => {
  const [f, h] = C({
    auth_method: "none",
    verify_ssl: "true",
    timeout: "30",
    ...x
  }), g = (r, c) => {
    h((p) => ({ ...p, [r]: c })), y && y(r, c);
  };
  return /* @__PURE__ */ n(s, { children: [
    /* @__PURE__ */ e(a, { variant: "body2", color: "text.secondary", fontSize: 13, sx: { mb: 3 }, children: "Configure your MLFlow tracking server connection settings." }),
    /* @__PURE__ */ e(re, { spacing: 2.5, children: [
      {
        key: "tracking_server_url",
        label: "Tracking Server URL",
        placeholder: "http://localhost:5000",
        type: "url"
      },
      {
        key: "auth_method",
        label: "Authentication Method",
        placeholder: "none",
        type: "select",
        options: [
          { value: "none", label: "None" },
          { value: "basic", label: "Basic Auth" },
          { value: "token", label: "Token" }
        ]
      },
      {
        key: "username",
        label: "Username",
        placeholder: "Enter username",
        type: "text",
        showIf: (r) => r.auth_method === "basic"
      },
      {
        key: "password",
        label: "Password",
        placeholder: "Enter password",
        type: "password",
        showIf: (r) => r.auth_method === "basic"
      },
      {
        key: "api_token",
        label: "API Token",
        placeholder: "Enter API token",
        type: "password",
        showIf: (r) => r.auth_method === "token"
      },
      {
        key: "verify_ssl",
        label: "Verify SSL",
        placeholder: "true",
        type: "checkbox"
      },
      {
        key: "timeout",
        label: "Request Timeout (seconds)",
        placeholder: "30",
        type: "number"
      }
    ].map((r) => {
      var c;
      return r.showIf && !r.showIf(f) ? null : r.type === "select" ? /* @__PURE__ */ n(s, { children: [
        /* @__PURE__ */ e(
          a,
          {
            variant: "body2",
            fontWeight: 500,
            fontSize: 13,
            sx: { mb: 0.75, color: "#344054" },
            children: r.label
          }
        ),
        /* @__PURE__ */ e(ae, { fullWidth: !0, size: "small", children: /* @__PURE__ */ e(
          oe,
          {
            value: f[r.key] || r.placeholder || "",
            onChange: (p) => g(r.key, p.target.value),
            sx: {
              fontSize: "13px",
              backgroundColor: "white"
            },
            children: (c = r.options) == null ? void 0 : c.map((p) => /* @__PURE__ */ e(ie, { value: p.value, sx: { fontSize: "13px" }, children: p.label }, p.value))
          }
        ) })
      ] }, r.key) : r.type === "checkbox" ? /* @__PURE__ */ e(s, { children: /* @__PURE__ */ e(
        le,
        {
          control: /* @__PURE__ */ e(
            se,
            {
              checked: f[r.key] === "true",
              onChange: (p) => g(r.key, p.target.checked ? "true" : "false"),
              sx: {
                color: "#13715B",
                "&.Mui-checked": {
                  color: "#13715B"
                }
              }
            }
          ),
          label: /* @__PURE__ */ e(a, { variant: "body2", fontWeight: 500, fontSize: 13, sx: { color: "#344054" }, children: r.label })
        }
      ) }, r.key) : /* @__PURE__ */ n(s, { children: [
        /* @__PURE__ */ e(
          a,
          {
            variant: "body2",
            fontWeight: 500,
            fontSize: 13,
            sx: { mb: 0.75, color: "#344054" },
            children: r.label
          }
        ),
        /* @__PURE__ */ e(
          ce,
          {
            fullWidth: !0,
            type: r.type,
            placeholder: r.placeholder,
            value: f[r.key] || "",
            onChange: (p) => g(r.key, p.target.value),
            size: "small",
            sx: {
              "& .MuiOutlinedInput-root": {
                fontSize: "13px",
                backgroundColor: "white"
              }
            }
          }
        )
      ] }, r.key);
    }) }),
    /* @__PURE__ */ n(s, { sx: { display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }, children: [
      v && /* @__PURE__ */ e(
        P,
        {
          variant: "outlined",
          onClick: v,
          disabled: i || d,
          sx: {
            borderColor: "#13715B",
            color: "#13715B",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 500,
            "&:hover": {
              borderColor: "#0f5a47",
              backgroundColor: "rgba(19, 113, 91, 0.04)"
            },
            "&:disabled": {
              borderColor: "#d0d5dd",
              color: "#98a2b3"
            }
          },
          children: i ? "Testing..." : "Test Connection"
        }
      ),
      u && /* @__PURE__ */ e(
        P,
        {
          variant: "contained",
          onClick: u,
          disabled: d || i,
          sx: {
            backgroundColor: "#13715B",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 500,
            "&:hover": {
              backgroundColor: "#0f5a47"
            },
            "&:disabled": {
              backgroundColor: "#d0d5dd"
            }
          },
          children: d ? "Saving..." : "Save Configuration"
        }
      )
    ] })
  ] });
};
export {
  we as MLFlowConfiguration,
  ve as MLFlowTab
};
//# sourceMappingURL=index.esm.js.map
