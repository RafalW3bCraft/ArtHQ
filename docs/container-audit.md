# Production container vulnerability record

Scanned 27 November 2026 with Trivy 0.76.2, checksum-verified before execution. No ignore file or unfixed-vulnerability suppression was used.

Image: `asia-south1-docker.pkg.dev/arthq-tech/arthq/api:298b23f039705b65` (Node 22.23.5, Debian 13.8).

Immutable registry reference: `asia-south1-docker.pkg.dev/arthq-tech/arthq/api@sha256:6b1d0319c84362525c39f0247407bab35c17ef7dee410a788d54b8bdea9cb0ea`.

| Severity | Package findings |
| --- | --- |
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 21 |
| LOW | 12 |
| UNKNOWN | 2 |

The previous image reported one critical and 48 high package findings, including unused OS utilities and the bundled npm toolchain. The new final image contains no shell or package manager. It uses pinned Distroless base-nossl plus the Node binary and its loaded C++ libraries, with their package inventory and licenses retained. Its runtime smoke check passed application startup, anonymous admin denial, frontend serving, outbound TLS/certificate validation and UID 65532 execution.

The counts above are package findings, not distinct CVEs: GCC source issues appear against multiple related packages. Remaining findings have no fixed Debian version in this scan. They remain open for upstream tracking; this record does not assert they are all unreachable. Update base digests and repeat the scan when fixes are released. CI rejects any new high/critical findings.

| CVE | Severity | Packages | Fixed version in scan |
| --- | --- | --- | --- |
| [CVE-2026-102010](https://nvd.nist.gov/vuln/detail/CVE-2026-102010) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-114690](https://nvd.nist.gov/vuln/detail/CVE-2026-114690) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-114691](https://nvd.nist.gov/vuln/detail/CVE-2026-114691) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-115455](https://nvd.nist.gov/vuln/detail/CVE-2026-115455) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-115819](https://nvd.nist.gov/vuln/detail/CVE-2026-115819) | MEDIUM | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-121757](https://nvd.nist.gov/vuln/detail/CVE-2026-121757) | MEDIUM | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-125709](https://nvd.nist.gov/vuln/detail/CVE-2026-125709) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-84243](https://nvd.nist.gov/vuln/detail/CVE-2026-84243) | MEDIUM | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-95619](https://nvd.nist.gov/vuln/detail/CVE-2026-95619) | MEDIUM | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2010-4756](https://nvd.nist.gov/vuln/detail/CVE-2010-4756) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2018-20796](https://nvd.nist.gov/vuln/detail/CVE-2018-20796) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2019-1010022](https://nvd.nist.gov/vuln/detail/CVE-2019-1010022) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2019-1010023](https://nvd.nist.gov/vuln/detail/CVE-2019-1010023) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2019-1010024](https://nvd.nist.gov/vuln/detail/CVE-2019-1010024) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2019-1010025](https://nvd.nist.gov/vuln/detail/CVE-2019-1010025) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2019-9192](https://nvd.nist.gov/vuln/detail/CVE-2019-9192) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-100290](https://nvd.nist.gov/vuln/detail/CVE-2026-100290) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-115456](https://nvd.nist.gov/vuln/detail/CVE-2026-115456) | LOW | gcc-14-base 14.2.0-19, libgcc-s1 14.2.0-19, libstdc++6 14.2.0-19 | Not available |
| [CVE-2026-126765](https://nvd.nist.gov/vuln/detail/CVE-2026-126765) | LOW | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-121758](https://nvd.nist.gov/vuln/detail/CVE-2026-121758) | UNKNOWN | libc6 2.41-12+deb13u5 | Not available |
| [CVE-2026-124024](https://nvd.nist.gov/vuln/detail/CVE-2026-124024) | UNKNOWN | libc6 2.41-12+deb13u5 | Not available |

Node embeds its own OpenSSL. Its version must also be monitored against Node security releases; the separate Debian libssl is absent and the application does not expose QUIC. Scanner output is evidence about the packages it detects, not a guarantee that every vulnerability class or embedded component is covered.

The full scan report is retained outside the served directory; no service credentials were included in the scan record.
