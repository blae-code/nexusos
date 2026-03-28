# NexusOS Design System
## "CCP meets CIG meets Redscar Nomads"

COLOUR TOKENS (only these colours are permitted):
- --rs-void:     #08080A   (page backgrounds)
- --rs-panel:    #0F0F0D   (cards, panels, sidebar)
- --rs-surface:  #141410   (topbar, inputs)
- --rs-red:      #C0392B   (Redscar Red — CTAs, active, live, left borders)
- --rs-red-dark: #9B2D20   (red hover)
- --rs-red-dim:  rgba(192,57,43,0.12)  (red tint backgrounds)
- --rs-gold:     #C8A84B   (Redscar Gold — labels, dividers, warnings)
- --rs-gold-dim: rgba(200,168,75,0.10) (gold borders)
- --rs-text:     #E8E4DC   (primary text)
- --rs-muted:    #9A9488   (secondary text)
- --rs-ghost:    #5A5850   (disabled, placeholder)
- --rs-border:   rgba(200,170,100,0.10)
- --rs-border-hi:#C0392B

TYPOGRAPHY:
- Beyond Mars (cdnfonts) — hero/display (NEXUSOS wordmark, large stats)
- EarthOrbiter (cdnfonts) — labels, nav group dividers, ACCESS GATE
- Barlow Condensed (Google Fonts) — all UI: buttons, breadcrumbs, nav, table headers
- Barlow (Google Fonts) — body copy, descriptions

PANEL RULES (every card/panel must follow):
- border-left: 2px solid #C0392B
- border-top/right/bottom: 0.5px solid rgba(200,170,100,0.10)
- border-radius: 2px MAX (never rounded)
- background: #0F0F0D
- No box-shadows, no blur, no gradients

COMPONENT RULES:
- Primary buttons: background #C0392B, Barlow Condensed 600 uppercase, border-radius 2px
- Active nav item: background rgba(192,57,43,0.12), border-left 2px solid #C0392B
- Nav group labels: EarthOrbiter/Barlow Condensed 400 10px uppercase letter-spacing 0.25em color #C8A84B
- Error states: use gold #C8A84B (amber), NOT red — red is brand
- Op status: LIVE=red, STAGING=gold, COMPLETE=ghost
- Never use blue, purple, white, or light backgrounds anywhere

ACCESS GATE SPECIFIC:
- Full-screen void bg + 120 star particles + amber bloom at bottom + faint red bloom upper-right
- Background video: /video/nexus-boot-loop02.mp4 at opacity 0.18
- Panel: left: 10vw, width: 400px, NOT centred
- NEXUSOS title: Beyond Mars 62px
- Footer fixed bottom: "● VERSE 4.7.0" gold left / "REDSCAR · NOMADS · ETERNAL VOYAGE" muted right

DESIGN REFERENCES:
- EVE Online login screen (scale, void, left-panel layout)
- Star Citizen MFD displays (amber operational, machined surfaces)
- redscar.org/branding.html (official colours, fonts, logos)

KEY IDENTIFIERS:
- App ID: 69b6f06f69fe996fbf86fea4
- Live URL: nomadnexus.space
- Discord Guild: 1029380236367896616
- RSI Org: RSNM
- Boot video: public/video/nexus-boot-loop02.mp4
