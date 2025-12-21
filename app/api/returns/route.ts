import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Return from '@/models/Return';

export async function POST() {
    try {
        await dbConnect();
        const newReturn = await Return.create({});
        return NextResponse.json({ success: true, data: newReturn }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to create return' }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const returns = await Return.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: returns }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch returns' }, { status: 500 });
    }
}
