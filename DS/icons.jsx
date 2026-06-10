// icons.jsx — DeliverIT iconography. Stroke-based, 16/20px, follows currentColor.
// Tight monoline grid; all icons are visually balanced for sidebar + table-cell use.
// Integration brand marks (Jira/Confluence/Teams/M365/LDAP) drawn as neutral
// "kind" glyphs — DeliverIT is single-tenant per-bank, not a Confluence clone.

const Icon = ({ name, size = 16, ...rest }) => {
  const stroke = 1.5;
  const common = {
    width: size, height: size, viewBox: '0 0 16 16',
    fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true', ...rest,
  };
  const P = ({ d }) => <path d={d} />;
  switch (name) {
    // ── Navigation ──
    case 'home':      return <svg {...common}><P d="M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 0 1-.5.5h-3v-4h-4v4H3a.5.5 0 0 1-.5-.5V7.5z"/></svg>;
    case 'projects':  return <svg {...common}><P d="M2 5h5l1.5 1.5H14V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/></svg>;
    case 'people':    return <svg {...common}><circle cx="6" cy="6" r="2.2"/><P d="M2.5 13c.4-1.8 1.8-3 3.5-3s3.1 1.2 3.5 3"/><circle cx="11" cy="6.5" r="1.7"/><P d="M10 9.5c1.3 0 2.7.8 3 3"/></svg>;
    case 'bench':     return <svg {...common}><P d="M2 6.5h12M3.5 10l-1 3M12.5 10l1 3M3 6.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1.5M3 8.5v1.5M13 8.5v1.5"/></svg>;
    case 'approvals': return <svg {...common}><P d="M3 3h7l3 3v7a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3.5A.5.5 0 0 1 3 3z"/><P d="M9 3v3h3M5.5 9.5l1.5 1.5L11 7.5"/></svg>;
    case 'reports':   return <svg {...common}><P d="M2.5 13V8M6 13V5M9.5 13V9M13 13V3"/></svg>;
    case 'admin':     return <svg {...common}><circle cx="8" cy="8" r="2"/><P d="M8 2v1.5M8 12.5V14M13.5 8H12M4 8H2.5M11.5 4.5l-1 1M5.5 10.5l-1 1M11.5 11.5l-1-1M5.5 5.5l-1-1"/></svg>;
    case 'inbox':     return <svg {...common}><P d="M2 8.5l1.5-5h9l1.5 5V13a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 2 13V8.5z"/><P d="M2 8.5h3l1 1.5h4l1-1.5h3"/></svg>;
    case 'calendar':  return <svg {...common}><rect x="2.5" y="3.5" width="11" height="10" rx="1"/><P d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5"/></svg>;
    case 'docs':      return <svg {...common}><P d="M3.5 2.5h6L12.5 5.5V13a.5.5 0 0 1-.5.5H3.5A.5.5 0 0 1 3 13V3a.5.5 0 0 1 .5-.5z"/><P d="M9 2.5V6h3.5M5 8h6M5 10h6M5 12h4"/></svg>;
    case 'settings':  return <svg {...common}><circle cx="8" cy="8" r="1.6"/><P d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/></svg>;
    case 'team':      return <svg {...common}><circle cx="5" cy="6" r="1.8"/><circle cx="11" cy="6" r="1.8"/><P d="M2 13c.3-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7M8 13c.3-1.6 1.5-2.7 3-2.7s2.7 1.1 3 2.7"/></svg>;

    // ── Actions ──
    case 'plus':      return <svg {...common}><P d="M8 3v10M3 8h10"/></svg>;
    case 'minus':     return <svg {...common}><P d="M3 8h10"/></svg>;
    case 'check':     return <svg {...common}><P d="M3 8.5l3 3 7-7"/></svg>;
    case 'x':         return <svg {...common}><P d="M4 4l8 8M12 4l-8 8"/></svg>;
    case 'edit':      return <svg {...common}><P d="M11 2.5L13.5 5 6 12.5l-3 .5.5-3L11 2.5z"/></svg>;
    case 'trash':     return <svg {...common}><P d="M2.5 4.5h11M5.5 4.5V3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1.5M4 4.5V13a.5.5 0 0 0 .5.5h7A.5.5 0 0 0 12 13V4.5M6.5 7v4M9.5 7v4"/></svg>;
    case 'search':    return <svg {...common}><circle cx="7" cy="7" r="4"/><P d="M10 10l3 3"/></svg>;
    case 'filter':    return <svg {...common}><P d="M2.5 3.5h11l-4 5V13l-3-1.5V8.5l-4-5z"/></svg>;
    case 'sort':      return <svg {...common}><P d="M5 3v10M3 5l2-2 2 2M11 13V3M9 11l2 2 2-2"/></svg>;
    case 'download':  return <svg {...common}><P d="M8 2.5v8M5 7.5l3 3 3-3M3 13h10"/></svg>;
    case 'upload':    return <svg {...common}><P d="M8 13V5M5 8l3-3 3 3M3 13h10"/></svg>;
    case 'refresh':   return <svg {...common}><P d="M13.5 8a5.5 5.5 0 0 1-9.5 3.8M2.5 8a5.5 5.5 0 0 1 9.5-3.8M12 2v2.5h-2.5M4 14v-2.5h2.5"/></svg>;
    case 'more':      return <svg {...common}><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></svg>;
    case 'more-v':    return <svg {...common}><circle cx="8" cy="3.5" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="8" cy="12.5" r="1"/></svg>;
    case 'external':  return <svg {...common}><P d="M6 3.5H3.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 .5.5H12a.5.5 0 0 0 .5-.5V10M9 3h3.5V6.5M12.5 3L7 8.5"/></svg>;
    case 'link':      return <svg {...common}><P d="M7 4.5L9 2.5a2.5 2.5 0 0 1 3.5 3.5l-2 2M9 11.5L7 13.5a2.5 2.5 0 0 1-3.5-3.5l2-2M6 10l4-4"/></svg>;
    case 'copy':      return <svg {...common}><rect x="5" y="5" width="8" height="8" rx="1"/><P d="M3 11V3.5A.5.5 0 0 1 3.5 3H11"/></svg>;
    case 'eye':       return <svg {...common}><P d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/></svg>;
    case 'flag':      return <svg {...common}><P d="M3.5 13.5V2.5h7L9 5l1.5 2.5h-7"/></svg>;
    case 'bell':      return <svg {...common}><P d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3L4 11z"/><P d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></svg>;
    case 'comment':   return <svg {...common}><P d="M2.5 3.5h11a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H6L3 13.5V11h-.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/></svg>;

    // ── Status ──
    case 'alert':     return <svg {...common}><circle cx="8" cy="8" r="6.5"/><P d="M8 4.5v4M8 11h.01"/></svg>;
    case 'info':      return <svg {...common}><circle cx="8" cy="8" r="6.5"/><P d="M8 7v4M8 4.6h.01"/></svg>;
    case 'check-circle': return <svg {...common}><circle cx="8" cy="8" r="6.5"/><P d="M5 8l2 2 4-4"/></svg>;
    case 'x-circle':  return <svg {...common}><circle cx="8" cy="8" r="6.5"/><P d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
    case 'lock':      return <svg {...common}><rect x="3" y="7" width="10" height="6.5" rx="1"/><P d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>;

    // ── Directional ──
    case 'chevron-down':  return <svg {...common}><P d="M4 6l4 4 4-4"/></svg>;
    case 'chevron-up':    return <svg {...common}><P d="M4 10l4-4 4 4"/></svg>;
    case 'chevron-right': return <svg {...common}><P d="M6 4l4 4-4 4"/></svg>;
    case 'chevron-left':  return <svg {...common}><P d="M10 4l-4 4 4 4"/></svg>;
    case 'arrow-up':      return <svg {...common}><P d="M8 13V3M4 7l4-4 4 4"/></svg>;
    case 'arrow-down':    return <svg {...common}><P d="M8 3v10M4 9l4 4 4-4"/></svg>;
    case 'arrow-right':   return <svg {...common}><P d="M3 8h10M9 4l4 4-4 4"/></svg>;
    case 'arrow-up-right':return <svg {...common}><P d="M5 11L11 5M6 5h5v5"/></svg>;
    case 'trending-up':   return <svg {...common}><P d="M2 12l4-4 3 3 5-6M9 5h4v4"/></svg>;
    case 'trending-down': return <svg {...common}><P d="M2 4l4 4 3-3 5 6M9 11h4V7"/></svg>;

    // ── Domain ──
    case 'budget':    return <svg {...common}><circle cx="8" cy="8" r="6.5"/><P d="M8 4.5v7M10 6.5c0-1-.9-1.5-2-1.5s-2 .5-2 1.5.9 1.5 2 1.5 2 .5 2 1.5-.9 1.5-2 1.5-2-.5-2-1.5"/></svg>;
    case 'gantt':     return <svg {...common}><P d="M2 4h6M4 7h7M3 10h5M5 13h6"/></svg>;
    case 'sparkline': return <svg {...common}><P d="M2 11l3-4 3 2 5-6"/></svg>;
    case 'position':  return <svg {...common}><circle cx="8" cy="6" r="2.5"/><P d="M8 9v4.5M5.5 13.5h5"/></svg>;
    case 'milestone': return <svg {...common}><P d="M8 2v12M3 4h8l1.5 2L11 8H3z"/></svg>;
    case 'risk':      return <svg {...common}><P d="M8 2.5l6.5 11h-13L8 2.5z"/><P d="M8 6.5v3M8 11.5h.01"/></svg>;
    case 'hours':     return <svg {...common}><circle cx="8" cy="8" r="6"/><P d="M8 5v3l2 1.5"/></svg>;
    case 'skill':     return <svg {...common}><P d="M8 2L9.5 6l4.5.4-3.5 3 1.1 4.4L8 11.5 4.4 13.8 5.5 9.4 2 6.4 6.5 6 8 2z"/></svg>;
    case 'org':       return <svg {...common}><P d="M8 2.5v3M3 9.5v-1A.5.5 0 0 1 3.5 8h9a.5.5 0 0 1 .5.5v1M5.5 12.5h-2v-3h2v3zM9 12.5H7v-3h2v3zM12.5 12.5h-2v-3h2v3zM7 5.5h2"/></svg>;
    case 'history':   return <svg {...common}><P d="M2.5 8a5.5 5.5 0 1 0 1.5-3.8M2 2.5v3h3M8 5v3.5l2 1.5"/></svg>;

    // ── Integration brand marks (neutral "kind" glyphs) ──
    case 'jira':      return <svg {...common} viewBox="0 0 16 16"><P d="M8 1L1 8l3 3L8 7l4 4 3-3L8 1z"/></svg>;
    case 'confluence':return <svg {...common}><P d="M2 11.5c1.5-3 4-3 6-1.5s4.5 1.5 6-1.5M2 4.5c1.5 3 4 3 6 1.5s4.5-1.5 6 1.5"/></svg>;
    case 'teams':     return <svg {...common}><rect x="2" y="4" width="6" height="8" rx="1"/><P d="M3.5 6h3M5 6v4M9 6.5h4.5v4a1 1 0 0 1-1 1H10"/></svg>;
    case 'm365':      return <svg {...common}><P d="M2.5 4.5l5-2v11l-5-1.5v-7.5zM8 3l5.5-1V14L8 13"/></svg>;
    case 'ldap':      return <svg {...common}><circle cx="8" cy="4.5" r="2"/><P d="M5.5 8.5l-2 4.5h9l-2-4.5M4 11l4 1 4-1"/></svg>;
    default:          return <svg {...common}><rect x="2" y="2" width="12" height="12" rx="2"/></svg>;
  }
};

Object.assign(window, { Icon });
