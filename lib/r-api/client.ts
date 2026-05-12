// lib/r-api/client.ts
// Client for communicating with the Real R Backend (via Next.js API Proxy or direct)

export async function callRApi(endpoint: string, payload: any) {
    // For local development with Docker, we might call the proxy or the direct URL
    // Here we use a generic fetch to our local Next.js API which acts as a proxy
    const response = await fetch(`/api/stats/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'R API Error');
    }

    return response.json();
}

export const rApi = {
    descriptive: (data: any[]) => callRApi('descriptive', { data }),
    reliability: (data: any[]) => callRApi('reliability', { data }),
    efa: (data: any[], nfactors = 0) => callRApi('efa', { data, nfactors }),
    plsSem: (data: any[], mm: any[], sm: any[]) => callRApi('pls-sem', { data, mm, sm })
};
