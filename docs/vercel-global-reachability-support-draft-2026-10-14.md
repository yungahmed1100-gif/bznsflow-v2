# Draft Vercel support report — intermittent edge TLS timeouts

Status: prepared for owner review. **Do not submit without separate authorization.**

## Summary

`www.bznsflowai.com` is a verified Vercel custom domain. Global HTTP probes generally succeed, but one client network reported that the site did not load in Europe. Direct SNI-correct tests reproduced intermittent TLS-stage timeouts against individual Vercel anycast addresses while TCP port 443 and comparison addresses remained healthy. No application country block exists.

The production application is `bznsflow-main` in team `yungahmed1100-7330s-projects`. The deployment observed during diagnosis was `dpl_5Fxg7TV41m9vaVSemypenn5kGJMW`, source `8386b3cc816277226ba2f1ee80d215f72c81956f`.

## DNS and domain evidence

- Authoritative DNS: Google, DNSSEC valid.
- Apex: `bznsflowai.com A 76.76.21.21`, HTTP 308 to `https://www.bznsflowai.com/`.
- `www`: verified CNAME `cname.vercel-dns.com`.
- Certificates for apex and `www` were valid during diagnosis.
- The application has no country or region deny logic.

## Reproduced edge behavior

Tests connected to each returned IPv4 address while sending `www.bznsflowai.com` as both the HTTP Host and TLS SNI. TCP port 443 connected on the affected addresses. TLS handshake completion was intermittent:

| Edge IPv4 | Result | Comparison |
| --- | --- | --- |
| `76.76.21.164` | TLS timeout on rounds 1–4; success on round 5 | Other returned Vercel addresses completed TLS in about 0.15–0.22 seconds |
| `76.76.21.241` | Success on rounds 1–2; TLS timeout on rounds 3–5 | Same client, hostname and test method |

Exact UTC timestamps and the affected ISP/country should be attached from the JSON diagnostic and owner report immediately before submission. Do not infer them from local time.

## External comparison probes

- Homepage report `50e94257k43f`: 30/30 HTTP probes returned 200, including Germany, France, Spain, Switzerland, the Netherlands, Sweden, Austria, Portugal, Romania, Serbia, Cyprus and the UK.
- Anonymous API report `50e948c3k143`: 30/30 probes returned 200.
- DNS report `50e944a4k280` and ping report `50e94496k353` completed during the same investigation.
- Vercel Status reported all systems operational during diagnosis.

These successes show broad reachability and also make the repeatable per-address TLS failure material: the fault appears route/edge specific rather than a Europe-wide application outage.

## Application-side remediation

- Move the only Vercel Function region from Singapore (`sin1`) to Dublin (`dub1`) beside Convex `aws-eu-west-1`. This reduces backend latency but does not explain or conceal a pre-HTTP TLS timeout.
- Keep Google authoritative DNS, DNSSEC, the Vercel CNAME and apex redirect.
- Keep Vercel as the only CDN/proxy.
- Add independent regional HTTP, browser, DNS and TLS monitoring plus the SNI-correct diagnostic in `scripts/check-global-reachability.mjs`.

## Requested Vercel investigation

Please inspect edge and routing telemetry for the attached timestamps and IPs, with emphasis on TLS handshakes that reach TCP/443 but do not complete. Please confirm whether the two addresses were serving the domain correctly and whether any relevant edge maintenance, routing instability, certificate propagation or abuse mitigation occurred.

## Attachments to collect immediately before submission

1. `npm run --silent diagnose:global > reachability-www-UTC.json`
2. `npm run --silent diagnose:global -- --base https://bznsflowai.com > reachability-apex-UTC.json`
3. The affected user’s ISP, country/city, access type, UTC failure window and traceroute/MTR if available.
4. A successful comparison from the same network, if one exists.
5. Checkly monitor event IDs once monitoring is active.

## Known platform constraints

The project remains on Vercel Hobby at the owner’s request. This is a commercial website, while Hobby is restricted to personal, non-commercial use; plan eligibility and paid support remain unresolved. Vercel custom domains expose IPv4, so IPv6-only clients depend on working NAT64/IPv4 translation.
