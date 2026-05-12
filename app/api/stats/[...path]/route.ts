// app/api/stats/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
    const endpoint = params.path.join('/');
    const rApiUrl = process.env.R_API_URL || 'http://localhost:8000';
    const body = await req.json();

    try {
        console.log(`[R-Proxy] Calling ${rApiUrl}/${endpoint}`);
        const response = await fetch(`${rApiUrl}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`[R-Proxy] Error calling R API:`, error);
        return NextResponse.json({ message: 'Internal R-API Error', error: error.message }, { status: 500 });
    }
}

// Support OPTIONS for CORS if needed (though not strictly necessary for same-origin proxy)
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
