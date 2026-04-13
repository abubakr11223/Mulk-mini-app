import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect("tel:+998909059990");
}
