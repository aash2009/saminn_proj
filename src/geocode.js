// Turns free text -- an address, or a place someone often spends time -- into
// map coordinates. Calls OUR backend, never LocationIQ directly, since an API
// key shipped in browser JS is readable by anyone. Never throws; a failed or
// empty lookup returns null and must be treated exactly like "didn't answer."
