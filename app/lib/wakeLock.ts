let wakeLock: any = null;

export async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock.request) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible' && wakeLock?.released) {
                    try { wakeLock = await (navigator as any).wakeLock.request('screen'); } catch { }
                }
            });
        }
    } catch { }
}

export function releaseWakeLock() {
    try { wakeLock?.release?.(); } catch { }
    wakeLock = null;
}
