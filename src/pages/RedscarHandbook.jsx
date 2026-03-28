import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const RANK_COLORS = {
  PIONEER: { color: 'var(--warn)', label: 'The Pioneer' },
  FOUNDER: { color: 'var(--acc2)', label: 'Founder' },
  VOYAGER: { color: 'var(--info)', label: 'Voyager' },
  SCOUT: { color: 'var(--live)', label: 'Scout' },
  VAGRANT: { color: 'var(--t1)', label: 'Vagrant' },
  AFFILIATE: { color: 'var(--t2)', label: 'Affiliate' },
};

function Section({ title, children, defaultOpen = false, forceOpen = false, sectionId = undefined, sectionRef = undefined }) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  return (
    <div id={sectionId} ref={sectionRef} style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--bg2)',
          border: '0.5px solid var(--b2)',
          borderRadius: 3,
          color: 'var(--t0)',
          fontSize: 13,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg3)';
          e.currentTarget.style.borderColor = 'var(--b3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg2)';
          e.currentTarget.style.borderColor = 'var(--b2)';
        }}
      >
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div style={{ padding: '16px 16px 0', color: 'var(--t1)', fontSize: 11, lineHeight: 1.6 }}>{children}</div>}
    </div>
  );
}

export default function RedscarHandbook() {
  const [searchParams] = useSearchParams();
  const tacticalRef = useRef(null);
  const highlightedSection = searchParams.get('section');

  useEffect(() => {
    if (highlightedSection === 'tactical-comms' && tacticalRef.current) {
      tacticalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightedSection]);

  return (
    <div style={{ padding: '24px', maxWidth: 760, margin: '0 auto', color: '#E8E4DC', animation: 'pageEntrance 200ms ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8E4DC', borderBottom: '0.5px solid rgba(200,170,100,0.10)', paddingBottom: 8, marginBottom: 16 }}>REDSCAR NOMADS</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: '#C8A84B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Organization Reference & Handbook</div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 400, fontSize: 14, color: '#9A9488', lineHeight: 1.7, marginTop: 8 }}>The official handbook for all Redscar Nomads members. Contains rank structure, codes of conduct, operational procedures, and organizational policy.</div>
      </div>

      {/* Rank Hierarchy */}
      <Section title="Rank Hierarchy" defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              rank: 'PIONEER',
              name: 'The Pioneer (MurphyJack)',
              desc: 'Responsible for keeping the group together, safe and overseeing the entire organization. All questions and concerns directed to The Pioneer.',
            },
            {
              rank: 'FOUNDER',
              name: 'Founder',
              desc: 'Weenerdawg, SapphireFire, Mia — honorary title for their work forming Redscar with The Pioneer.',
            },
            {
              rank: 'VOYAGER',
              name: 'Voyager',
              desc: 'Veteran members demonstrating unwavering support. Nominated by 2+ members, approved by Pioneer. Awarded physical Voyager Tribute (serialized, mailed).',
            },
            {
              rank: 'SCOUT',
              name: 'Scout',
              desc: 'Full member of Redscar. Promoted after time spent wandering with us. Can nominate for Voyager, eligible for giveaways.',
            },
            {
              rank: 'VAGRANT',
              name: 'Vagrant',
              desc: 'Trial role with no time limit. Has applied on RSI and expressed intent to become full member.',
            },
            {
              rank: 'AFFILIATE',
              name: 'Affiliate',
              desc: 'Acquaintances, friendly org reps, friends not officially joining but wandering with us. Interviewed/vetted.',
            },
          ].map(({ rank, name, desc }) => (
            <div key={rank} style={{ padding: '10px 12px', background: 'var(--bg3)', borderRadius: 3, borderLeft: `3px solid ${RANK_COLORS[rank].color}` }}>
              <div style={{ color: RANK_COLORS[rank].color, fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Professions */}
      <Section title="Professions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { name: 'Industry', desc: 'AUEC earning via mining, salvage, trading, exploration. Members prioritized for limited rosters.' },
            { name: 'Rangers', desc: 'Combat profession. Must master Navigation, FPS Equipment, Medical, crime stat hacking, comm arrays. Must join Rescue.' },
            { name: 'Squad 17', desc: 'Elite objective-based combat. High discipline, tight gameplay, defined start/objectives/win conditions. Operator expectations enforced.' },
            { name: 'Racing', desc: 'Daymar Rally team. Attend practices, support role flexibility, tight comms.' },
            { name: 'Rescue', desc: 'First responders (medical & defense). No cost, open to all membership statuses. Request help in !-request-response.' },
            { name: 'Media', desc: 'YouTube, RSI Community Hub. Outward-facing creative works. Closed, invite-only PR team.' },
          ].map(({ name, desc }) => (
            <div key={name} style={{ padding: '10px 12px', background: 'var(--bg3)', borderRadius: 3 }}>
              <div style={{ color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Code of Conduct */}
      <Section title="Redscar Code">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Help First. Combat Second. Always try to help wanderers.',
            'Bigotry, racism, homophobia, transphobia, discrimination — no place here.',
            'Extreme or excessive profanity not allowed, including usernames.',
            'Have respect for one another. We are all Wanderers in the end.',
            'Unresolved disagreements brought to The Pioneer.',
            'Full membership requires voice participation so all know you and fit with us.',
            'Respect Voice comms. Focused channels require courtesy. Discord is 18+ only.',
          ].map((rule, i) => (
            <div key={i} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, borderLeft: '2px solid var(--info)' }}>
              <div style={{ fontSize: 10, color: 'var(--t1)' }}>{i + 1}. {rule}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Piracy Policy */}
      <Section title="Redscar & Piracy">
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.8, marginBottom: 12 }}>
          <strong style={{ color: 'var(--warn)' }}>Definition:</strong> Extorting another PLAYER while NOT in PvP-centered CIG events or areas.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, borderLeft: '2px solid var(--danger)' }}>
            <div style={{ fontSize: 10, color: 'var(--t1)', marginBottom: 4 }}>1. Redact Redscar from RSI profile before piracy.</div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>Do not reference Redscar during questionable acts.</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, borderLeft: '2px solid var(--danger)' }}>
            <div style={{ fontSize: 10, color: 'var(--t1)', marginBottom: 4 }}>2. No rescue requests from Redscar if pirating.</div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>Bad situations are on you.</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, borderLeft: '2px solid var(--danger)' }}>
            <div style={{ fontSize: 10, color: 'var(--t1)', marginBottom: 4 }}>3. No pro-piracy gameplay in Discord.</div>
            <div style={{ fontSize: 9, color: 'var(--t3)' }}>Anti-piracy ops are welcome.</div>
          </div>
        </div>
      </Section>

      {/* Event Rules */}
      <Section title="Event Types & AUEC Rules">
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>CASUAL EVENT</div>
          <div style={{ fontSize: 10, color: 'var(--t2)' }}>Casual chat, no focused gameplay. Open to all.</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>FOCUSED EVENT</div>
          <div style={{ fontSize: 10, color: 'var(--t2)' }}>Highly efficient gameplay. ON TIME, PREPARED, disciplined comms, defined roles.</div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 3, borderLeft: '2px solid var(--live)' }}>
          <div style={{ fontSize: 10, color: 'var(--t1)', marginBottom: 8 }}>
            <strong>Pioneer Events:</strong> AUEC split evenly among all participants. Donations welcome but not required.
          </div>
          <div style={{ fontSize: 10, color: 'var(--t1)' }}>
            <strong>Member-Hosted:</strong> Host decides split (0% to 100%). Tracked by host.
          </div>
        </div>
      </Section>

      <Section title="Rockbreaker Operation Flow">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              title: '1. Preflight',
              detail: 'Check Industry readiness, current Scout deposit intel, and the admin setup dashboard before publishing a Rockbreaker op.',
            },
            {
              title: '2. Publish',
              detail: 'Create the op from Op Board with a clear location, access type, rank gate, and the core Rockbreaker role mix: mining, escort, fabricator, scout, and hauling support.',
            },
            {
              title: '3. Go Live',
              detail: 'Move the op live only when crew, route, and supply chain are actually ready. Treat the in-app live state and notifications as the operational source of truth.',
            },
            {
              title: '4. Run Phases',
              detail: 'Use the live op phase tracker deliberately. Threats, refinery flow, craft blockers, and material logging should stay current throughout the session.',
            },
            {
              title: '5. Wrap',
              detail: 'End the op from the live surface, generate the debrief, and confirm the archive and in-app summary reflect what actually happened.',
            },
          ].map(({ title, detail }) => (
            <div key={title} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 3, borderLeft: '2px solid var(--warn)' }}>
              <div style={{ color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>{detail}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Tactical Comms */}
      <Section
        title="Tactical Brevity Words"
        sectionId="tactical-comms"
        sectionRef={tacticalRef}
        forceOpen={highlightedSection === 'tactical-comms'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { word: 'KISS', meaning: 'Keep it Simple Stupid' },
            { word: 'ROGER', meaning: 'Understood' },
            { word: 'WILCO', meaning: 'Will comply' },
            { word: 'SAY AGAIN', meaning: 'Repeat last message' },
            { word: 'ON ME', meaning: 'Form up' },
            { word: 'MOVE OUT', meaning: 'Start moving' },
            { word: 'SET SECURITY', meaning: '360° protection self check' },
            { word: 'HOLD', meaning: 'Stop movement' },
            { word: 'SELF CHECK', meaning: 'Verify your status' },
            { word: 'WEAPON DRY', meaning: 'Out of ammo' },
            { word: 'SET', meaning: 'In position' },
            { word: 'GREEN', meaning: 'Good to go' },
            { word: 'RELOADING', meaning: 'Currently reloading' },
            { word: 'CROSSING', meaning: 'Moving across line of fire' },
            { word: 'CEASE FIRE', meaning: 'Stop firing' },
            { word: 'CHECK FIRE', meaning: 'Stop friendly fire' },
          ].map(({ word, meaning }) => (
            <div key={word} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 3 }}>
              <div style={{ color: 'var(--acc2)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 500 }}>{word}</div>
              <div style={{ fontSize: 9, color: 'var(--t2)' }}>{meaning}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Shamans */}
      <Section title="Redscar Shamans">
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.8, marginBottom: 12 }}>
          Scout or Voyager helping The Pioneer with admin duties. Voluntary role, Pioneer approval required.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'Attend meetings when requested by The Pioneer.',
            'Handle mundane tasks (event debriefs, running events, etc).',
            'Keep up to date with Shaman discord channel.',
            'Stay engaged with problem solving and idea sharing.',
          ].map((req, i) => (
            <div key={i} style={{ padding: '8px 10px', fontSize: 10, color: 'var(--t1)', background: 'var(--bg2)', borderRadius: 3 }}>
              {i + 1}. {req}
            </div>
          ))}
        </div>
      </Section>

      {/* Awards */}
      <Section title="Awards & Recognition">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 3, borderLeft: '3px solid var(--warn)' }}>
            <div style={{ color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>Voyager Tribute</div>
            <div style={{ fontSize: 10, color: 'var(--t2)' }}>Physical, personalized, serial numbered gift. Mailed to member. NO COST. Opened at Ritual Bonfire. Formal induction ceremony.</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 3, borderLeft: '3px solid var(--info)' }}>
            <div style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>Redscar Rally Medal</div>
            <div style={{ fontSize: 10, color: 'var(--t2)' }}>1.5" hard enamel pin. Token of thanks from The Pioneer. Mailed or given in person. NO COST.</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg3)', borderRadius: 3, borderLeft: '3px solid var(--live)' }}>
            <div style={{ color: 'var(--live)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 6 }}>Giveaways</div>
            <div style={{ fontSize: 10, color: 'var(--t2)' }}>Open to Scouts, Voyagers, Founders, The Pioneer. Subscriber flair to ships. Check #giveaways channel.</div>
          </div>
        </div>
      </Section>

      {/* Bonfire */}
      <Section title="Ritual Bonfire Meeting">
        <div style={{ color: 'var(--t2)', fontSize: 10, lineHeight: 1.8 }}>
          Monthly meeting where The Pioneer discusses changes, updates, and ideas. Vagrant → Scout promotions and Scout → Voyager inductions announced. Community input shapes org direction.
        </div>
      </Section>

      {/* Discord */}
      <Section title="Discord Structure">
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--warn)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Voice Channels</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 3 }}>
              <div style={{ color: 'var(--live)', fontSize: 9, fontWeight: 500 }}>CASUAL</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>General chat, no focused activity. Open to all.</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 3 }}>
              <div style={{ color: 'var(--warn)', fontSize: 9, fontWeight: 500 }}>FOCUSED</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>Focused gameplay. Locked — Redscar members, Partners, Affiliates only.</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--info)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Important Channels</div>
          <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.8 }}>Designated by red <span style={{ color: 'var(--danger)' }}>!</span> icon. Check announcements and pins regularly.</div>
        </div>
      </Section>

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '0.5px solid rgba(200,170,100,0.10)', textAlign: 'center', color: '#5A5850', fontSize: 9 }}>
        <div style={{ fontFamily: "'Earth Orbiter','EarthOrbiter','Barlow Condensed',sans-serif", letterSpacing: '0.22em', marginBottom: 6, textTransform: 'uppercase' }}>THE ETERNAL VOYAGE</div>
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 9, color: '#5A5850' }}>Always exploring the new and exotic. Never alone. Redscar awaits all who wander.</div>
      </div>
    </div>
  );
}
