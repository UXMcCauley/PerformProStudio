import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getArtifactTemplates,
  createArtifactTemplate,
  updateArtifactTemplate,
  deleteArtifactTemplate,
} from '@/lib/mongodb';

// GET /api/artifact-templates?bandId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');

    if (!bandId) {
      return NextResponse.json({ error: 'bandId is required' }, { status: 400 });
    }

    const templates = await getArtifactTemplates(bandId);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error in GET /api/artifact-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/artifact-templates
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { band_id, name, default_text, color } = body;

    if (!band_id || !name) {
      return NextResponse.json(
        { error: 'band_id and name are required' },
        { status: 400 }
      );
    }

    const template = await createArtifactTemplate({
      band_id,
      name,
      default_text: default_text || '',
      color: color || null,
    });

    if (!template) {
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/artifact-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/artifact-templates
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, default_text, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (default_text !== undefined) updates.default_text = default_text;
    if (color !== undefined) updates.color = color;

    const template = await updateArtifactTemplate(id, updates);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error in PUT /api/artifact-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/artifact-templates?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const success = await deleteArtifactTemplate(id);
    if (!success) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/artifact-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
