import { NextResponse } from "next/server";
import { getVisaCountries } from "@/lib/visa-dataset";

export async function GET() {
  const countries = await getVisaCountries();
  return NextResponse.json({ countries });
}
