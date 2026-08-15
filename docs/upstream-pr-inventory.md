# Upstream PR inventory — `CorentinTh/it-tools`

Analysis performed **2026-08-15** against `CorentinTh/it-tools` at `main` = `d505845`, which is also
the commit this fork (`gcandau/it-tools`) forked from.

The purpose of this document is to make the upstream backlog reusable: it enumerates every open pull
request, categorises the ones that add functionality, maps the duplicates, and records which ones
this fork has ported. Re-running the analysis from scratch is expensive; picking the next tool to
port from this file is not.

---

## 1. Headline numbers

| Metric | Value |
|---|---|
| Open PRs | **327** |
| Open issues | 487 |
| Stars / forks | 40.2k / 5.3k |
| Merged PRs (all time) | 493 |
| Last commit to `main` | **2026-02-12** — `chore(readme): remove sponsors section (#1733)` |
| Last *code* change to `main` | **2025-04-06** — `fix(c-input-text): set minimum height for input field (#1552)` |
| Last *new tool* merged | **2024-09-20** — `#1030 feat(new tool): Regex Tester` |
| Median age of open PRs | **729 days (~2.0 years)** |
| Mean age of open PRs | 673 days |
| Median age of *feature* PRs | **780 days** |
| Oldest open PR | #363 (2023-04-16) |
| Newest open PR | #1841 (2026-08-08) |

Open PRs by year opened: **2023** → 16 · **2024** → 213 · **2025** → 65 · **2026** → 33

Top authors: `sharevb` **167 (51%)** · `renovate` 19 · `utf26` 7 · `motui` 4 · `liudonghua123` 3 ·
`lionel-rowe` 3 · everyone else 1–2.

### Signal vs. noise

| Bucket | Count |
|---|---|
| **Feature / new-tool / behavioural-fix PRs** | **247** |
| Translation / i18n-only | 41 |
| Dependency & security bumps | 23 |
| CI / test / build / devcontainer / meta | 11 |
| Docs / README / external-link | 5 |

Of the 247 feature PRs, **161 titles literally say "new tool"**, and **130 of those are sharevb's**.

---

## 2. Repository health

**Upstream is functionally unmaintained for contributions.** It is not archived and carries no
notice to that effect, which is why PRs keep arriving.

- `main` has taken **5 commits in ~22 months**, and **four are sponsor-banner or README churn**
  (#1733, #1664, #1553, #1422). The only real code change since Oct 2024 is #1552, a one-line CSS fix.
- Last community feature merged: **#1360** (drag-and-drop favourites, 2024-10-25).
- Last new tool merged: **#1030** (Regex Tester, 2024-09-20) — ~23 months ago.
- No maintainer review activity anywhere in the queue. CI bots still run; Vercel previews sit in
  "awaiting team authorization".

**Consequence:** do not expect anything upstreamed from this fork to be merged. Porting into the
fork is the realistic path.

---

## 3. Porting strategy — do not replay PR branches

`sharevb` authored 167 of the 327 open PRs, 130 of them self-contained new tools, all following an
identical mechanical shape:

```
src/tools/<tool-name>/index.ts
src/tools/<tool-name>/<tool-name>.vue
src/tools/<tool-name>/<tool-name>.service.ts (+ .test.ts)
src/tools/index.ts          <- one import line + one array entry
package.json / pnpm-lock.yaml (when a new dep is needed)
locales/en.yml              (newer PRs only)
```

Every one of them collides on the same region of `src/tools/index.ts` and on `pnpm-lock.yaml`. The
conflicts are mechanical, not semantic — sharevb even opened #1282 to auto-tag conflicting PRs.

**The fork [`sharevb/it-tools`](https://github.com/sharevb/it-tools)** (1.6k★, GPL-3.0, default branch
`chore/all-my-stuffs`, ~2,233 commits ahead, last commit 2026-08-14) is essentially *upstream plus
this entire queue already merged and conflict-resolved*. Its README claims "almost all tools PR, 192
of mine, of original it-tools".

Because those PR branches were written against a `src/tools/index.ts` that has since diverged,
replaying them individually means resolving the same conflict 30+ times. **Port from the sharevb
tree instead**, cross-referencing the upstream PR number for provenance. Both repositories are
GPL-3.0, so this is licence-clean; each port commit credits the original author and PR.

```sh
git remote add sharevb https://github.com/sharevb/it-tools.git
git fetch sharevb chore/all-my-stuffs
git checkout sharevb/chore/all-my-stuffs -- src/tools/<slug>
# then hand-merge src/tools/index.ts, locales/en.yml, package.json
```

Beyond tools, that fork also adds capabilities upstream lacks entirely: PWA support, `PORT` env var,
subfolder deploys, `tools-filter.json` / `external-tools.json` / `tools-settings.json`, reverse-proxy
forward-auth recipes, and companion Docker side-services for tools that need a server.

---

## 4. Gaps — verified absent from both upstream and the backlog

Searched the full 327-PR list plus targeted GitHub searches for `zero-width`, `invisible`,
`homoglyph`, `watermark`, `AI detect`, `AI generated`, `AI text`, `sanitize`.

| Capability | Status |
|---|---|
| AI text detection | **No PR.** Greenfield. |
| AI watermark / invisible-character removal | **No PR.** Greenfield — and absent from the sharevb fork too. |
| HTTP API / backend | **One PR only** — #1819 (see §7). |
| CLI for it-tools | **No PR.** |
| PWA / offline for the app itself | **No PR.** ("PWA" appears once, in #1740, meaning the icon generator *emits* a PWA manifest.) |

Nearest-adjacent existing work, useful as architectural precedent: #1182 sensitive data masker ·
#1290 smart text replacer · #1295 Unicode search · #1183 text→Unicode names · #994 Unicode formatter ·
#961 HTML cleaner · #1531 HAR sanitizer · #1266 AI prompt splitter · #1454 GPT token counter.

---

## 5. Feature PRs by theme

Legend: **✅** self-contained (new dir under `src/tools/` + registration only) · **🔧** modifies an
existing tool · **⚙** core/infra change. **→ ported** marks what this fork has taken.

### 5.1 Text, string & Unicode (29)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1840 | feat(xml-diff): add XML diff tool | bruno-b-martins | 2026-08-08 | ✅ |
| #1803 | add new tool markdown diff | mazfreelance | 2026-05-22 | ✅ |
| #1739 | feat(text-to-unicode): support 'Unicode escape' format | pplulee | 2026-02-26 | 🔧 |
| #1534 | add Chinese characters convert to unicode and utf-8 | liyuanlin | 2025-03-10 | 🔧 |
| #1295 | feat(new tool): Unicode Search | sharevb | 2024-09-14 | ✅ |
| #1290 | feat(new tool): Smart Text Replacer and LineBreaks manager | sharevb | 2024-09-11 | ✅ |
| #1303 | feat(new tool): List Comparaison | sharevb | 2024-09-22 | ✅ |
| #1302 | feat(List Converter): remove prefix/suffix, split, sort | sharevb | 2024-09-21 | 🔧 |
| #1288 | fix: add No Sort option | sharevb | 2024-09-11 | 🔧 |
| #1266 | feat(new tool): AI Prompt Splitter | sharevb | 2024-08-23 | ✅ |
| #1258 | feat(new tool): Punycode Converter | sharevb | 2024-08-23 | ✅ |
| #1232 | feat(Slugify): add separator option | sharevb | 2024-08-09 | 🔧 |
| #1185 | feat(new tool): Common Regex Memo | sharevb | 2024-06-26 | ✅ |
| #1184 | feat(Lorem Ipsum): multi language/script | sharevb | 2024-06-26 | 🔧 |
| #1183 | feat(new tool): text to unicode names | sharevb | 2024-06-26 | ✅ |
| #1182 | feat(new tool): Sensitive data masker | sharevb | 2024-06-26 | ✅ |
| #1094 | feat(new tool): unicode to java entities | ng-anhhtuann | 2024-05-16 | ✅ |
| #1087 | fix(text-to-unicode): handle non-BMP + more options | lionel-rowe | 2024-05-14 | 🔧 |
| #1085 | fix(text-to-binary): valid UTF-8 for non-ASCII text | lionel-rowe | 2024-05-14 | 🔧 |
| #1075 | feat(new tool): Text extractor from HTML | dany-eduard | 2024-05-13 | ✅ |
| #1032 | feat(new tool): RMB Uppercase Converter | sharevb | 2024-05-01 | ✅ |
| #1021 | feat(new tool): Morse converter | sharevb | 2024-04-28 | ✅ |
| #1010 | feat(Text Statistics): add more stats | sharevb | 2024-04-28 | 🔧 |
| #994 | feat(new tool): Unicode Formatter | sharevb | 2024-04-20 | ✅ |
| #976 | feat: add smart text replacer | utf26 | 2024-04-07 | ✅ (dup of #1290) |
| #956 | feat(Text to NATO): other languages, case | sharevb | 2024-04-03 | 🔧 |
| #952 | feat: Add Text-Case Transformer | utf26 | 2024-04-02 | ✅ |
| #1391 | fix(regex tester): optional groups/captures failing | sharevb | 2024-11-17 | 🔧 |
| #1651 | ASCII text drawer: robust font loading w/ CDN fallback | jasonwitty | 2025-09-17 | 🔧 |

### 5.2 Markdown, docs & cheat-sheets (13)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1807 | feat: add markdown table generator | SSDWGG | 2026-05-30 | ✅ |
| #1753 | added markdown preview feature | ssrahul96 | 2026-03-17 | ✅ |
| #1626 | feat(tools): conventional commits cheatsheet | iesoftwaredeveloper | 2025-08-07 | ✅ |
| #1563 | feat(new tool): Mermaid exporter | dani-b-g | 2025-04-11 | ✅ |
| #1230 | feat(new tool): Paste as Markdown | sharevb | 2024-08-09 | ✅ |
| #1106 | feat(new tool): Markdown TOC Generator | sharevb | 2024-05-18 | ✅ |
| #1028 | feat(new tool): nano cheatsheet | sharevb | 2024-05-01 | ✅ |
| #1020 | feat(new tool): Folder Tree Diagram | sharevb | 2024-04-28 | ✅ |
| #1019 | feat(new tool): Markdown Editor | sharevb | 2024-04-28 | ✅ |
| #955 | feat(new tool): Markdown Cheatsheet | sharevb | 2024-04-03 | ✅ |
| #904 | feat(new tool): Html to Markdown converter | sharevb | 2024-02-25 | ✅ |
| #632 | html-md-converter | leonletto | 2023-09-15 | ✅ (dup of #904) |
| #1204 | Add branches to Git cheatsheet | teyhouse | 2024-07-14 | 🔧 |

### 5.3 Crypto, security, certificates & auth (42)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1812 | feat: add X509 certificate generator tool | XiaoMing0000 | 2026-06-09 | ✅ |
| #1702 | Add JavaScript Obfuscator tool | forzayt | 2025-12-31 | ✅ |
| #1669 | JWT parser value editor | Cereal916 | 2025-10-26 | 🔧 |
| #1585 | refactor(ui): AES CBC/GCM mode selection and IV handling | jbraconig | 2025-05-31 | 🔧 |
| #1574 | Add a login token to restrict users | pq-dong | 2025-05-06 | ⚙ |
| #1531 | feat(new tool): HAR file sanitizer | sharevb | 2025-03-09 | ✅ |
| #1515 | Hotp HMAC or event-based one time passwords | SimonHaas | 2025-02-25 | ✅ |
| #1479 | added WPA2/WPA3 and WPA3 only | derekcentrico | 2025-01-29 | 🔧 |
| #1453 | feat(new tool): JWT Generator and Signature verification | sharevb | 2025-01-12 | ✅ |
| #1326 | fix(wifi-qr-code-generator): add WPA3 label | asheliahut | 2024-10-01 | 🔧 |
| #1306 | feat(new tool): SSL Certificate Converter | sharevb | 2024-09-22 | ✅ |
| #1261 | feat(new tool): PIN Code Generator | sharevb | 2024-08-23 | ✅ |
| #1260 | feat(new tool): Passphrase Generator | sharevb | 2024-08-23 | ✅ |
| #1259 | feat(new tool): WPA PSK Raw Key Generator | sharevb | 2024-08-23 | ✅ |
| #1221 | fix(OTP Generator): query and storage for secret | sharevb | 2024-08-04 | 🔧 |
| #1157 | add key encoding support for encryption | liudonghua123 | 2024-06-13 | 🔧 |
| #1156 | feat: key encoding (text or hex) for hmac | liudonghua123 | 2024-06-13 | 🔧 |
| #1152 | fix(bcrypt tool): fix error states and crashes (#1133) | lionel-rowe | 2024-06-07 | 🔧 |
| #1141 | feat(new tool): File Hasher | sharevb | 2024-06-01 | ✅ |
| #1140 | feat(new tool): CRC calculator | sharevb | 2024-06-01 | ✅ |
| #1108 | feat(new tool): rsa/ecdsa signing and verify | sharevb | 2024-05-18 | ✅ |
| #1099 | feat(new tool): JS Unobfuscator | sharevb | 2024-05-18 | ✅ |
| #1027 | feat(new tool): ECDSA Keygen | sharevb | 2024-05-01 | ✅ |
| #1013 | feat(new tool): RSA Encryption | sharevb | 2024-04-28 | ✅ |
| #1012 | feat(new tool): PGP Keygen | sharevb | 2024-04-28 | ✅ |
| #1011 | feat(new tool): PGP Encryption | sharevb | 2024-04-28 | ✅ |
| #986 | feat(Hash Text): more hashing methods | sharevb | 2024-04-14 | 🔧 |
| #985 | feat(new tool): add SIP authentication | jingzhaoyang | 2024-04-13 | ✅ |
| #970 | feat(new tool): PDF Encrypt | sharevb | 2024-04-03 | ✅ |
| #967 | fix(PDF Signature Checker): fix reading problem | sharevb | 2024-04-03 | 🔧 |
| #931 | feat(new tool): Pdf Unlocker | sharevb | 2024-03-10 | ✅ |
| #917 | feat(new tool): Certificate/Key Parser and converter | sharevb | 2024-03-03 | ✅ |
| #915 | feat(new tool): x509 Certificate Generator | sharevb | 2024-03-03 | ✅ (overlaps #1812) |
| #913 | fix(Token Generator): multi token, settings, denied chars | sharevb | 2024-03-03 | 🔧 |
| #912 | feat(new tool): Ansible Vault Encrypt/Decrypt | sharevb | 2024-03-03 | ✅ |
| #910 | feat(new tool): CSR Generator | sharevb | 2024-03-03 | ✅ |
| #902 | feat(new tool): htpasswd generator | sharevb | 2024-02-25 | ✅ |
| #888 | feat(rsa-key-generator): passphrase and formats | sharevb | 2024-02-18 | 🔧 |
| #887 | feat(new tool): Ed25519 Key Pair Generator | sharevb | 2024-02-17 | ✅ |
| #535 | File hash tool | marvin-j97 | 2023-07-13 | ✅ (dup of #1141) |
| #373 | feat(aes): specify the IV in AES encryption | LinkinStars | 2023-04-20 | 🔧 |
| #363 | feat(new tool): argon2 password hashing and verification | **CorentinTh** | 2023-04-16 | ✅ maintainer's own PR |

### 5.4 Network, IP, DNS & URL (32)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1524 | feat(new tool): SharePoint Url Decoder | sharevb | 2025-03-02 | ✅ |
| #1474 | feat(Url Encoder): enhance encoding options | sharevb | 2025-01-26 | 🔧 |
| #1465 | Add ipv6 support | AndersBallegaard | 2025-01-23 | 🔧 |
| #1457 | feat(new tool): OVH X-VR-SPAMCAUSE Decoder | sharevb | 2025-01-12 | ✅ |
| #1455 | feat(new tool): My IP Address | sharevb | 2025-01-12 | ✅ |
| #1451 | feat(new tool): IP Subnet Exclude Calculator | sharevb | 2025-01-12 | ✅ |
| #1371 | feat(new tool): DNS query (over HTTPS) | sharevb | 2024-10-26 | ✅ |
| #1305 | feat(new tool): Bounce Email Parser | sharevb | 2024-09-22 | ✅ |
| #1278 | feat(new tool): WebSocket Tester | sharevb | 2024-09-01 | ✅ |
| #1264 | feat(new tool): Integers to IP | sharevb | 2024-08-23 | ✅ |
| #1254 | feat(new tool): Email Parser and Outlook MSG Parser | sharevb | 2024-08-23 | ✅ |
| #1201 | feat(new tool): Torrent To Magnet and parser | sharevb | 2024-07-12 | ✅ |
| #1171 | feat(new tool): curl converter | sharevb | 2024-06-16 | ✅ |
| #1168 | feat(New tool): API Tester | sharevb | 2024-06-16 | ✅ |
| #1033 | feat(new tool): TTL Calculator | sharevb | 2024-05-01 | ✅ |
| #1029 | feat(new tool): Port Info Search | sharevb | 2024-05-01 | ✅ |
| #1014 | feat(new tool): Nginx Config File formatter | sharevb | 2024-04-28 | ✅ |
| #993 | feat(new tool): IPv4/6/CIDR/Range in CIDR/IP Range | sharevb | 2024-04-20 | ✅ |
| #969 | feat(IPv4 Subnet/Address Calculator): more ip info | sharevb | 2024-04-03 | 🔧 |
| #963 | feat(new tool): IPv6 Subnet Calculator | sharevb | 2024-04-03 | ✅ |
| #962 | feat(new tool): UTM URL Generator | sharevb | 2024-04-03 | ✅ |
| #959 | feat(new tool): URL Cleaner | sharevb | 2024-04-03 | ✅ |
| #954 | feat(new tool): Option 43 DHCP Generator | sharevb | 2024-04-03 | ✅ |
| #944 | feat: IPv6 subnet calculator for issue #924 | utf26 | 2024-03-28 | ✅ (dup of #963) |
| #932 | feat(new tool): Url Defanger/Fanger | sharevb | 2024-03-10 | ✅ |
| #918 | feat(new tool): URL Text Fragment Generator | sharevb | 2024-03-03 | ✅ |
| #873 | fix(url-parser): handle repeated params | sharevb | 2024-02-04 | 🔧 |
| #871 | feat(new tool): IPv4/6 CIDR to IP Range | sharevb | 2024-02-03 | ✅ |
| #870 | feat(new tool): IPv6 Address Converter | sharevb | 2024-02-03 | ✅ |
| #869 | feat(new tool): IPv4/6 Range To CIDR | sharevb | 2024-02-03 | ✅ |
| #867 | feat(new tool): MAC Address Converter | sharevb | 2024-02-03 | ✅ |
| #866 | feat(new tool): IP Geolocation | sharevb | 2024-02-03 | ✅ |

### 5.5 Data formats — JSON / XML / YAML / CSV / code-gen (35)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1811 | feat: add 5 new developer tools (cURL to Code, JSON to Types, HTML to Markdown, CSS/JS Prettify & Minify, Byte Unit Converter) | stevenlee87 | 2026-06-04 | ⚙ **44 files, +5762/−209** — see §8 |
| #1643 | feat(json-viewer): auto-unescape escaped JSON string | iyuq | 2025-09-02 | 🔧 |
| #1542 | add unescape unicode in JSON Prettify | zxfishhack | 2025-03-25 | 🔧 |
| #1539 | feat(json-viewer): add json repair option | imposibrus | 2025-03-22 | 🔧 |
| #1529 | feat(new tool): Parquet File Reader | sharevb | 2025-03-09 | ✅ |
| #1434 | fix(yaml-viewer): prevent large ints becoming exponential | Link1515 | 2024-12-26 | 🔧 |
| #1323 | feat(new tool): JSON Size Analyzer | sharevb | 2024-09-28 | ✅ |
| #1322 | feat(new tool): Smart Raw Error Converter | sharevb | 2024-09-28 | ✅ |
| #1319 | feat(new tool): Code Highlighter | sharevb | 2024-09-28 | ✅ |
| #1318 | feat(Html WYSYWIG): add colors and tables | sharevb | 2024-09-28 | 🔧 |
| #1307 | feat(new tool): Stacktrace Formatter | sharevb | 2024-09-22 | ✅ |
| #1287 | feat(new tool): Border Generator CSS | 4DRIAN0RTIZ | 2024-09-07 | ✅ |
| #1277 | fix(json-to-csv): handle single object and flatten | sharevb | 2024-09-01 | 🔧 |
| #1262 | feat(new tool): jq/JSONPath tester | sharevb | 2024-08-23 | ✅ |
| #1257 | feat(new tool): XPath tester | sharevb | 2024-08-23 | ✅ |
| #1256 | feat(new tool): CSS <> XPath converter | sharevb | 2024-08-23 | ✅ |
| #1246 | feat(new tool): JSON to object | micash545 | 2024-08-16 | ✅ |
| #1200 | feat(new tool): XSLT Tester | sharevb | 2024-07-12 | ✅ |
| #1192 | add new tools json-to-java entity | lemon8866 | 2024-07-03 | ✅ |
| #1169 | Add Format Transformer download option | sharevb | 2024-06-16 | 🔧 |
| #1166 | feat(new tool): JSON To Schema | sharevb | 2024-06-16 | ✅ |
| #1165 | feat(New tool): Image to CSS | sharevb | 2024-06-16 | ✅ |
| #1105 | feat(new tools): JSON to PHP Array and reverse | sharevb | 2024-05-18 | ✅ |
| #1103 | feat(new tool): JSON Editor | sharevb | 2024-05-18 | ✅ |
| #1102 | feat(new tool): JSON to C# | sharevb | 2024-05-18 | ✅ |
| #1031 | feat(new tool): Json to Go | sharevb | 2024-05-01 | ✅ |
| #1015 | feat(new tool): JSON Linter | sharevb | 2024-04-28 | ✅ |
| #1002 | feat(new tool): Json to typescript interface | Chanzhaoyu | 2024-04-25 | ✅ |
| #966 | feat(new tool): JSON Escape/Unescape | sharevb | 2024-04-03 | ✅ |
| #961 | feat(new tool): html cleaner | sharevb | 2024-04-03 | ✅ |
| #958 | feat(new tool): HTML/CSS/JS Prettiers | sharevb | 2024-04-03 | ✅ |
| #957 | feat(Yaml Viewer): add parsing validation | sharevb | 2024-04-03 | 🔧 |
| #947 | feat: JS Object to JSON Converter (#849) | utf26 | 2024-03-29 | ✅ |
| #943 | feat(new tool): JSON sorter (#941) | utf26 | 2024-03-27 | ✅ |
| #820 | feat(new-tool): Spring Boot properties to YAML converter | marcelocg | 2023-12-28 | ✅ |

### 5.6 Encoding / binary / base-N (11)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1695 | feat(new tool): GZIP String converter | Oxrishabh | 2025-12-19 | ✅ (dup of #929) |
| #1530 | feat(new tool): Hex Converter | sharevb | 2025-03-09 | ✅ |
| #1525 | feat(new tool): Base64 Hex Converter | sharevb | 2025-03-02 | ✅ |
| #1348 | feat(new tool): Floating Point Number Converter | Rapha149 | 2024-10-16 | ✅ |
| #1263 | feat(new tool): Hex File Converter | sharevb | 2024-08-23 | ✅ |
| #1147 | feat: paste file feature for base64 file converter | liudonghua123 | 2024-06-06 | 🔧 |
| #1016 | feat(new tool): File Type Identifier | sharevb | 2024-04-28 | ✅ |
| #930 | feat(new tool): MIME Encoder/Decoder | sharevb | 2024-03-10 | ✅ |
| #929 | feat(new tool): GZIP String converter | sharevb | 2024-03-10 | ✅ |
| #901 | fix(integer-base-converter): prefix/suffix, case insensitive | sharevb | 2024-02-25 | 🔧 |
| #595 | feat(tool improve): image preview to Base64 | SAF2k | 2023-08-28 | 🔧 |

### 5.7 Generators & identifiers (15)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1810 | Add tool to generate Belgian national id | barticular | 2026-06-03 | ✅ |
| #1740 | feat: icon generator with preset resizing, ZIP export, PWA manifest | fclef819 | 2026-02-26 | ✅ |
| #1683 | feat(iban-generator): add IBAN generator tool | KaTo3107 | 2025-12-04 | ✅ |
| #1463 | feat(new tool): ObjectId generator and parser | davidporos92 | 2025-01-21 | ✅ |
| #1441 | feat(UUID Generator): add v6 and v7 versions | sharevb | 2025-01-01 | 🔧 |
| #1329 | feat(new tool): VAT Number Validator | sharevb | 2024-10-02 | ✅ |
| #1327 | feat(new tool): Countries/ISO 3166 Searcher | sharevb | 2024-10-02 | ✅ |
| #1320 | feat(new tool): Luhn Checker | sharevb | 2024-09-28 | ✅ |
| #1233 | feat(new tool): Mongo ObjectId DateTime Converter | sharevb | 2024-08-09 | ✅ |
| #1211 | feat(new tool): Snowflake ID extractor | antegral | 2024-07-22 | ✅ |
| #1149 | UUIDv7 generator | nghduc97 | 2024-06-06 | 🔧 |
| #1138 | feat(new tool): nanoid generator | albertasaftei00 | 2024-05-31 | ✅ |
| #868 | feat(new tool): ISBN Parser and Formatter | sharevb | 2024-02-03 | ✅ |
| #742 | New tool: UUID converter | HMS-Seyfarth | 2023-11-09 | ✅ |
| #1064 | fix(uuid-generator): prevent textarea height increase | praneethravuri | 2024-05-11 | 🔧 |

### 5.8 Media — image, audio, PDF, barcode, colour (20)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1774 | Fix fontPath URL in figlet defaults | WalidDevIO | 2026-04-09 | 🔧 |
| #1690 | [fix]: figlet.defaults Path fixed | LoveAndHope-dev | 2025-12-11 | 🔧 (dup) |
| #1685 | Slash removed from ASCII Art font URL | JensFZ | 2025-12-05 | 🔧 (dup) |
| #1439 | WiFi QR Code — allow to copy the text | ekamil | 2024-12-30 | 🔧 |
| #1340 | feat(new tool): Microphone tester | gornvan | 2024-10-09 | ✅ |
| #1328 | feat(new tool): Images Formats Converter | sharevb | 2024-10-02 | ✅ |
| #1276 | feat(new tool): ICO <> PNG Converter | sharevb | 2024-09-01 | ✅ |
| #1265 | feat(new tool): Color Wheel | sharevb | 2024-08-23 | ✅ |
| #1255 | feat(new tool): Math OCR to Latex | sharevb | 2024-08-23 | ✅ |
| #1229 | feat(new tool): Exif Remover | sharevb | 2024-08-09 | ✅ |
| #1167 | feat(new tool): Potrace | sharevb | 2024-06-16 | ✅ |
| #1104 | fix(QR Code Generator): many enhancements | sharevb | 2024-05-18 | 🔧 |
| #1100 | feat(new tools): Barcode Reader and Generator | sharevb | 2024-05-18 | ✅ |
| #1018 | feat(new tool): HEIC Converter | sharevb | 2024-04-28 | ✅ |
| #1017 | feat(Color Converter): many enhancements | sharevb | 2024-04-28 | 🔧 |
| #968 | feat(new tool): PDF Linearizer | sharevb | 2024-04-03 | ✅ |
| #960 | feat(ASCII Art Generator): output for coding languages | sharevb | 2024-04-03 | 🔧 |
| #953 | feat(new tool): Image to ASCII Art | sharevb | 2024-04-03 | ✅ |
| #919 | feat(new tool): OCR Image | sharevb | 2024-03-03 | ✅ |
| #914 | feat(new tool): QRCode decoder | sharevb | 2024-03-03 | ✅ |

### 5.9 DevOps — Docker / Kubernetes / cron / permissions (15)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1602 | New tool: CLI command editor | tars-a | 2025-06-28 | ✅ |
| #1452 | feat(new tool): Dockerfile Linter | sharevb | 2025-01-12 | ✅ |
| #1283 | Crontab: show next 5 execution times | louyongjiu | 2024-09-06 | 🔧 |
| #1268 | Update docker-run-to-docker-compose-converter | pricootz | 2024-08-25 | 🔧 |
| #1186 | feat: display a footer/list of npm packages per tool | sharevb | 2024-06-26 | ⚙ |
| #1026 | fix(Cron Parser): handle aws, next executions and TZ | sharevb | 2024-05-01 | 🔧 |
| #965 | feat(new tool): Docker Compose Validator | sharevb | 2024-04-03 | ✅ |
| #964 | feat(Chmod Calculator): octal, symbolic, special flags | sharevb | 2024-04-03 | 🔧 |
| #933 | feat(new tool): Software Licenses Compatibility and infos | sharevb | 2024-03-10 | ✅ |
| #890 | feat(new-tool): Docker Compose to Kubernetes manifests | sharevb | 2024-02-18 | ✅ |
| #889 | feat(new-tool): Docker Run command(s) to Kubernetes | sharevb | 2024-02-18 | ✅ |
| #864 | feat(new tool): Docker Compose Format Converter | sharevb | 2024-02-02 | ✅ |
| #847 | feat(new tool): Docker compose to docker run | sharevb | 2024-01-21 | ✅ |
| #845 | feat: Docker run to docker compose enhancements | sharevb | 2024-01-21 | 🔧 |
| #645 | Tools/chmod calculator | Art051 | 2023-09-28 | 🔧 |

### 5.10 Math, units & calculators (14)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1779 | feat: add Tip Calculator and Bill Splitter | rayrishu19-wq | 2026-04-17 | ✅ |
| #1523 | feat(new tools): IES Guidelines and Illuminance converter | sharevb | 2025-03-02 | ✅ |
| #1491 | fix(Temperature Converter): don't round to 2 digits | sharevb | 2025-02-05 | 🔧 |
| #1456 | feat(new tool): Geo Distance Computer | sharevb | 2025-01-12 | ✅ |
| #1372 | feat(new tool): Energy Expense Computer | sharevb | 2024-10-26 | ✅ |
| #1330 | feat(new tools): Units Converter | sharevb | 2024-10-02 | ✅ |
| #1321 | feat(new tool): Currency Converter | sharevb | 2024-09-28 | ✅ |
| #1304 | feat(new tool): SLA Computer | sharevb | 2024-09-22 | ✅ |
| #1289 | feat(new tools): Data Storage/Transfer Units Converter | sharevb | 2024-09-11 | ✅ |
| #1218 | feat(new tool): Raid Calculator | robweber | 2024-07-30 | ✅ |
| #1153 | Temperature limits | dyuri | 2024-06-11 | 🔧 |
| #1101 | feat(new tool): Math Formula format converter | sharevb | 2024-05-18 | ✅ |
| #1022 | feat(new tool): HDD Size Calculator | sharevb | 2024-04-28 | ✅ |
| #948 | feat: data storage unit conversion (#848) | utf26 | 2024-03-30 | ✅ (dup of #1289) |

### 5.11 Date & time (7)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1385 | feat(device-information): time zone information | maurizuki | 2024-11-09 | 🔧 |
| #1336 | feat(new tool): Week Numbers Converter | sharevb | 2024-10-06 | ✅ |
| #1331 | feat(new tools): iCal Generator/Merger/Parser | sharevb | 2024-10-02 | ✅ |
| #1324 | feat(new tool): Duration, Date+Duration, Days Interval Calculator | sharevb | 2024-09-28 | ✅ |
| #1284 | feat(new tool): Timezone Converter | sharevb | 2024-09-06 | ✅ |
| #984 | feat: date difference calculator UI (#971) | utf26 | 2024-04-12 | ✅ |
| #903 | fix(date-time-converter): microseconds, UTC and more | sharevb | 2024-02-25 | 🔧 |

### 5.12 Fun / random (1)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1532 | feat(new tools): Dice Roller, Coin Flipper, Card Picker, Fortune Wheel | sharevb | 2025-03-09 | ✅ |

### 5.13 Core app / UI / platform (15)

| PR | Title | Author | Opened | Type |
|---|---|---|---|---|
| #1819 | feat: add REST API server + Docker containerization | hutgrabber | 2026-06-19 | ⚙ — see §7 |
| #1670 | Make it possible to override nginx listen port in container | p-m-j | 2025-10-29 | ⚙ |
| #1640 | fix(issues): fix textarea always grows | mbienhuels | 2025-08-27 | ⚙ |
| #1637 | Placeholder of search field moved to localization file | VolgaIgor | 2025-08-26 | ⚙ |
| #1559 | fix bug #1546 | iodeal | 2025-04-10 | ⚙ |
| #1547 | Fix input-text size issues | aivelon | 2025-04-02 | ⚙ |
| #1545 | fix(input-text): increase vertical padding | ariqpradipa | 2025-03-26 | ⚙ |
| #1510 | Fix input text too small when icon absent | leamsigc | 2025-02-21 | ⚙ |
| #1499 | use nginx-unprivileged | ombre8 | 2025-02-14 | ⚙ |
| #1440 | fix(Search tools): show more tools | sharevb | 2025-01-01 | ⚙ |
| #1394 | Add Helm Chart Deploy | wenyang0 | 2024-11-20 | ⚙ |
| #1298 | Add docker compose self host | daisukebtw | 2024-09-19 | ⚙ |
| #1209 | feature: supports reading language from environment variables | 1013461195 | 2024-07-17 | ⚙ |
| #846 | fix(ui): TextArea-Copyable, copy icon placement | sharevb | 2024-01-21 | ⚙ |
| #427 | cd: parametrize listen port | FerranAD | 2023-06-01 | ⚙ |

---

## 6. Self-host / deployment PRs

| PR | Title | Author | Opened |
|---|---|---|---|
| #1796 | fix: upgrade nginx base image to fix CVE-2026-42945 (CVSS 9.2 RCE) | zethis | 2026-05-14 |
| #1670 | Make it possible to override nginx listen port in container | p-m-j | 2025-10-29 |
| #1645 | Run Playwright test in container | tobiasge | 2025-09-04 |
| #1518 | Add link to TrueNAS IT-Tools app | tekenstam | 2025-02-27 |
| #1499 | use nginx-unprivileged | ombre8 | 2025-02-14 |
| #1426 | feat(devcontainer): adds Dev Container configuration (#1393) | cr2007 | 2024-12-16 |
| #1394 | Add Helm Chart Deploy | wenyang0 | 2024-11-20 |
| #1298 | Add docker compose self host | daisukebtw | 2024-09-19 |
| #1209 | feature: supports reading language from environment variables | 1013461195 | 2024-07-17 |
| #427 | cd: parametrize listen port | FerranAD | 2023-06-01 |

**#1670, #1499 and #427 are three independent PRs solving the same nginx-port problem across three
years**, none merged.

---

## 7. The only backend PR — #1819

`feat: add REST API server + Docker containerization` (hutgrabber, 2026-06-19), 16 files changed.

- New: `server/index.ts`, `server/routes/{converter,crypto,data,development,math,network,text,web}.ts`,
  `tsconfig.server.json`, `manual-it-tools-api.md`.
- Modified: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `package.json`, `pnpm-lock.yaml`.
- Claims to expose 86 utilities over REST, SPA + Node API behind nginx.
- SonarCloud flagged three issues (Node runs as root, unmerged `RUN` layers, unwrapped startup
  command). No maintainer review.

**This fork does not port it.** It changes the deployment model to a Node server behind nginx; this
fork's API targets Vercel serverless functions instead (see `README` / `docs/api.md`).

Adjacent but not backends: #1574 (browser-side login gate — the token is checked in the browser, so
it is auth theatre) · #1168 (in-browser HTTP client tool) · #1602 (a tool for composing CLI commands,
not a CLI *for* it-tools) · #1171 / #1811 curl converters (client-side).

---

## 8. Duplicate & competing PRs

| Feature | Competing PRs |
|---|---|
| GZIP string converter | #929 · #1695 |
| X.509 certificate generator | #915 · #1812 |
| HTML → Markdown | #904 · #632 · part of #1811 |
| Smart text replacer | #1290 · #976 |
| IPv6 subnet calculator | #963 · #944 |
| Data-storage unit converter | #1289 · #948 · "Byte Unit Converter" in #1811 |
| File hasher | #1141 · #535 |
| figlet / ASCII-art font path | #1774 · #1690 · #1685 · #1651 |
| nginx listen port | #1670 · #1499 · #427 |
| DNS query | #1371 · `dns-query/` in #1811 |
| SSL certificate parsing | #1306 · #917 · `ssl-certificate-parser/` in #1811 |
| Korean translation | #1817 · #1604 · #1507 |
| Italian translation | #1825 · #1661 · #1155 · #1050 |
| Traditional Chinese | #1469 · #1378 · #1128 · #1127 · #927 |
| Turkish | #1679 · #1549 · #1247 · #978 |
| Russian | #1795 · #1409 |

Where two PRs implement the same tool, this fork prefers the sharevb version (it is the one already
merged and maintained in that fork's tree).

**#1811** deserves a specific warning: it bundles five tools into 44 files (+5762/−209), touches
`src/main.ts`, `tool.layout.vue`, `tools.store.ts` and `wrangler.toml`, and ships two tree-sitter
`.wasm` blobs. It is the largest open feature PR and **not a clean cherry-pick**.

---

## 9. Translation-only PRs (41 — excluded from the feature inventory)

#1825 (it) · #1817 (ko) · #1805 (uk) · #1795 (ru) · #1769 (fr) · #1764 (en typo) · #1727 (el) ·
#1712 (id) · #1679 (az+tr) · #1671 (zh) · #1661 (it) · #1637 (search placeholder i18n) · #1629 (pt) ·
#1604 (ko) · #1603 (uz) · #1579 (zh) · #1549 (tr, WIP) · #1507 (ko_KR) · #1469 (zh-TW) · #1461 (pt) ·
#1409 (ru) · #1378 (zh-hant) · #1269 (nl) · #1247 (tr) · #1189 (da) · #1178 (de + make tools
translatable) · #1177 (es) · #1155 (it) · #1128 · #1127 (zh-TW) · #1050 (it) · #978 (tr) ·
#927 (zh-TW) · #885 (zh-CN) · #692 · #691 · #690 · #689 (motui, i18n of 4 specific tools).

**#1178** is more than a translation — it refactors hard-coded strings across many tools into i18n
keys. Treat it as ⚙ if full i18n coverage is ever wanted. Note this fork's `locales/fr.yml` currently
covers exactly one tool.

---

## 10. Port status in this fork

### 10.1 Ported

27 tools, taken from the `sharevb` tree and adapted to this fork's conventions.

| PR | Tool | Category |
|---|---|---|
| #363 | Argon2 hasher | Crypto |
| #1141 | File hasher | Crypto |
| #1140 | CRC calculator | Crypto |
| #902 | htpasswd generator | Crypto |
| #1260 | Passphrase generator | Crypto |
| #1182 | Sensitive data masker | Text |
| #1290 | Smart text replacer | Text |
| #1303 | List comparer | Text |
| #1021 | Morse converter | Converter |
| #1258 | Punycode converter | Converter |
| #904 | HTML to Markdown | Converter |
| #1002 | JSON to TypeScript | Converter |
| #1166 | JSON to Schema | Converter |
| #966 | JSON escaper | Converter |
| #943 | JSON sort master | Development |
| #961 | HTML cleaner | Development |
| #1106 | Markdown TOC generator | Development |
| #963 | IPv6 subnet calculator | Network |
| #871 | CIDR to IP range | Network |
| #869 | IP range to CIDR | Network |
| #959 | URL cleaner | Network |
| #1029 | Port numbers | Network |
| #1284 | Timezone converter | Date & time |
| #1324 | Duration calculator | Date & time |
| #1330 | Many units converter | Measurement |
| #1304 | SLA calculator | Measurement |
| #1320 | Luhn validator | Data |

Fixes applied to existing tools: #1774 (figlet fonts, now served locally),
#1085 (text-to-binary UTF-8), #1087 (text-to-unicode non-BMP), #1152 (bcrypt crashes),
#986 (SHA3 output sizes), #1441 (UUID v6/v7), #1440 (command-palette result cap).

**Not ported, with reasons.** `unicode-search` (#1295), `text-to-unicode-names` (#1183) and
`iso-3166-searcher` (#1327) need a full Unicode database or `countries-db` plus a search composable
this fork lacks; `certificate-key-parser` (#917) pulls in `openpgp` and `sshpk`; `jq-tester` (#1262)
needs `jq-wasm`; `stacktrace-prettier` (#1307) needs four stack-parsing libraries and a style store;
`json-linter` (#1015) and `docker-compose-to-docker-run-converter` (#847) need a Monaco editor
wrapper; `jwt-generator` (#1453) is written against `jose` v6 and `jwt-decode` v4.

### 10.2 Originally selected for porting

**Crypto** — #363 Argon2 · #1453 JWT generator + verify · #1141 File hasher · #1140 CRC calculator ·
#902 htpasswd generator · #1260 Passphrase generator · #1515 HOTP · #917 Certificate/key parser

**Text** — #1295 Unicode search · #1183 Text → Unicode names · #1182 Sensitive data masker ·
#1290 Smart text replacer · #1303 List comparison · #1021 Morse converter

**Converter** — #1002 JSON → TypeScript · #1166 JSON → JSON Schema · #1262 jq/JSONPath tester ·
#966 JSON escape/unescape · #943 JSON sorter · #904 HTML → Markdown · #1258 Punycode converter

**Development** — #1307 Stacktrace formatter · #961 HTML cleaner · #1452 Dockerfile linter ·
#1106 Markdown TOC generator

**Network** — #963 IPv6 subnet calculator · #871 CIDR → IP range · #869 IP range → CIDR ·
#959 URL cleaner · #1029 Port info search

**Date & time** (new category) — #1284 Timezone converter · #1324 Duration/interval calculator

**Measurement / Math** — #1330 Units converter · #1304 SLA computer

**Data** — #1320 Luhn checker · #1327 Countries / ISO 3166 searcher

**Fixes to existing tools** — #1774 figlet font path (the ASCII text drawer is currently broken) ·
#1085 text-to-binary non-ASCII · #1087 text-to-unicode non-BMP · #1152 bcrypt crash ·
#986 more hash algorithms · #1441 UUID v6/v7 · #1440 command-palette result cap

### 10.3 Deliberately excluded

- **#1811** — see §8.
- **#1819** — see §7.
- **#1574** — browser-side auth gate.
- Tools requiring a companion backend: OCR (#919, #1255), Potrace (#1167), currency rates (#1321),
  IP geolocation (#866), DNS-over-HTTPS (#1371), My IP (#1455).
- All 41 translation-only PRs and 23 dependency bumps.

---

## Appendix — all 327 open PRs

Newest first. Includes every bucket (features, translations, dependency bumps, CI, docs).

| PR | Title | Author | Opened |
|---|---|---|---|
| [#1841](https://github.com/CorentinTh/it-tools/pull/1841) | fix(ci): bump Playwright to 1.62.1 to support Ubuntu 24.04 runners | `bruno-b-martins` | 2026-08-08 |
| [#1840](https://github.com/CorentinTh/it-tools/pull/1840) | feat(xml-diff): add XML diff tool | `bruno-b-martins` | 2026-08-08 |
| [#1825](https://github.com/CorentinTh/it-tools/pull/1825) | italian traslate | `redenfire` | 2026-06-24 |
| [#1819](https://github.com/CorentinTh/it-tools/pull/1819) | feat: add REST API server + Docker containerization | `hutgrabber` | 2026-06-19 |
| [#1817](https://github.com/CorentinTh/it-tools/pull/1817) | feat(i18n): Korean translation | `moduvoice` | 2026-06-13 |
| [#1812](https://github.com/CorentinTh/it-tools/pull/1812) | feat: add X509 certificate generator tool | `XiaoMing0000` | 2026-06-09 |
| [#1811](https://github.com/CorentinTh/it-tools/pull/1811) | feat: add 5 new developer tools (cURL to Code, JSON to Types, HTML to Markdown, CSS/JS Prettify & Minify, Byte Unit Converter) | `stevenlee87` | 2026-06-04 |
| [#1810](https://github.com/CorentinTh/it-tools/pull/1810) | Add tool to generate Belgian national id. | `barticular` | 2026-06-03 |
| [#1807](https://github.com/CorentinTh/it-tools/pull/1807) | feat: add markdown table generator | `SSDWGG` | 2026-05-30 |
| [#1805](https://github.com/CorentinTh/it-tools/pull/1805) | Updated Ukrainian Localization | `OnyxOracle` | 2026-05-24 |
| [#1803](https://github.com/CorentinTh/it-tools/pull/1803) | add new tool markdown diff | `mazfreelance` | 2026-05-22 |
| [#1802](https://github.com/CorentinTh/it-tools/pull/1802) | fix: update vulnerable dependencies | `AhmadFaour9` | 2026-05-21 |
| [#1796](https://github.com/CorentinTh/it-tools/pull/1796) | fix: upgrade nginx base image to fix CVE-2026-42945 (CVSS 9.2 critical RCE) | `zethis` | 2026-05-14 |
| [#1795](https://github.com/CorentinTh/it-tools/pull/1795) | Add Russian localization | `gridgt` | 2026-05-14 |
| [#1786](https://github.com/CorentinTh/it-tools/pull/1786) | Add remove-audio.com - free browser-based audio remover | `iamcodemaster` | 2026-04-29 |
| [#1785](https://github.com/CorentinTh/it-tools/pull/1785) | chore(deps): update dependency country-code-lookup to v0.1.5 | `renovate` | 2026-04-27 |
| [#1784](https://github.com/CorentinTh/it-tools/pull/1784) | chore(deps): update dependency @types/ua-parser-js to v0.7.39 | `renovate` | 2026-04-27 |
| [#1781](https://github.com/CorentinTh/it-tools/pull/1781) | docs: fix minor grammatical typo in README | `rayrishu19-wq` | 2026-04-19 |
| [#1779](https://github.com/CorentinTh/it-tools/pull/1779) | feat: add Tip Calculator and Bill Splitter tool | `rayrishu19-wq` | 2026-04-17 |
| [#1774](https://github.com/CorentinTh/it-tools/pull/1774) | Fix fontPath URL in figlet defaults | `WalidDevIO` | 2026-04-09 |
| [#1769](https://github.com/CorentinTh/it-tools/pull/1769) | Revise French localization for developer tools | `DEL-R` | 2026-04-06 |
| [#1764](https://github.com/CorentinTh/it-tools/pull/1764) | fix(i18n): remove duplicate 'the' in About page | `nil957` | 2026-04-01 |
| [#1758](https://github.com/CorentinTh/it-tools/pull/1758) | chore(deps): update dependency @types/node-forge to v1.3.14 | `renovate` | 2026-03-27 |
| [#1757](https://github.com/CorentinTh/it-tools/pull/1757) | chore(deps): update dependency netmask to v2.1.1 | `renovate` | 2026-03-27 |
| [#1756](https://github.com/CorentinTh/it-tools/pull/1756) | chore(deps): replace dependency @tsconfig/node18 with @tsconfig/node20 | `renovate` | 2026-03-27 |
| [#1753](https://github.com/CorentinTh/it-tools/pull/1753) | added markdown preview feature | `ssrahul96` | 2026-03-17 |
| [#1740](https://github.com/CorentinTh/it-tools/pull/1740) | feat: add icon generator with preset-based resizing, ZIP export, and optional PWA manifest | `fclef819` | 2026-02-26 |
| [#1739](https://github.com/CorentinTh/it-tools/pull/1739) | feat(text-to-unicode): Support conversion for 'Unicode escape' format. | `pplulee` | 2026-02-26 |
| [#1737](https://github.com/CorentinTh/it-tools/pull/1737) | Fix #480: Dependency Dashboard | `kambrosgroup` | 2026-02-24 |
| [#1734](https://github.com/CorentinTh/it-tools/pull/1734) | chore(deps): update dependency markdown-it to v14.1.1 [security] | `renovate` | 2026-02-13 |
| [#1727](https://github.com/CorentinTh/it-tools/pull/1727) | Add Greek translation | `ktsourdinis` | 2026-02-05 |
| [#1716](https://github.com/CorentinTh/it-tools/pull/1716) | chore(deps): update dependency lodash to v4.18.1 [security] | `renovate` | 2026-01-22 |
| [#1712](https://github.com/CorentinTh/it-tools/pull/1712) | dev: add localization for Bahasa Indonesia | `WahyuFauzi` | 2026-01-14 |
| [#1702](https://github.com/CorentinTh/it-tools/pull/1702) | Add JavaScript Obfuscator tool to IT-Tools toolbox | `forzayt` | 2025-12-31 |
| [#1695](https://github.com/CorentinTh/it-tools/pull/1695) | feat(new tool): GZIP String converter. | `Oxrishabh` | 2025-12-19 |
| [#1690](https://github.com/CorentinTh/it-tools/pull/1690) | [fix]: figlet.defaults Path fixed | `LoveAndHope-dev` | 2025-12-11 |
| [#1685](https://github.com/CorentinTh/it-tools/pull/1685) | Slash removed from ASCII Art font URL | `JensFZ` | 2025-12-05 |
| [#1683](https://github.com/CorentinTh/it-tools/pull/1683) | feat(iban-generator): add IBAN generator tool | `KaTo3107` | 2025-12-04 |
| [#1681](https://github.com/CorentinTh/it-tools/pull/1681) | chore(deps): update dependency node-forge to v1.4.0 [security] | `renovate` | 2025-11-27 |
| [#1680](https://github.com/CorentinTh/it-tools/pull/1680) | chore(deps): update dependency zx to v8 [security] | `renovate` | 2025-11-21 |
| [#1679](https://github.com/CorentinTh/it-tools/pull/1679) | Added Azerbaijani and Turkish language support | `webmavie` | 2025-11-17 |
| [#1671](https://github.com/CorentinTh/it-tools/pull/1671) | zh | `WtecHtec` | 2025-11-02 |
| [#1670](https://github.com/CorentinTh/it-tools/pull/1670) | Make it possible to override nginx listen port in container | `p-m-j` | 2025-10-29 |
| [#1669](https://github.com/CorentinTh/it-tools/pull/1669) | 1668: JWT parser value editor | `Cereal916` | 2025-10-26 |
| [#1661](https://github.com/CorentinTh/it-tools/pull/1661) | Added Italian localization | `lucatorn` | 2025-10-04 |
| [#1651](https://github.com/CorentinTh/it-tools/pull/1651) | ASCII text drawer: robust font loading with HTTPS CDN fallback | `jasonwitty` | 2025-09-17 |
| [#1645](https://github.com/CorentinTh/it-tools/pull/1645) | Run Playwright test in container | `tobiasge` | 2025-09-04 |
| [#1644](https://github.com/CorentinTh/it-tools/pull/1644) | chore(deps): update dependency @types/mime-types to v2.1.4 | `renovate` | 2025-09-04 |
| [#1643](https://github.com/CorentinTh/it-tools/pull/1643) | feat(json-viewer): add auto-unescape functionality for escaped JSON string | `iyuq` | 2025-09-02 |
| [#1640](https://github.com/CorentinTh/it-tools/pull/1640) | fix(issues): fix textarea always grows | `mbienhuels` | 2025-08-27 |
| [#1637](https://github.com/CorentinTh/it-tools/pull/1637) | Placeholder of search field moved to localization file | `VolgaIgor` | 2025-08-26 |
| [#1629](https://github.com/CorentinTh/it-tools/pull/1629) | fix(locales): correcting word tools in language pt | `wallacecosta` | 2025-08-13 |
| [#1626](https://github.com/CorentinTh/it-tools/pull/1626) | feat(tools): add conventional commits cheatsheet tool | `iesoftwaredeveloper` | 2025-08-07 |
| [#1612](https://github.com/CorentinTh/it-tools/pull/1612) | Update | `Justman100` | 2025-07-12 |
| [#1604](https://github.com/CorentinTh/it-tools/pull/1604) | feat(locales): add Korean localization file with translations | `donggu-kang` | 2025-07-01 |
| [#1603](https://github.com/CorentinTh/it-tools/pull/1603) | feat(i18n): added uzbek language | `azabroflovski` | 2025-06-30 |
| [#1602](https://github.com/CorentinTh/it-tools/pull/1602) | New tool: CLI command editor | `tars-a` | 2025-06-28 |
| [#1585](https://github.com/CorentinTh/it-tools/pull/1585) | refactor(ui): add AES CBC/GCM mode selection and IV handling in encryption.vue | `jbraconig` | 2025-05-31 |
| [#1579](https://github.com/CorentinTh/it-tools/pull/1579) | chore(i18n): update zh.yml with new translations | `PM25OO` | 2025-05-14 |
| [#1574](https://github.com/CorentinTh/it-tools/pull/1574) | Add a login token so that it is possible to control and allow only some users to use it. | `pq-dong` | 2025-05-06 |
| [#1563](https://github.com/CorentinTh/it-tools/pull/1563) | feat(new tool): Mermaid exporter | `dani-b-g` | 2025-04-11 |
| [#1559](https://github.com/CorentinTh/it-tools/pull/1559) | fix bug:#1546 | `iodeal` | 2025-04-10 |
| [#1549](https://github.com/CorentinTh/it-tools/pull/1549) | [WIP] Adding Turkish Translation | `cilginc` | 2025-04-03 |
| [#1547](https://github.com/CorentinTh/it-tools/pull/1547) | Fix input-text size issues | `aivelon` | 2025-04-02 |
| [#1545](https://github.com/CorentinTh/it-tools/pull/1545) | fix(input-text): increase vertical padding for improved layout | `ariqpradipa` | 2025-03-26 |
| [#1542](https://github.com/CorentinTh/it-tools/pull/1542) | add unescape unicode in JSON Prettify | `zxfishhack` | 2025-03-25 |
| [#1539](https://github.com/CorentinTh/it-tools/pull/1539) | feat(json-viewer): add json repair option | `imposibrus` | 2025-03-22 |
| [#1534](https://github.com/CorentinTh/it-tools/pull/1534) | add Chinese characters convert to unicode and utf-8 | `liyuanlin` | 2025-03-10 |
| [#1532](https://github.com/CorentinTh/it-tools/pull/1532) | feat(new tools): Dice Roller, Cin Flipper, Card Picker and Fortune Wheel | `sharevb` | 2025-03-09 |
| [#1531](https://github.com/CorentinTh/it-tools/pull/1531) | feat(new tool): HAR file sanitizer | `sharevb` | 2025-03-09 |
| [#1530](https://github.com/CorentinTh/it-tools/pull/1530) | feat(new tool): Hex Converter | `sharevb` | 2025-03-09 |
| [#1529](https://github.com/CorentinTh/it-tools/pull/1529) | feat(new tool): Parquet File Reader | `sharevb` | 2025-03-09 |
| [#1525](https://github.com/CorentinTh/it-tools/pull/1525) | feat(new tool): Base64 Hex Converter | `sharevb` | 2025-03-02 |
| [#1524](https://github.com/CorentinTh/it-tools/pull/1524) | feat(new tool): SharePoint Url Decoder | `sharevb` | 2025-03-02 |
| [#1523](https://github.com/CorentinTh/it-tools/pull/1523) | feat(new tools): IES Guidelines and Illuminance converter | `sharevb` | 2025-03-02 |
| [#1518](https://github.com/CorentinTh/it-tools/pull/1518) | Add link to TrueNAS IT-Tools app | `tekenstam` | 2025-02-27 |
| [#1515](https://github.com/CorentinTh/it-tools/pull/1515) | Hotp HMAC or event-based one time passwords | `SimonHaas` | 2025-02-25 |
| [#1510](https://github.com/CorentinTh/it-tools/pull/1510) | Fix the bug related to the text input been to small when the icon is not present in the input | `leamsigc` | 2025-02-21 |
| [#1507](https://github.com/CorentinTh/it-tools/pull/1507) | Add ko_KR Korean local | `Bogyie` | 2025-02-21 |
| [#1504](https://github.com/CorentinTh/it-tools/pull/1504) | chore(deps): update dependency @types/jsdom to v21.1.7 | `renovate` | 2025-02-19 |
| [#1499](https://github.com/CorentinTh/it-tools/pull/1499) | use nginx-unpriviledged | `ombre8` | 2025-02-14 |
| [#1491](https://github.com/CorentinTh/it-tools/pull/1491) | fix(Temperature Converter): don't round to 2 digits | `sharevb` | 2025-02-05 |
| [#1479](https://github.com/CorentinTh/it-tools/pull/1479) | added WPA2/WPA3 and WPA3 only. | `derekcentrico` | 2025-01-29 |
| [#1474](https://github.com/CorentinTh/it-tools/pull/1474) | feat(Url Encoder): enhance encoding options | `sharevb` | 2025-01-26 |
| [#1469](https://github.com/CorentinTh/it-tools/pull/1469) | Add zh-TW Traditional Chinese locale | `PeterDaveHello` | 2025-01-24 |
| [#1465](https://github.com/CorentinTh/it-tools/pull/1465) | Add ipv6 support | `AndersBallegaard` | 2025-01-23 |
| [#1463](https://github.com/CorentinTh/it-tools/pull/1463) | feat(new tool): ObjectId generator and parser | `davidporos92` | 2025-01-21 |
| [#1461](https://github.com/CorentinTh/it-tools/pull/1461) | Update pt.yml | `agails` | 2025-01-20 |
| [#1457](https://github.com/CorentinTh/it-tools/pull/1457) | feat(new tool): OVH X-VR-SPAMCAUSE Decoder | `sharevb` | 2025-01-12 |
| [#1456](https://github.com/CorentinTh/it-tools/pull/1456) | feat(new tool): Geo Distance Computer | `sharevb` | 2025-01-12 |
| [#1455](https://github.com/CorentinTh/it-tools/pull/1455) | feat(new tool): My IP Address | `sharevb` | 2025-01-12 |
| [#1454](https://github.com/CorentinTh/it-tools/pull/1454) | feat(new tool): GPT Token Counter | `sharevb` | 2025-01-12 |
| [#1453](https://github.com/CorentinTh/it-tools/pull/1453) | feat(new tool): JWT Generator and Signature verification | `sharevb` | 2025-01-12 |
| [#1452](https://github.com/CorentinTh/it-tools/pull/1452) | feat(new tool): Dockerfile Linter | `sharevb` | 2025-01-12 |
| [#1451](https://github.com/CorentinTh/it-tools/pull/1451) | feat(new tool): IP Subnet Exclude Calculator | `sharevb` | 2025-01-12 |
| [#1443](https://github.com/CorentinTh/it-tools/pull/1443) | Project-perf | `jincandev` | 2025-01-04 |
| [#1441](https://github.com/CorentinTh/it-tools/pull/1441) | feat(UUID Generator): add v6 and v7 versions | `sharevb` | 2025-01-01 |
| [#1440](https://github.com/CorentinTh/it-tools/pull/1440) | fix(Search tools): show more tools | `sharevb` | 2025-01-01 |
| [#1439](https://github.com/CorentinTh/it-tools/pull/1439) | WiFi QR Code - allow to copy the text | `ekamil` | 2024-12-30 |
| [#1434](https://github.com/CorentinTh/it-tools/pull/1434) | fix(yaml-viewer): prevent large integers from being converted to expo… | `Link1515` | 2024-12-26 |
| [#1426](https://github.com/CorentinTh/it-tools/pull/1426) | feat(devcontainer): Adds Dev Container configuration (#1393) | `cr2007` | 2024-12-16 |
| [#1423](https://github.com/CorentinTh/it-tools/pull/1423) | chore(deps): update dependency @types/bcryptjs to v2.4.6 | `renovate` | 2024-12-14 |
| [#1412](https://github.com/CorentinTh/it-tools/pull/1412) | chore(deps): update dependency @tsconfig/node18 to v18.2.6 | `renovate` | 2024-12-09 |
| [#1409](https://github.com/CorentinTh/it-tools/pull/1409) | feat(i18n): added russian language support | `goodm2ice` | 2024-12-04 |
| [#1407](https://github.com/CorentinTh/it-tools/pull/1407) | chore(deps): update dependency vue-i18n to v9.14.5 [security] | `renovate` | 2024-12-02 |
| [#1394](https://github.com/CorentinTh/it-tools/pull/1394) | Add Helm Chart Deploy | `wenyang0` | 2024-11-20 |
| [#1391](https://github.com/CorentinTh/it-tools/pull/1391) | fix(regex tester): optional groups/captures failing | `sharevb` | 2024-11-17 |
| [#1385](https://github.com/CorentinTh/it-tools/pull/1385) | feat(device-information) Time zone information | `maurizuki` | 2024-11-09 |
| [#1378](https://github.com/CorentinTh/it-tools/pull/1378) | docs(zh-hant): initialize traditional chinese translation | `rockleona` | 2024-10-29 |
| [#1372](https://github.com/CorentinTh/it-tools/pull/1372) | feat(new tool); Energy Expense Computer | `sharevb` | 2024-10-26 |
| [#1371](https://github.com/CorentinTh/it-tools/pull/1371) | feat(new tool): DNS query (over HTTPS) | `sharevb` | 2024-10-26 |
| [#1348](https://github.com/CorentinTh/it-tools/pull/1348) | feat(new tool) Floating Point Number Converter | `Rapha149` | 2024-10-16 |
| [#1340](https://github.com/CorentinTh/it-tools/pull/1340) | feat(new tool) Microphone tester | `gornvan` | 2024-10-09 |
| [#1336](https://github.com/CorentinTh/it-tools/pull/1336) | feat(new tool): Week Numbers Converter | `sharevb` | 2024-10-06 |
| [#1331](https://github.com/CorentinTh/it-tools/pull/1331) | feat(new tools): iCal Generator/Merger/Parser | `sharevb` | 2024-10-02 |
| [#1330](https://github.com/CorentinTh/it-tools/pull/1330) | feat(new tools): Units Converter | `sharevb` | 2024-10-02 |
| [#1329](https://github.com/CorentinTh/it-tools/pull/1329) | feat(new tool): VAT Number Validator | `sharevb` | 2024-10-02 |
| [#1328](https://github.com/CorentinTh/it-tools/pull/1328) | feat(new tool): Images Formats Converter | `sharevb` | 2024-10-02 |
| [#1327](https://github.com/CorentinTh/it-tools/pull/1327) | feat(new tool): Countries/ISO 3166 Searcher | `sharevb` | 2024-10-02 |
| [#1326](https://github.com/CorentinTh/it-tools/pull/1326) | fix(wifi-qr-code-generator) Add WPA3 to the WPA labels | `asheliahut` | 2024-10-01 |
| [#1324](https://github.com/CorentinTh/it-tools/pull/1324) | feat(new tool): Duration, Date+Duration, Days Interval Calculator | `sharevb` | 2024-09-28 |
| [#1323](https://github.com/CorentinTh/it-tools/pull/1323) | feat(new tool): JSON Size Analyzer | `sharevb` | 2024-09-28 |
| [#1322](https://github.com/CorentinTh/it-tools/pull/1322) | feat(new tool): Smart Raw Error Converter | `sharevb` | 2024-09-28 |
| [#1321](https://github.com/CorentinTh/it-tools/pull/1321) | feat(new tool): Currency Converter | `sharevb` | 2024-09-28 |
| [#1320](https://github.com/CorentinTh/it-tools/pull/1320) | feat(new tool): Luhn Checker | `sharevb` | 2024-09-28 |
| [#1319](https://github.com/CorentinTh/it-tools/pull/1319) | feat(new tool): Code Highlighter | `sharevb` | 2024-09-28 |
| [#1318](https://github.com/CorentinTh/it-tools/pull/1318) | feat(Html WYSYWIG): add colors and tables | `sharevb` | 2024-09-28 |
| [#1311](https://github.com/CorentinTh/it-tools/pull/1311) | chore(deps): update dependency vite to v6 [security] | `renovate` | 2024-09-25 |
| [#1307](https://github.com/CorentinTh/it-tools/pull/1307) | feat(new tool): Stacktrace Formatter | `sharevb` | 2024-09-22 |
| [#1306](https://github.com/CorentinTh/it-tools/pull/1306) | feat(new tool): SSL Certificate Converter | `sharevb` | 2024-09-22 |
| [#1305](https://github.com/CorentinTh/it-tools/pull/1305) | feat(new tool): Bounce Email Parser | `sharevb` | 2024-09-22 |
| [#1304](https://github.com/CorentinTh/it-tools/pull/1304) | feat(new tool): SLA Computer | `sharevb` | 2024-09-22 |
| [#1303](https://github.com/CorentinTh/it-tools/pull/1303) | feat(new tool): List Comparaison | `sharevb` | 2024-09-22 |
| [#1302](https://github.com/CorentinTh/it-tools/pull/1302) | feat(List Converter): remove prefix/suffix capability, split, sort | `sharevb` | 2024-09-21 |
| [#1298](https://github.com/CorentinTh/it-tools/pull/1298) | Add docker compose self host | `daisukebtw` | 2024-09-19 |
| [#1296](https://github.com/CorentinTh/it-tools/pull/1296) | chore(deps): update dependency dompurify to v3.4.0 [security] | `renovate` | 2024-09-16 |
| [#1295](https://github.com/CorentinTh/it-tools/pull/1295) | feat(new tool): Unicode Search | `sharevb` | 2024-09-14 |
| [#1290](https://github.com/CorentinTh/it-tools/pull/1290) | feat(new tool): Smart Text Replacer and LineBreaks manager | `sharevb` | 2024-09-11 |
| [#1289](https://github.com/CorentinTh/it-tools/pull/1289) | feat(new tools): Data Storage/Transfer Units Converter | `sharevb` | 2024-09-11 |
| [#1288](https://github.com/CorentinTh/it-tools/pull/1288) | fix: add No Sort option | `sharevb` | 2024-09-11 |
| [#1287](https://github.com/CorentinTh/it-tools/pull/1287) | feat(new tool): Border Generator CSS | `4DRIAN0RTIZ` | 2024-09-07 |
| [#1284](https://github.com/CorentinTh/it-tools/pull/1284) | feat(new tool): Timezone Converter | `sharevb` | 2024-09-06 |
| [#1283](https://github.com/CorentinTh/it-tools/pull/1283) | Crontab：add show crontab next 5 execution times | `louyongjiu` | 2024-09-06 |
| [#1282](https://github.com/CorentinTh/it-tools/pull/1282) | ci: add a workflow to tag PR with merge conflicts | `sharevb` | 2024-09-04 |
| [#1278](https://github.com/CorentinTh/it-tools/pull/1278) | feat(new tool): WebSocket Tester | `sharevb` | 2024-09-01 |
| [#1277](https://github.com/CorentinTh/it-tools/pull/1277) | fix(json-to-csv): handle single object and flatten | `sharevb` | 2024-09-01 |
| [#1276](https://github.com/CorentinTh/it-tools/pull/1276) | feat(new tool): ICO <> PNG Converter | `sharevb` | 2024-09-01 |
| [#1269](https://github.com/CorentinTh/it-tools/pull/1269) | Added Dutch language support | `deffcolony` | 2024-08-26 |
| [#1268](https://github.com/CorentinTh/it-tools/pull/1268) | Update docker-run-to-docker-compose-converter.vue | `pricootz` | 2024-08-25 |
| [#1266](https://github.com/CorentinTh/it-tools/pull/1266) | feat(new tool): AI Prompt Splitter | `sharevb` | 2024-08-23 |
| [#1265](https://github.com/CorentinTh/it-tools/pull/1265) | feat(new tool): Color Wheel | `sharevb` | 2024-08-23 |
| [#1264](https://github.com/CorentinTh/it-tools/pull/1264) | feat(new tool): Integers to IP | `sharevb` | 2024-08-23 |
| [#1263](https://github.com/CorentinTh/it-tools/pull/1263) | feat(new tool): Hex File Converter | `sharevb` | 2024-08-23 |
| [#1262](https://github.com/CorentinTh/it-tools/pull/1262) | feat(new tool): jq/JSONPath tester | `sharevb` | 2024-08-23 |
| [#1261](https://github.com/CorentinTh/it-tools/pull/1261) | feat(new tool): PIN Code Generator | `sharevb` | 2024-08-23 |
| [#1260](https://github.com/CorentinTh/it-tools/pull/1260) | feat(new tool): Passphrase Generator | `sharevb` | 2024-08-23 |
| [#1259](https://github.com/CorentinTh/it-tools/pull/1259) | feat(new tool): WPA PSK Raw Key Generator | `sharevb` | 2024-08-23 |
| [#1258](https://github.com/CorentinTh/it-tools/pull/1258) | feat(new tool): Punycode Converter | `sharevb` | 2024-08-23 |
| [#1257](https://github.com/CorentinTh/it-tools/pull/1257) | feat(new tool): XPath tester | `sharevb` | 2024-08-23 |
| [#1256](https://github.com/CorentinTh/it-tools/pull/1256) | feat(new tool): CSS <> XPath converter | `sharevb` | 2024-08-23 |
| [#1255](https://github.com/CorentinTh/it-tools/pull/1255) | feat(new tool): Math OCR to Latex | `sharevb` | 2024-08-23 |
| [#1254](https://github.com/CorentinTh/it-tools/pull/1254) | feat(new tool): Email Parser and Outlook MSG Parser | `sharevb` | 2024-08-23 |
| [#1247](https://github.com/CorentinTh/it-tools/pull/1247) | Added Turkish language support | `ieski` | 2024-08-16 |
| [#1246](https://github.com/CorentinTh/it-tools/pull/1246) | feat(new tool): JSON to object | `micash545` | 2024-08-16 |
| [#1233](https://github.com/CorentinTh/it-tools/pull/1233) | feat(new tool): Mongo ObjectId DateTime Converter | `sharevb` | 2024-08-09 |
| [#1232](https://github.com/CorentinTh/it-tools/pull/1232) | feat(Slugify): add separator option | `sharevb` | 2024-08-09 |
| [#1230](https://github.com/CorentinTh/it-tools/pull/1230) | feat(new tool): Paste as Markdown | `sharevb` | 2024-08-09 |
| [#1229](https://github.com/CorentinTh/it-tools/pull/1229) | feat(new tool): Exif Remover | `sharevb` | 2024-08-09 |
| [#1221](https://github.com/CorentinTh/it-tools/pull/1221) | fix(OTP Generator): add query and storage for secret | `sharevb` | 2024-08-04 |
| [#1218](https://github.com/CorentinTh/it-tools/pull/1218) | feat(new tool): Raid Calculator | `robweber` | 2024-07-30 |
| [#1211](https://github.com/CorentinTh/it-tools/pull/1211) | feat(new tool): Snowflake ID extractor | `antegral` | 2024-07-22 |
| [#1209](https://github.com/CorentinTh/it-tools/pull/1209) | feature: Supports reading language from environment variables | `1013461195` | 2024-07-17 |
| [#1204](https://github.com/CorentinTh/it-tools/pull/1204) | Add branches to Git cheatsheet | `teyhouse` | 2024-07-14 |
| [#1201](https://github.com/CorentinTh/it-tools/pull/1201) | feat(new tool): Torrent To Magnet and parser | `sharevb` | 2024-07-12 |
| [#1200](https://github.com/CorentinTh/it-tools/pull/1200) | feat(new tool): XSLT Tester | `sharevb` | 2024-07-12 |
| [#1192](https://github.com/CorentinTh/it-tools/pull/1192) | add new tools json-to-java entity | `lemon8866` | 2024-07-03 |
| [#1189](https://github.com/CorentinTh/it-tools/pull/1189) | feat(i18n): add Danish translation | `LovelessCodes` | 2024-06-28 |
| [#1186](https://github.com/CorentinTh/it-tools/pull/1186) | feat: Display a footer/list of npm packages per tool | `sharevb` | 2024-06-26 |
| [#1185](https://github.com/CorentinTh/it-tools/pull/1185) | feat(new tool): Common Regex Memo | `sharevb` | 2024-06-26 |
| [#1184](https://github.com/CorentinTh/it-tools/pull/1184) | feat(Lorem Ipsum Generator): generate multi language/script | `sharevb` | 2024-06-26 |
| [#1183](https://github.com/CorentinTh/it-tools/pull/1183) | feat(new tool): text to unicode names | `sharevb` | 2024-06-26 |
| [#1182](https://github.com/CorentinTh/it-tools/pull/1182) | feat(new tool): Sensitive data masker | `sharevb` | 2024-06-26 |
| [#1178](https://github.com/CorentinTh/it-tools/pull/1178) | fix(i18n): Make rest of the tools translatable and translate them to German | `steffenrapp` | 2024-06-21 |
| [#1177](https://github.com/CorentinTh/it-tools/pull/1177) | Complete spanish language | `IcarusTheFly` | 2024-06-21 |
| [#1171](https://github.com/CorentinTh/it-tools/pull/1171) | feat(new tool): curl converter | `sharevb` | 2024-06-16 |
| [#1170](https://github.com/CorentinTh/it-tools/pull/1170) | feat: test that all tools are loading | `sharevb` | 2024-06-16 |
| [#1169](https://github.com/CorentinTh/it-tools/pull/1169) | Add Format Transformer download option | `sharevb` | 2024-06-16 |
| [#1168](https://github.com/CorentinTh/it-tools/pull/1168) | feat(New tool): API Tester | `sharevb` | 2024-06-16 |
| [#1167](https://github.com/CorentinTh/it-tools/pull/1167) | feat(new tool): Potrace | `sharevb` | 2024-06-16 |
| [#1166](https://github.com/CorentinTh/it-tools/pull/1166) | feat(new tool): JSON To Schema | `sharevb` | 2024-06-16 |
| [#1165](https://github.com/CorentinTh/it-tools/pull/1165) | feat(New tool): Image to CSS | `sharevb` | 2024-06-16 |
| [#1157](https://github.com/CorentinTh/it-tools/pull/1157) | add keyencoding support for encryption | `liudonghua123` | 2024-06-13 |
| [#1156](https://github.com/CorentinTh/it-tools/pull/1156) | feat: add key encoding (text or hex string) for hmac | `liudonghua123` | 2024-06-13 |
| [#1155](https://github.com/CorentinTh/it-tools/pull/1155) | feat(i18n): added Italian translation | `UserRoot-Luca` | 2024-06-12 |
| [#1153](https://github.com/CorentinTh/it-tools/pull/1153) | Temperature limits | `dyuri` | 2024-06-11 |
| [#1152](https://github.com/CorentinTh/it-tools/pull/1152) | fix(bcrypt tool): Fix bcrypt error states and crashes (#1133) | `lionel-rowe` | 2024-06-07 |
| [#1149](https://github.com/CorentinTh/it-tools/pull/1149) | UUIDv7 generator | `nghduc97` | 2024-06-06 |
| [#1147](https://github.com/CorentinTh/it-tools/pull/1147) | feat: add paste file feature for base64 file converter | `liudonghua123` | 2024-06-06 |
| [#1141](https://github.com/CorentinTh/it-tools/pull/1141) | feat(new tool): File Hasher | `sharevb` | 2024-06-01 |
| [#1140](https://github.com/CorentinTh/it-tools/pull/1140) | feat(new tool): CRC calculator | `sharevb` | 2024-06-01 |
| [#1138](https://github.com/CorentinTh/it-tools/pull/1138) | feat(new tool): nanoid generator | `albertasaftei00` | 2024-05-31 |
| [#1128](https://github.com/CorentinTh/it-tools/pull/1128) | Add Traditional Chinese Language Selection | `jasoncheng7115` | 2024-05-26 |
| [#1127](https://github.com/CorentinTh/it-tools/pull/1127) | Add Traditional Chinese Language Translation | `jasoncheng7115` | 2024-05-26 |
| [#1108](https://github.com/CorentinTh/it-tools/pull/1108) | feat(new tool): rsa/ecdsa signing and verify | `sharevb` | 2024-05-18 |
| [#1107](https://github.com/CorentinTh/it-tools/pull/1107) | fix(Phone Parser): store country prefix and whatsapp/sms send links | `sharevb` | 2024-05-18 |
| [#1106](https://github.com/CorentinTh/it-tools/pull/1106) | feat(new tool): Markdown TOC Generator | `sharevb` | 2024-05-18 |
| [#1105](https://github.com/CorentinTh/it-tools/pull/1105) | feat(new tools): JSON to PHP Array and reverse | `sharevb` | 2024-05-18 |
| [#1104](https://github.com/CorentinTh/it-tools/pull/1104) | fix(QR Code Generator): many enhancements | `sharevb` | 2024-05-18 |
| [#1103](https://github.com/CorentinTh/it-tools/pull/1103) | feat(new tool): JSON Editor | `sharevb` | 2024-05-18 |
| [#1102](https://github.com/CorentinTh/it-tools/pull/1102) | feat(new tool): JSON to C# | `sharevb` | 2024-05-18 |
| [#1101](https://github.com/CorentinTh/it-tools/pull/1101) | feat(new tool): Math Formula format converter | `sharevb` | 2024-05-18 |
| [#1100](https://github.com/CorentinTh/it-tools/pull/1100) | feat(new tools): Barcode Reader and Generator | `sharevb` | 2024-05-18 |
| [#1099](https://github.com/CorentinTh/it-tools/pull/1099) | feat(new tool): JS Unobfuscator | `sharevb` | 2024-05-18 |
| [#1094](https://github.com/CorentinTh/it-tools/pull/1094) | feat(new tool): unicode to java entities | `ng-anhhtuann` | 2024-05-16 |
| [#1087](https://github.com/CorentinTh/it-tools/pull/1087) | fix(text-to-unicode): handle non-BMP + more conversion options | `lionel-rowe` | 2024-05-14 |
| [#1085](https://github.com/CorentinTh/it-tools/pull/1085) | fix(text-to-binary): return valid UTF-8 results for non-ASCII text | `lionel-rowe` | 2024-05-14 |
| [#1075](https://github.com/CorentinTh/it-tools/pull/1075) | feat(new tool): Text extractor form HTML | `dany-eduard` | 2024-05-13 |
| [#1064](https://github.com/CorentinTh/it-tools/pull/1064) | fix(uuid-generator): prevent textarea height increase on refresh | `praneethravuri` | 2024-05-11 |
| [#1050](https://github.com/CorentinTh/it-tools/pull/1050) | Italian tranlation | `Silimim` | 2024-05-10 |
| [#1033](https://github.com/CorentinTh/it-tools/pull/1033) | feat(new tool): TTL Calculator | `sharevb` | 2024-05-01 |
| [#1032](https://github.com/CorentinTh/it-tools/pull/1032) | feat(new tool): RMB Uppercase Converter | `sharevb` | 2024-05-01 |
| [#1031](https://github.com/CorentinTh/it-tools/pull/1031) | feat(new tool): Json to Go | `sharevb` | 2024-05-01 |
| [#1029](https://github.com/CorentinTh/it-tools/pull/1029) | feat(new tool): Port Info Search | `sharevb` | 2024-05-01 |
| [#1028](https://github.com/CorentinTh/it-tools/pull/1028) | feat(new tool): nano cheatsheet | `sharevb` | 2024-05-01 |
| [#1027](https://github.com/CorentinTh/it-tools/pull/1027) | feat(new tool): ECDSA Keygen | `sharevb` | 2024-05-01 |
| [#1026](https://github.com/CorentinTh/it-tools/pull/1026) | fix(Cron Parser): handle aws, next executions and TZ | `sharevb` | 2024-05-01 |
| [#1022](https://github.com/CorentinTh/it-tools/pull/1022) | feat(new tool): HDD Size Calculator | `sharevb` | 2024-04-28 |
| [#1021](https://github.com/CorentinTh/it-tools/pull/1021) | feat(new tool): Morse converter | `sharevb` | 2024-04-28 |
| [#1020](https://github.com/CorentinTh/it-tools/pull/1020) | feat(new tool): Folder Tree Diagram | `sharevb` | 2024-04-28 |
| [#1019](https://github.com/CorentinTh/it-tools/pull/1019) | feat(new tool): Markdown Editor | `sharevb` | 2024-04-28 |
| [#1018](https://github.com/CorentinTh/it-tools/pull/1018) | feat(new tool): HEIC Converter | `sharevb` | 2024-04-28 |
| [#1017](https://github.com/CorentinTh/it-tools/pull/1017) | feat(Color Converter): Many enhancements | `sharevb` | 2024-04-28 |
| [#1016](https://github.com/CorentinTh/it-tools/pull/1016) | feat(new tool): File Type Identifier | `sharevb` | 2024-04-28 |
| [#1015](https://github.com/CorentinTh/it-tools/pull/1015) | feat(new tool): JSON Linter | `sharevb` | 2024-04-28 |
| [#1014](https://github.com/CorentinTh/it-tools/pull/1014) | feat(new tool): Nginx Config File formatter | `sharevb` | 2024-04-28 |
| [#1013](https://github.com/CorentinTh/it-tools/pull/1013) | feat(new tool): RSA Encryption | `sharevb` | 2024-04-28 |
| [#1012](https://github.com/CorentinTh/it-tools/pull/1012) | feat(new tool): PGP Keygen | `sharevb` | 2024-04-28 |
| [#1011](https://github.com/CorentinTh/it-tools/pull/1011) | feat(new tool): PGP Encryption | `sharevb` | 2024-04-28 |
| [#1010](https://github.com/CorentinTh/it-tools/pull/1010) | feat(Text Statistics): add more stats | `sharevb` | 2024-04-28 |
| [#1006](https://github.com/CorentinTh/it-tools/pull/1006) | Escapp patch 1 | `escapp` | 2024-04-25 |
| [#1003](https://github.com/CorentinTh/it-tools/pull/1003) | chore: remove Vue.vscode-typescript-vue-plugin | `Chanzhaoyu` | 2024-04-25 |
| [#1002](https://github.com/CorentinTh/it-tools/pull/1002) | feat(new tool): Json to typescript interface | `Chanzhaoyu` | 2024-04-25 |
| [#1000](https://github.com/CorentinTh/it-tools/pull/1000) | Patch 2 | `IronWillDevops` | 2024-04-24 |
| [#994](https://github.com/CorentinTh/it-tools/pull/994) | feat(new tool): Unicode Formatter | `sharevb` | 2024-04-20 |
| [#993](https://github.com/CorentinTh/it-tools/pull/993) | feat(new tool): IPv4/6/CIDR/Range in CIDR/IP Range | `sharevb` | 2024-04-20 |
| [#992](https://github.com/CorentinTh/it-tools/pull/992) | remove unnecessary semicolon | `zhu0823` | 2024-04-19 |
| [#986](https://github.com/CorentinTh/it-tools/pull/986) | feat(Hash Text): more hashing methods | `sharevb` | 2024-04-14 |
| [#985](https://github.com/CorentinTh/it-tools/pull/985) | feat(new-tool): add SIP authentication | `jingzhaoyang` | 2024-04-13 |
| [#984](https://github.com/CorentinTh/it-tools/pull/984) | feat: add date difference calculator UI for issue #971 | `utf26` | 2024-04-12 |
| [#978](https://github.com/CorentinTh/it-tools/pull/978) | feat(i18n): added turkish language | `hasanbeder` | 2024-04-10 |
| [#976](https://github.com/CorentinTh/it-tools/pull/976) | feat: add smart text replacer, resolves #616 | `utf26` | 2024-04-07 |
| [#970](https://github.com/CorentinTh/it-tools/pull/970) | feat(new tool): PDF Encrypt | `sharevb` | 2024-04-03 |
| [#969](https://github.com/CorentinTh/it-tools/pull/969) | feat(IPv4 Subnet/Address Calculator): add more ip info | `sharevb` | 2024-04-03 |
| [#968](https://github.com/CorentinTh/it-tools/pull/968) | feat(new tool): PDF Linearizer | `sharevb` | 2024-04-03 |
| [#967](https://github.com/CorentinTh/it-tools/pull/967) | fix(PDF Signature Checker): fix reading problem | `sharevb` | 2024-04-03 |
| [#966](https://github.com/CorentinTh/it-tools/pull/966) | feat(new tool): JSON Escape/Unescape | `sharevb` | 2024-04-03 |
| [#965](https://github.com/CorentinTh/it-tools/pull/965) | feat(new tool): Docker Compose Validator | `sharevb` | 2024-04-03 |
| [#964](https://github.com/CorentinTh/it-tools/pull/964) | feat(Chmod Calculator): octal input, symbolic input and special flags | `sharevb` | 2024-04-03 |
| [#963](https://github.com/CorentinTh/it-tools/pull/963) | feat(new tool): IPv6 Subnet Calculator | `sharevb` | 2024-04-03 |
| [#962](https://github.com/CorentinTh/it-tools/pull/962) | feat(new tool): UTM URL Generator | `sharevb` | 2024-04-03 |
| [#961](https://github.com/CorentinTh/it-tools/pull/961) | feat(new tool): html cleaner | `sharevb` | 2024-04-03 |
| [#960](https://github.com/CorentinTh/it-tools/pull/960) | feat(ASCII Art Generator): add output for coding languages | `sharevb` | 2024-04-03 |
| [#959](https://github.com/CorentinTh/it-tools/pull/959) | feat(new tool): URL Cleaner | `sharevb` | 2024-04-03 |
| [#958](https://github.com/CorentinTh/it-tools/pull/958) | feat(new tool): HTML/CSS/JS Prettiers | `sharevb` | 2024-04-03 |
| [#957](https://github.com/CorentinTh/it-tools/pull/957) | feat(Yaml Viewer): add parsing validation | `sharevb` | 2024-04-03 |
| [#956](https://github.com/CorentinTh/it-tools/pull/956) | feat(Text to NATO): add other languages, upper/lower and other | `sharevb` | 2024-04-03 |
| [#955](https://github.com/CorentinTh/it-tools/pull/955) | feat(new tool): Markdown Cheatsheet | `sharevb` | 2024-04-03 |
| [#954](https://github.com/CorentinTh/it-tools/pull/954) | feat(new tool): Option 43 DHCP Generator | `sharevb` | 2024-04-03 |
| [#953](https://github.com/CorentinTh/it-tools/pull/953) | feat(new tool): Image to ASCII Art | `sharevb` | 2024-04-03 |
| [#952](https://github.com/CorentinTh/it-tools/pull/952) | feat: Add Text-Case Transformer functionality | `utf26` | 2024-04-02 |
| [#948](https://github.com/CorentinTh/it-tools/pull/948) | feat: Implement data storage unit conversion functionality (#848) | `utf26` | 2024-03-30 |
| [#947](https://github.com/CorentinTh/it-tools/pull/947) | feat: Implement JS Object to JSON Converter (#849) | `utf26` | 2024-03-29 |
| [#944](https://github.com/CorentinTh/it-tools/pull/944) | feat: Implement IPv6 subnet calculator for issue #924 | `utf26` | 2024-03-28 |
| [#943](https://github.com/CorentinTh/it-tools/pull/943) | feat(new tool): Implement JSON sorter, addressing issue #941 | `utf26` | 2024-03-27 |
| [#933](https://github.com/CorentinTh/it-tools/pull/933) | feat(new tool): Software Licenses Compatibility and infos | `sharevb` | 2024-03-10 |
| [#932](https://github.com/CorentinTh/it-tools/pull/932) | feat(new tool): Url Defanger/Fanger | `sharevb` | 2024-03-10 |
| [#931](https://github.com/CorentinTh/it-tools/pull/931) | feat(new tool): Pdf Unlocker | `sharevb` | 2024-03-10 |
| [#930](https://github.com/CorentinTh/it-tools/pull/930) | feat(new tool): MIME Encoder/Decoder | `sharevb` | 2024-03-10 |
| [#929](https://github.com/CorentinTh/it-tools/pull/929) | feat(new tool): GZIP String converter | `sharevb` | 2024-03-10 |
| [#927](https://github.com/CorentinTh/it-tools/pull/927) | feat(new-Translate)--ADD-Traditional-Chinese | `t985026` | 2024-03-08 |
| [#919](https://github.com/CorentinTh/it-tools/pull/919) | feat(new tool): OCR Image | `sharevb` | 2024-03-03 |
| [#918](https://github.com/CorentinTh/it-tools/pull/918) | feat(new tool): URL Text Fragment Generator | `sharevb` | 2024-03-03 |
| [#917](https://github.com/CorentinTh/it-tools/pull/917) | feat(new tool): Certificate/Key Parser, infos and converter | `sharevb` | 2024-03-03 |
| [#915](https://github.com/CorentinTh/it-tools/pull/915) | feat(new tool): x509 Certificate Generator | `sharevb` | 2024-03-03 |
| [#914](https://github.com/CorentinTh/it-tools/pull/914) | feat(new tool): QRCode decoder | `sharevb` | 2024-03-03 |
| [#913](https://github.com/CorentinTh/it-tools/pull/913) | fix(Token Generator): multi token, last settings, length input, denied chars | `sharevb` | 2024-03-03 |
| [#912](https://github.com/CorentinTh/it-tools/pull/912) | feat(new tool): Ansible Vault Encrypt/Decrypt | `sharevb` | 2024-03-03 |
| [#910](https://github.com/CorentinTh/it-tools/pull/910) | feat(new tool): CSR Generator | `sharevb` | 2024-03-03 |
| [#904](https://github.com/CorentinTh/it-tools/pull/904) | feat(new tool): Html to Markdown converter | `sharevb` | 2024-02-25 |
| [#903](https://github.com/CorentinTh/it-tools/pull/903) | fix(date-time-converter): handle timestamp in microseconds, UTC and more | `sharevb` | 2024-02-25 |
| [#902](https://github.com/CorentinTh/it-tools/pull/902) | feat(new tool): htpasswd generator | `sharevb` | 2024-02-25 |
| [#901](https://github.com/CorentinTh/it-tools/pull/901) | fix(integer-base-converter): handle prefix/suffix and case in sensitive | `sharevb` | 2024-02-25 |
| [#900](https://github.com/CorentinTh/it-tools/pull/900) | chore(deps): update dependency crypto-js to v4.2.0 [security] | `renovate` | 2024-02-25 |
| [#898](https://github.com/CorentinTh/it-tools/pull/898) | chore(deps): update dependency yaml to v2.8.3 [security] | `renovate` | 2024-02-25 |
| [#890](https://github.com/CorentinTh/it-tools/pull/890) | feat(new-tool): Docker Compose to Kubernetes manifests | `sharevb` | 2024-02-18 |
| [#889](https://github.com/CorentinTh/it-tools/pull/889) | feat(new-tool): Docker Run command(s) to Kubernetes manifests | `sharevb` | 2024-02-18 |
| [#888](https://github.com/CorentinTh/it-tools/pull/888) | feat(rsa-key-generator): passphrase and formats | `sharevb` | 2024-02-18 |
| [#887](https://github.com/CorentinTh/it-tools/pull/887) | feat(new tool): Ed25519 Key Pair Generator | `sharevb` | 2024-02-17 |
| [#885](https://github.com/CorentinTh/it-tools/pull/885) | Optimize Simplified Chinese translation | `pluwen` | 2024-02-16 |
| [#873](https://github.com/CorentinTh/it-tools/pull/873) | fix(url-parser): handle repeated params | `sharevb` | 2024-02-04 |
| [#871](https://github.com/CorentinTh/it-tools/pull/871) | feat(new tool): IPv4/6 CIDR to IP Range | `sharevb` | 2024-02-03 |
| [#870](https://github.com/CorentinTh/it-tools/pull/870) | feat(new tool): IPv6 Address Converter | `sharevb` | 2024-02-03 |
| [#869](https://github.com/CorentinTh/it-tools/pull/869) | feat(new tool): IPv4/6 Range To CIDR | `sharevb` | 2024-02-03 |
| [#868](https://github.com/CorentinTh/it-tools/pull/868) | feat(new tool): ISBN Parser and Formatter | `sharevb` | 2024-02-03 |
| [#867](https://github.com/CorentinTh/it-tools/pull/867) | feat(new tool): MAC Address Converter | `sharevb` | 2024-02-03 |
| [#866](https://github.com/CorentinTh/it-tools/pull/866) | feat(new tool): IP Geolocation | `sharevb` | 2024-02-03 |
| [#865](https://github.com/CorentinTh/it-tools/pull/865) | feat(new tool): Image EXIF Reader | `sharevb` | 2024-02-02 |
| [#864](https://github.com/CorentinTh/it-tools/pull/864) | feat(new tool): Docker Compose Format Converter | `sharevb` | 2024-02-02 |
| [#847](https://github.com/CorentinTh/it-tools/pull/847) | feat(new tool): Docker compose to docker run | `sharevb` | 2024-01-21 |
| [#846](https://github.com/CorentinTh/it-tools/pull/846) | fix(ui): TextArea-Copyable, copy icon placement | `sharevb` | 2024-01-21 |
| [#845](https://github.com/CorentinTh/it-tools/pull/845) | feat(tool enhancement): Docker run to docker compose Enhancements and fixes | `sharevb` | 2024-01-21 |
| [#820](https://github.com/CorentinTh/it-tools/pull/820) | feat(new-tool): Spring Boot properties to YAML converter | `marcelocg` | 2023-12-28 |
| [#763](https://github.com/CorentinTh/it-tools/pull/763) | Add additional git commands to git-memo.content | `mecharmor` | 2023-11-22 |
| [#742](https://github.com/CorentinTh/it-tools/pull/742) | New tool: UUID converter | `HMS-Seyfarth` | 2023-11-09 |
| [#692](https://github.com/CorentinTh/it-tools/pull/692) | feat(i18n): encrypt / decrypt text | `motui` | 2023-10-22 |
| [#691](https://github.com/CorentinTh/it-tools/pull/691) | feat(i18n): uuid and ulid generator | `motui` | 2023-10-22 |
| [#690](https://github.com/CorentinTh/it-tools/pull/690) | feat(i18n): bcrypt | `motui` | 2023-10-22 |
| [#689](https://github.com/CorentinTh/it-tools/pull/689) | feat(i18n): hash text | `motui` | 2023-10-22 |
| [#648](https://github.com/CorentinTh/it-tools/pull/648) | chore(deps): update actions/checkout digest to 11d5960 | `renovate` | 2023-10-04 |
| [#645](https://github.com/CorentinTh/it-tools/pull/645) | Tools/chmod calculator | `Art051` | 2023-09-28 |
| [#632](https://github.com/CorentinTh/it-tools/pull/632) | html-md-converter | `leonletto` | 2023-09-15 |
| [#614](https://github.com/CorentinTh/it-tools/pull/614) | refactor(home): prettier tool card list | `CorentinTh` | 2023-09-05 |
| [#595](https://github.com/CorentinTh/it-tools/pull/595) | feat(tool improve): added image preview to Base64 | `SAF2k` | 2023-08-28 |
| [#535](https://github.com/CorentinTh/it-tools/pull/535) | File hash tool | `marvin-j97` | 2023-07-13 |
| [#427](https://github.com/CorentinTh/it-tools/pull/427) | cd: parametrize listen port | `FerranAD` | 2023-06-01 |
| [#373](https://github.com/CorentinTh/it-tools/pull/373) | feat(aes): specify the initialization vector in AES encryption | `LinkinStars` | 2023-04-20 |
| [#363](https://github.com/CorentinTh/it-tools/pull/363) | feat(new tool): argon2 password hashing and verification | `CorentinTh` | 2023-04-16 |

---

_Generated 2026-08-15 from the public GitHub PR listing. Numbers are a point-in-time snapshot._
