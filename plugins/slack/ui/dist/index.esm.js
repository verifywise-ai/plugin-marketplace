import { jsxs as a, jsx as t } from "react/jsx-runtime";
import { forwardRef as E, createElement as R, useState as h, useCallback as M, useEffect as O } from "react";
import { Box as v, Typography as c, Stack as S, Button as u, CircularProgress as F, TableContainer as H, Table as U, TableHead as V, TableRow as z, TableCell as s, TableBody as G, TableFooter as J, TablePagination as q, FormControl as Y, Select as Z, MenuItem as Q, Checkbox as X } from "@mui/material";
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var K = {
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
const ee = (r) => r.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().trim(), T = (r, y) => {
  const k = E(
    ({ color: o = "currentColor", size: p = 24, strokeWidth: i = 2, absoluteStrokeWidth: P, className: W = "", children: l, ...d }, $) => R(
      "svg",
      {
        ref: $,
        ...K,
        width: p,
        height: p,
        stroke: o,
        strokeWidth: P ? Number(i) * 24 / Number(p) : i,
        className: ["lucide", `lucide-${ee(r)}`, W].join(" "),
        ...d
      },
      [
        ...y.map(([g, m]) => R(g, m)),
        ...Array.isArray(l) ? l : [l]
      ]
    )
  );
  return k.displayName = `${r}`, k;
};
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const te = T("SlidersHorizontal", [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ne = T("ToggleLeft", [
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "6", ry: "6", key: "f2vt7d" }],
  ["circle", { cx: "8", cy: "12", r: "2", key: "1nvbw3" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const oe = T("ToggleRight", [
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "6", ry: "6", key: "f2vt7d" }],
  ["circle", { cx: "16", cy: "12", r: "2", key: "4ma0v8" }]
]);
/**
 * @license lucide-react v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ae = T("Trash2", [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
]), ce = ({
  pluginKey: r = "slack",
  slackClientId: y,
  slackOAuthUrl: k = "https://slack.com/oauth/v2/authorize",
  onToast: o,
  apiServices: p
}) => {
  const [i, P] = h([]), [W, l] = h(!1), [d, $] = h([]), [g, m] = h(0), [b, _] = h(5), [j, w] = h(!1), C = p || {
    get: async (e) => ({ data: await (await fetch(`/api${e}`)).json() }),
    post: async (e, n) => ({ data: await (await fetch(`/api${e}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    })).json() }),
    patch: async (e, n) => ({ data: await (await fetch(`/api${e}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    })).json() }),
    delete: async (e) => {
      await fetch(`/api${e}`, { method: "DELETE" });
    }
  }, f = M(async () => {
    var e;
    try {
      l(!0);
      const n = await C.get(`/plugins/${r}/oauth/workspaces`);
      P(((e = n.data) == null ? void 0 : e.data) || []);
    } catch (n) {
      console.error("Failed to fetch Slack workspaces:", n);
    } finally {
      l(!1);
    }
  }, [r]);
  O(() => {
    f();
  }, [f]);
  const A = () => {
    if (!y) {
      console.warn("Slack Client ID not configured");
      return;
    }
    const e = encodeURIComponent(`${window.location.origin}/plugins/${r}/manage`), n = encodeURIComponent("incoming-webhook,chat:write"), x = `${k}?client_id=${y}&scope=${n}&redirect_uri=${e}`;
    window.open(x, "_blank", "noopener,noreferrer");
  }, I = async (e) => {
    try {
      await C.delete(`/plugins/${r}/oauth/workspaces/${e}`), o && o({
        variant: "success",
        body: "Workspace disconnected successfully!"
      }), f();
    } catch (n) {
      o && o({
        variant: "error",
        body: n.message || "Failed to disconnect workspace."
      });
    }
  }, L = async (e, n) => {
    try {
      await C.patch(`/plugins/${r}/oauth/workspaces/${e}`, {
        is_active: !n
      }), o && o({
        variant: "success",
        body: "Workspace status updated successfully!"
      }), f();
    } catch (x) {
      o && o({
        variant: "error",
        body: x.message || "Failed to update workspace status."
      });
    }
  }, N = async () => {
    if (i.length !== 0)
      try {
        await Promise.all(
          i.map(
            (e) => C.patch(`/plugins/${r}/oauth/workspaces/${e.id}`, {
              routing_type: d
            })
          )
        ), o && o({
          variant: "success",
          body: `Notification routing updated for all ${i.length} workspace(s)!`
        }), f();
      } catch (e) {
        o && o({
          variant: "error",
          body: e.message || "Failed to apply routing settings."
        });
      }
  }, D = (e, n) => {
    m(n);
  }, B = (e) => {
    _(parseInt(e.target.value, 10)), m(0);
  };
  return /* @__PURE__ */ a(v, { children: [
    /* @__PURE__ */ t(c, { variant: "body2", color: "text.secondary", fontSize: 13, sx: { mb: 3 }, children: "Connect your Slack workspace and route VerifyWise notifications to specific channels." }),
    /* @__PURE__ */ a(S, { direction: "row", justifyContent: "flex-end", spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ t("a", { href: "#", onClick: (e) => {
        e.preventDefault(), A();
      }, children: /* @__PURE__ */ t(
        "img",
        {
          alt: "Add to Slack",
          height: "34",
          width: "120",
          src: "https://platform.slack-edge.com/img/add_to_slack.png",
          srcSet: "https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
        }
      ) }),
      /* @__PURE__ */ t(
        u,
        {
          variant: "contained",
          startIcon: /* @__PURE__ */ t(te, { size: 18 }),
          onClick: () => w(!0),
          disabled: i.length === 0,
          sx: {
            height: "34px",
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
          children: "Configure"
        }
      )
    ] }),
    W ? /* @__PURE__ */ a(v, { sx: { display: "flex", alignItems: "center", gap: 2, py: 4 }, children: [
      /* @__PURE__ */ t(F, { size: 24 }),
      /* @__PURE__ */ t(c, { fontSize: 13, children: "Loading workspaces..." })
    ] }) : /* @__PURE__ */ t(H, { sx: { border: "1px solid #d0d5dd", borderRadius: "8px" }, children: /* @__PURE__ */ a(U, { children: [
      /* @__PURE__ */ t(V, { sx: { backgroundColor: "#f9fafb" }, children: /* @__PURE__ */ a(z, { children: [
        /* @__PURE__ */ t(s, { sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" }, children: "Team Name" }),
        /* @__PURE__ */ t(s, { sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" }, children: "Channel" }),
        /* @__PURE__ */ t(s, { sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" }, children: "Creation Date" }),
        /* @__PURE__ */ t(s, { sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" }, children: "Active" }),
        /* @__PURE__ */ t(s, { sx: { fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#475467" }, children: "Action" })
      ] }) }),
      /* @__PURE__ */ t(G, { children: i.length > 0 ? i.slice(g * b, g * b + b).map((e) => /* @__PURE__ */ a(z, { sx: { "&:hover": { backgroundColor: "#f9fafb" } }, children: [
        /* @__PURE__ */ t(s, { sx: { fontSize: "13px" }, children: e.team_name }),
        /* @__PURE__ */ a(s, { sx: { fontSize: "13px" }, children: [
          "#",
          e.channel
        ] }),
        /* @__PURE__ */ t(s, { sx: { fontSize: "13px" }, children: e.created_at ? new Date(e.created_at).toLocaleDateString() : "-" }),
        /* @__PURE__ */ t(s, { sx: { fontSize: "13px" }, children: e.is_active ? "Yes" : "No" }),
        /* @__PURE__ */ t(s, { children: /* @__PURE__ */ a(S, { direction: "row", spacing: 1, children: [
          /* @__PURE__ */ t(
            u,
            {
              size: "small",
              variant: "outlined",
              onClick: () => L(e.id, e.is_active),
              sx: {
                minWidth: "auto",
                px: 1,
                fontSize: "12px",
                textTransform: "none",
                borderColor: "#d0d5dd",
                color: "#344054"
              },
              title: e.is_active ? "Disable" : "Enable",
              children: e.is_active ? /* @__PURE__ */ t(oe, { size: 16 }) : /* @__PURE__ */ t(ne, { size: 16 })
            }
          ),
          /* @__PURE__ */ t(
            u,
            {
              size: "small",
              variant: "outlined",
              color: "error",
              onClick: () => I(e.id),
              sx: {
                minWidth: "auto",
                px: 1,
                fontSize: "12px",
                textTransform: "none"
              },
              title: "Delete",
              children: /* @__PURE__ */ t(ae, { size: 16 })
            }
          )
        ] }) })
      ] }, e.id)) : /* @__PURE__ */ t(z, { children: /* @__PURE__ */ t(s, { colSpan: 5, align: "center", sx: { py: 4 }, children: /* @__PURE__ */ t(c, { fontSize: 13, color: "text.secondary", children: 'No workspaces connected yet. Click "Add to Slack" above to connect.' }) }) }) }),
      i.length > 5 && /* @__PURE__ */ t(J, { children: /* @__PURE__ */ t(z, { children: /* @__PURE__ */ t(
        q,
        {
          count: i.length,
          page: g,
          onPageChange: D,
          rowsPerPage: b,
          rowsPerPageOptions: [5, 10, 15, 25],
          onRowsPerPageChange: B,
          labelRowsPerPage: "Rows per page",
          sx: { fontSize: "13px" }
        }
      ) }) })
    ] }) }),
    j && /* @__PURE__ */ t(
      v,
      {
        sx: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        },
        onClick: () => w(!1),
        children: /* @__PURE__ */ a(
          v,
          {
            sx: {
              backgroundColor: "white",
              borderRadius: "8px",
              p: 3,
              maxWidth: "600px",
              width: "90%"
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ t(c, { variant: "h6", fontWeight: 600, fontSize: 16, sx: { mb: 2 }, children: "Notification Routing" }),
              /* @__PURE__ */ t(c, { variant: "body2", color: "text.secondary", fontSize: 13, sx: { mb: 3 }, children: "Configure which notification types go to which Slack channels." }),
              /* @__PURE__ */ a(S, { spacing: 2, sx: { mb: 3 }, children: [
                /* @__PURE__ */ t(c, { variant: "subtitle2", fontWeight: 500, fontSize: 13, children: "Apply to all workspaces:" }),
                /* @__PURE__ */ t(Y, { fullWidth: !0, size: "small", children: /* @__PURE__ */ t(
                  Z,
                  {
                    multiple: !0,
                    value: d,
                    onChange: (e) => {
                      const n = typeof e.target.value == "string" ? e.target.value.split(",") : e.target.value;
                      $(n);
                    },
                    renderValue: (e) => e.length === 0 ? "Select notification types..." : `${e.length} type(s) selected`,
                    displayEmpty: !0,
                    sx: { fontSize: "13px" },
                    children: [
                      "Membership and roles",
                      "Projects and organizations",
                      "Policy reminders and status",
                      "Evidence and task alerts",
                      "Control or policy changes"
                    ].map((e) => /* @__PURE__ */ a(Q, { value: e, sx: { fontSize: "13px" }, children: [
                      /* @__PURE__ */ t(
                        X,
                        {
                          checked: d.indexOf(e) > -1,
                          sx: {
                            color: "#13715B",
                            "&.Mui-checked": { color: "#13715B" }
                          }
                        }
                      ),
                      /* @__PURE__ */ t(c, { fontSize: 13, children: e })
                    ] }, e))
                  }
                ) })
              ] }),
              /* @__PURE__ */ a(S, { direction: "row", spacing: 2, justifyContent: "flex-end", children: [
                /* @__PURE__ */ t(
                  u,
                  {
                    variant: "outlined",
                    onClick: () => w(!1),
                    sx: { textTransform: "none", fontSize: "13px" },
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ t(
                  u,
                  {
                    variant: "contained",
                    onClick: () => {
                      N(), w(!1);
                    },
                    disabled: d.length === 0,
                    sx: {
                      backgroundColor: "#13715B",
                      textTransform: "none",
                      fontSize: "13px",
                      "&:hover": { backgroundColor: "#0f5a47" }
                    },
                    children: "Save Changes"
                  }
                )
              ] })
            ]
          }
        )
      }
    )
  ] });
};
export {
  ce as SlackConfiguration
};
//# sourceMappingURL=index.esm.js.map
