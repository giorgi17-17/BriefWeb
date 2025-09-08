// lib/reqMeta.js
import crypto from "crypto";

export function startReqTimer(req, res) {
  req.rid = req.headers["x-request-id"] || crypto.randomUUID();
  req.t0  = process.hrtime.bigint();
  res.setHeader("x-request-id", req.rid);
}

export function baseProps(req) {
  return {
    rid: req.rid,
    ip: req.headers["x-forwarded-for"] || req.ip,
    ua: req.get("user-agent") || "",
    path: req.path,
    method: req.method,
  };
}
