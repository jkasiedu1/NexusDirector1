import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { EbookManifestSchema } from "@/lib/schemas/ebook";

export const runtime = "nodejs";
export const maxDuration = 30;

function makeS3Client(accountId: string, accessKeyId: string, secretAccessKey: string) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
  } = env;

  // Try public URL first if available
  if (R2_PUBLIC_URL) {
    try {
      const manifestUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/published/${slug}/manifest.json`;
      const res = await fetch(manifestUrl, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        const parsed = EbookManifestSchema.safeParse(data);
        if (parsed.success) {
          return NextResponse.json(parsed.data, { status: 200 });
        }
      }
    } catch {
      // Fall through to S3 method
    }
  }

  // Fall back to S3 client
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return NextResponse.json(
      { error: "R2 storage not configured" },
      { status: 500 }
    );
  }

  try {
    const s3 = makeS3Client(R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY);
    const res = await s3.send(
      new GetObjectCommand({ 
        Bucket: R2_BUCKET_NAME, 
        Key: `published/${slug}/manifest.json` 
      })
    );
    const raw = await res.Body?.transformToString();
    if (!raw) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }
    const parsed = EbookManifestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid manifest format" }, { status: 500 });
    }
    return NextResponse.json(parsed.data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch manifest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
