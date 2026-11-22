const shapes:Record<string,string>={
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 7-2.6 6.5L7 17l3.5-7z"/>',
 build:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 book:'<path d="M12 6Q8 3 3 5v14q5-2 9 1 5-3 9-1V5q-5-2-9 1zm0 0v14"/>',
 next:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 play:'<path d="m8 5 11 7-11 7z"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18q3 0 2-3t3-3a4 4 0 0 0 4-4c0-5-4-8-9-8z"/><circle cx="7.5" cy="11" r=".8"/><circle cx="11" cy="7.5" r=".8"/><circle cx="16" cy="8.5" r=".8"/>',
 settings:'<path d="M3 6h7m4 0h7M3 12h12m4 0h2M3 18h3m4 0h11"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 map:'<path d="m2 6 7-3 6 3 7-3v15l-7 3-6-3-7 3zM9 3v15m6-12v15"/>',
 x:'<path d="m6 6 12 12M6 18 18 6"/>', star:'<path d="m12 2 2.6 6.6 7 .5-5.5 4.8 1.8 7.1-5.9-4-5.9 4 1.8-7.1L2.4 9.1l7-.5z"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3v.2"/>',
 back:'<path d="M20 12H4m6-6-6 6 6 6"/>', check:'<path d="m4 12 5 5L20 6"/>', expand:'<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>'
}
export const icon=(name:string)=>`<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${shapes[name]||''}</svg>`
export const emblem=`<svg class="emblem" viewBox="0 0 50 50" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m25 2 20 11v24L25 48 5 37V13z"/><path d="M10 36h30M14 35V22l9-6 8 6v13m-19-12 11-10 10 10m-13 12V25h6v10m5-17v-4l4-6 4 6v20m-9-20h10M16 19v-5h4"/><circle cx="35" cy="19" r="1.3"/></svg>`
